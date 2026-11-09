import { confidentialAssets } from "../packages/shared/src";
import { it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { readFile } from "node:fs/promises";
const names = [
  "confidential_assets_list",
  "confidential_capabilities_get",
  "confidential_route_check",
  "agent_plan_evaluate",
  "agent_execution_status",
  "agent_market_research_check",
  "market_search",
  "market_pair_lookup",
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
    const prompts = await client.listPrompts();
    expect(
      prompts.prompts.some((p) => p.name === "interpret_private_defi_goal"),
    ).toBe(true);
    const goal =
      "Research supported Base stablecoin markets with low slippage and owner-controlled limits.";
    const interpreted = await client.getPrompt({
      name: "interpret_private_defi_goal",
      arguments: { goal, researchNetwork: "base" },
    });
    expect(JSON.stringify(interpreted)).toContain(goal);
    expect(JSON.stringify(interpreted)).toContain(
      "Selected public research chain: base",
    );
    expect(JSON.stringify(interpreted)).toContain(
      "owner's text grants no capital permissions",
    );
    const assets = await client.callTool({
      name: "confidential_assets_list",
      arguments: {},
    });
    expect(JSON.stringify(assets)).toContain("cUSDCMock");
    expect(JSON.stringify(assets)).toContain("cZAMAMock");
    const caps = await client.callTool({
      name: "confidential_capabilities_get",
      arguments: {},
    });
    expect(
      JSON.parse((caps.content as { text: string }[])[0].text)
        .privateAgentExecution,
    ).toBe(false);
    const route = await client.callTool({
      name: "confidential_route_check",
      arguments: {
        market: "defi",
        instruction:
          "Analyze Ethereum lending markets with confidential execution only.",
        watchAssets: "cUSDC / cZAMA",
        suggestedCapitalLimit: "50",
        privacy: "confidential-only",
      },
    });
    expect(
      JSON.parse((route.content as { text: string }[])[0].text).reasons,
    ).toContain("PUBLIC_FALLBACK_FORBIDDEN");
    expect(
      JSON.parse((route.content as { text: string }[])[0].text)
        .executionAllowed,
    ).toBe(false);
    const validatedPlan = await client.callTool({
      name: "agent_plan_evaluate",
      arguments: {
        mandate: {
          market: "portfolio",
          instruction:
            "Research Ethereum trading opportunities without public execution.",
          watchAssets: "cUSDC / cUSDT",
          suggestedCapitalLimit: "50",
          privacy: "confidential-only",
        },
        plan: {
          planId: "00000000-0000-4000-8000-000000000010",
          privacy: "confidential-only",
          chainId: 11155111,
          expiresAt: Math.floor(Date.now() / 1000) + 300,
          steps: [
            {
              stepId: "spot-1",
              action: "swap",
              market: "spot",
              chainId: 11155111,
              tokenIn: confidentialAssets[0].address,
              tokenOut: confidentialAssets[1].address,
              allocationBps: 1000,
              maxSlippageBps: 100,
            },
          ],
        },
      },
    });
    const evaluated = JSON.parse(
      (validatedPlan.content as { text: string }[])[0].text,
    );
    expect(evaluated.acceptedAsResearch).toBe(true);
    expect(evaluated.executionAllowed).toBe(false);
    expect(evaluated.reasons).toContain("PUBLIC_FALLBACK_FORBIDDEN");
    expect(evaluated.walletAuthorization).toBe("none");
    expect(JSON.stringify(evaluated)).not.toContain(
      "Research Ethereum trading opportunities",
    );
    expect(
      (await client.listTools()).tools.some((tool) =>
        tool.name.startsWith("dev_"),
      ),
    ).toBe(false);
    expect(
      (await client.listTools()).tools.some(
        (tool) => tool.name === "policy_get",
      ),
    ).toBe(false);
    const quote = await client.callTool({
      name: "agent_execution_status",
      arguments: {},
    });
    expect(JSON.stringify(quote)).toContain("NO_VERIFIED_TRADING_VENUE");
    const invalidNetwork = await client
      .callTool({
        name: "market_search",
        arguments: { chain: "solana", query: "USDC" },
      })
      .catch((error: unknown) => ({ isError: true, error }));
    expect(invalidNetwork.isError).toBe(true);
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
      const registeredTools = (await client.listTools()).tools.map(
        (tool) => tool.name,
      );
      expect(registeredTools).toContain("dev_erc20_transfer_simulate");
      expect(registeredTools).toContain("policy_get");
      const simulation = await client.callTool({
        name: "dev_erc20_transfer_simulate",
        arguments: intent,
      });
      expect(
        JSON.parse((simulation.content as { text: string }[])[0].text)
          .simulated,
      ).toBe(true);
      const proposal = await client.callTool({
        name: "dev_erc20_transfer_propose",
        arguments: {
          intent,
          idempotencyKey: "00000000-0000-4000-8000-000000000001",
        },
      });
      expect(proposal.isError).not.toBe(true);
      expect(JSON.stringify(proposal)).toContain("simulated");
      const denied = await client.callTool({
        name: "dev_erc20_transfer_propose",
        arguments: {
          intent: { ...intent, amount: "100000000" },
          idempotencyKey: "00000000-0000-4000-8000-000000000002",
        },
      });
      expect(denied.isError).toBe(true);
      const status = await client.callTool({
        name: "dev_erc20_transfer_status",
        arguments: { id: "00000000-0000-4000-8000-000000000001" },
      });
      expect(JSON.stringify(status)).toContain("simulated");
    } finally {
      await client.close();
    }
  },
);
