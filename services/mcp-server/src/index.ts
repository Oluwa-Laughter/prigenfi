import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  confidentialAssets,
  publicJson,
  transferSchema,
} from "@prigenfi/shared";
import { ProposalSession, type PrigenFiClient } from "@prigenfi/sdk";

export function createMcpServer(client?: PrigenFiClient) {
  const server = new McpServer(
    { name: "prigenfi", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  const session = client ? new ProposalSession(client) : undefined;
  const requireClient = () => {
    if (!client) throw new Error("NOT_CONFIGURED");
    return client;
  };
  const result = (data: unknown) => ({
    content: [{ type: "text" as const, text: publicJson(data) }],
  });
  const safe = async (fn: () => unknown | Promise<unknown>) => {
    try {
      return result(await fn());
    } catch (e) {
      const code =
        e instanceof Error &&
        [
          "NOT_CONFIGURED",
          "POLICY_DENIED",
          "IDEMPOTENCY_CONFLICT",
          "SESSION_CAPACITY",
        ].includes(e.message)
          ? e.message
          : "REQUEST_FAILED";
      return {
        ...result({
          error: {
            code,
            message:
              "Request could not be completed. No transaction was submitted.",
          },
        }),
        isError: true,
      };
    }
  };
  const read = (
    name: string,
    description: string,
    fn: () => unknown | Promise<unknown>,
  ) =>
    server.registerTool(
      name,
      {
        description,
        inputSchema: z.object({}).strict(),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      () => safe(fn),
    );
  read(
    "wallet_get_info",
    "Read the server-configured public vault identity. Local operator selects scope; tool inputs cannot change it.",
    () => ({
      ...requireClient().config,
      rpcUrl: undefined,
      accountType: "isolated-vault",
      execution: "simulation-only",
    }),
  );
  read(
    "confidential_assets_list",
    "List official Sepolia mock wrapper registry entries. Does not read or decrypt balances.",
    () => ({
      assets: confidentialAssets,
      confidentialExecution: "wallet-only; not delegated to agents",
      source:
        "https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md",
    }),
  );
  read(
    "agent_get_permissions",
    "Read on-chain transfer scope for the configured agent, token and vault.",
    async () => (await requireClient().policy()).permission,
  );
  read(
    "policy_get",
    "Read public policy at one block. Does not authorize execution.",
    () => requireClient().policy(),
  );
  read(
    "portfolio_get",
    "Read only public ERC-20 vault balance; confidential balances are never returned.",
    async () => {
      const s = await requireClient().policy();
      return {
        chainId: s.chainId,
        token: s.token,
        vault: s.vault,
        publicBalanceBaseUnits: s.balance,
        blockNumber: s.blockNumber,
        confidentialBalance: "withheld",
      };
    },
  );
  read(
    "agent_get_activity",
    "Read actual vault Executed events from last 1000 blocks; observed events are not finality guarantees.",
    () => requireClient().activity(),
  );
  server.registerTool(
    "trade_quote",
    {
      description:
        "Returns availability only. No swap venue is integrated; never fabricates a price.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      result({
        available: false,
        reason: "NO_VERIFIED_TRADING_VENUE",
        supportedProposal: "erc20-transfer",
        execution: "simulation-only",
      }),
  );
  server.registerTool(
    "trade_simulate",
    {
      description:
        "Evaluate a mock ERC-20 transfer proposal against on-chain policy and eth_call. Never sends a transaction.",
      inputSchema: transferSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (input) => safe(() => requireClient().simulate(input)),
  );
  server.registerTool(
    "trade_propose",
    {
      description:
        "Store an allowed, simulated mock transfer in this local session (max 100). Lost on restart; no signing or execution.",
      inputSchema: z
        .object({ intent: transferSchema, idempotencyKey: z.string().uuid() })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      safe(() => {
        requireClient();
        return session?.propose(input.intent, input.idempotencyKey);
      }),
  );
  server.registerTool(
    "trade_get_status",
    {
      description:
        "Read a proposal in this local session. Simulated never means submitted or confirmed.",
      inputSchema: z.object({ id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) =>
      safe(() => {
        requireClient();
        return session?.get(input.id) ?? { error: { code: "NOT_FOUND" } };
      }),
  );
  return server;
}
