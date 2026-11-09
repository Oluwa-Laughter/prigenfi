import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  confidentialAssets,
  publicJson,
  transferSchema,
} from "@prigenfi/shared";
import { ProposalSession, type PrigenFiClient } from "@prigenfi/sdk";
import {
  assessConfidentialTrade,
  confidentialCapabilities,
  confidentialMandateSchema,
} from "@prigenfi/shared/confidential-policy";
import {
  agentPlanSubmissionSchema,
  evaluateAgentResearchPlan,
} from "@prigenfi/shared/agent-planning";
import {
  agentPublicResearchSubmissionSchema,
  evaluateAgentPublicResearch,
} from "@prigenfi/shared/agent-research-scope";
import {
  marketSearchSchema,
  marketPairLookupSchema,
  marketNetworkSchema,
  searchPublicMarkets,
  inspectPublicMarketPair,
} from "@prigenfi/shared/market-research";

export function createMcpServer(client?: PrigenFiClient) {
  const server = new McpServer(
    { name: "prigenfi", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "PrigenFi MCP is research-only. Never infer wallet authorization, agent registration, confidential trade execution, portfolio returns or token safety from tools. User goals are voluntarily shared with the local AI host; token market searches are public. First validate agent research scope, then inspect real sourced public pools. Do not pass secrets, decrypted balances, private instructions or trading calldata to market providers. No public trade fallback is permitted. Agent execution is disabled; local Anvil developer simulations are never trades.",
    },
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
  if (client?.config.chainId === 31337) {
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
  }
  read(
    "confidential_assets_list",
    "List official Sepolia unbacked testnet confidential asset wrappers using user-facing symbols. Does not read or decrypt balances.",
    () => ({
      assets: confidentialAssets.map((asset) => ({
        symbol: asset.displaySymbol,
        address: asset.address,
        category: asset.category,
        chainId: asset.chainId,
        testOnly: true,
      })),
      confidentialExecution: "wallet-only; not delegated to agents",
      source:
        "https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md",
    }),
  );
  read(
    "confidential_capabilities_get",
    "Read supported Zama Sepolia wallet tokens and strict private-execution readiness. No balances or user mandates are read.",
    () => confidentialCapabilities,
  );
  server.registerTool(
    "confidential_route_check",
    {
      description:
        "Validate an owner-authored confidential-only research mandate without storing instructions, decrypting data, or suggesting a public swap. Private execution stays disabled until verified.",
      inputSchema: confidentialMandateSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (input) => safe(() => assessConfidentialTrade(input)),
  );
  server.registerTool(
    "agent_plan_evaluate",
    {
      description:
        "Validate a structured AI research proposal against an owner draft and a strict confidential-only, Sepolia-bound policy. No execution, signing, wallet access, amounts or calldata; results never echo private instructions.",
      inputSchema: agentPlanSubmissionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (input) => safe(() => evaluateAgentResearchPlan(input)),
  );
  // The AI reasoning happens in the user's MCP host, NOT through hardcoded
  // keyword matching or a model impersonated by the server. The host sees the
  // supplied goal, so users must opt into sharing it with their agent host.
  server.registerPrompt(
    "interpret_private_defi_goal",
    {
      title: "Interpret a PrigenFi trading research goal",
      description:
        "Ask the connected AI host to translate a user-provided goal into a risk-aware research proposal. The host sees the goal. Never grant permissions or claim private execution.",
      argsSchema: z
        .object({
          goal: z.string().trim().min(12).max(1200),
          researchNetwork: marketNetworkSchema,
        })
        .strict(),
    },
    ({ goal, researchNetwork }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "The owner voluntarily supplied the following financial research goal to their connected AI host:",
              goal,
              "Selected public research chain: " + researchNetwork + ".",
              "Interpret the goal using your own model capabilities. Do not pretend this server ran an LLM.",
              "Clarify ambiguity and risks. Never guarantee profit or claim a trade was executed.",
              "First use agent_market_research_check to validate your chosen network, market and token query within the user's stated research scope; this is not cryptographic proof of the user's authority.",
              "Then use market_search and market_pair_lookup only for PUBLIC, externally sourced market evidence; verify actual addresses and data timestamps.",
              "Do not send decrypted positions, private balances, secrets or signing keys to any tool or model.",
              "For potential confidential transactions produce a strictly typed research plan for agent_plan_evaluate; executionAllowed always remains false.",
              "Do NOT select a public DEX as a confidential execution fallback. The owner's text grants no capital permissions.",
              "Clearly report unsupported chains, tokens or confidential venues as research-only.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerTool(
    "agent_market_research_check",
    {
      description:
        "Check a model-selected public market research step against caller-provided EVM networks, market scope, limited token query and expiry. This is NOT authenticated owner consent or spending authority. It never reads balances or executes trades.",
      inputSchema: agentPublicResearchSubmissionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (input) => safe(() => evaluateAgentPublicResearch(input)),
  );
  // Public, live on-chain market discovery. No user instructions, balance
  // decryption, wallet identity, or private order details enter these calls.
  server.registerTool(
    "market_search",
    {
      description:
        "Search live PUBLIC DEX Screener markets on a selected EVM network. Research only: prices may be stale/manipulated, no private execution, no wallet or keys. Never put confidential instructions in query.",
      inputSchema: marketSearchSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    (input) => safe(() => searchPublicMarkets(input)),
  );
  server.registerTool(
    "market_pair_lookup",
    {
      description:
        "Inspect one real PUBLIC DEX pair by exact EVM chain and contract address. Source is third-party and not proof of liquidity, safety or private execution.",
      inputSchema: marketPairLookupSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    (input) => safe(() => inspectPublicMarketPair(input)),
  );
  // Local Anvil transfer debugging is explicitly separate from consumer
  // MCP research. Never expose public ERC-20 dev transfers as trade tools.
  if (client?.config.chainId === 31337) {
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
      "dev_erc20_transfer_simulate",
      {
        description:
          "Developer-only local public ERC-20 transfer simulation; no private trading or blockchain transaction submitted.",
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
      "dev_erc20_transfer_propose",
      {
        description:
          "Developer-only simulated local ERC-20 transfer; ephemeral in-process record, not a private swap or executed order.",
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
      "dev_erc20_transfer_status",
      {
        description:
          "Read an ephemeral developer-only transfer simulation record. It is never an executed trade.",
        inputSchema: z.object({ id: z.string().uuid() }).strict(),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      (input) =>
        safe(() => {
          requireClient();
          return session?.get(input.id) ?? { error: { code: "NOT_FOUND" } };
        }),
    );
  }
  server.registerTool(
    "agent_execution_status",
    {
      description:
        "Read actual confidential agent execution availability (currently disabled). No quotes, fake prices or trades.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      result({
        available: false,
        reason: "NO_VERIFIED_TRADING_VENUE",
        privateExecution: false,
        walletAuthorization: "not-connected",
        publicFallback: false,
      }),
  );
  return server;
}
