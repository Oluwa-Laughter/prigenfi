import { it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { readFile } from "node:fs/promises";
const names = [
  "wallet_get_info",
  "agent_get_permissions",
  "portfolio_get",
  "confidential_assets_list",
  "trade_quote",
  "trade_simulate",
  "trade_propose",
  "trade_get_status",
  "policy_get",
  "agent_get_activity",
];
it("external stdio client discovers tools and reads permitted metadata", async () => {
  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["exec", "tsx", "services/mcp-server/src/stdio.ts"],
    stderr: "pipe",
    env: { PATH: process.env.PATH ?? "" },
  });
  const client = new Client({ name: "prigenfi-smoke", version: "0.1.0" });
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual(
      [...names].sort(),
    );
    const assets = await client.callTool({
      name: "confidential_assets_list",
      arguments: {},
    });
    expect(JSON.stringify(assets)).toContain("cUSDCMock");
    const denied = await client.callTool({ name: "policy_get", arguments: {} });
    expect(denied.isError).toBe(true);
    expect(JSON.stringify(denied)).toContain("NOT_CONFIGURED");
    const quote = await client.callTool({ name: "trade_quote", arguments: {} });
    expect(JSON.stringify(quote)).toContain("NO_VERIFIED_TRADING_VENUE");
  } finally {
    await client.close();
  }
});
it.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "MCP proposes and simulates against an actual local vault",
  async () => {
    const d = JSON.parse(await readFile(".local/deployment.json", "utf8"));
    const transport = new StdioClientTransport({
      command: "pnpm",
      args: ["exec", "tsx", "services/mcp-server/src/stdio.ts"],
      stderr: "pipe",
      env: {
        PATH: process.env.PATH ?? "",
        RPC_URL: d.rpcUrl,
        CHAIN_ID: "31337",
        VAULT_ADDRESS: d.vault,
        AGENT_ADDRESS: d.agent,
        TOKEN_ADDRESS: d.token,
      },
    });
    const client = new Client({
      name: "prigenfi-local-integration",
      version: "0.1.0",
    });
    const block = await fetch(d.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      }),
    }).then((r) => r.json());
    const intent = {
      kind: "erc20-transfer",
      chainId: 31337,
      vault: d.vault,
      agent: d.agent,
      token: d.token,
      recipient: d.recipient,
      amount: "1000000",
      nonce: "0",
      deadline: Number(BigInt(block.result.timestamp)) + 240,
    };
    try {
      await client.connect(transport);
      const simulation = await client.callTool({
        name: "trade_simulate",
        arguments: intent,
      });
      expect(
        JSON.parse((simulation.content as { text: string }[])[0].text)
          .simulated,
      ).toBe(true);
      const proposal = await client.callTool({
        name: "trade_propose",
        arguments: {
          intent,
          idempotencyKey: "00000000-0000-4000-8000-000000000001",
        },
      });
      expect(proposal.isError).not.toBe(true);
      expect(JSON.stringify(proposal)).toContain("simulated");
      const denied = await client.callTool({
        name: "trade_propose",
        arguments: {
          intent: { ...intent, amount: "100000000" },
          idempotencyKey: "00000000-0000-4000-8000-000000000002",
        },
      });
      expect(denied.isError).toBe(true);
      const status = await client.callTool({
        name: "trade_get_status",
        arguments: { id: "00000000-0000-4000-8000-000000000001" },
      });
      expect(JSON.stringify(status)).toContain("simulated");
    } finally {
      await client.close();
    }
  },
);
