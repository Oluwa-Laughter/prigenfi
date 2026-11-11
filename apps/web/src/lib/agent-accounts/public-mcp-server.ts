import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  marketSearchSchema,
  marketPairLookupSchema,
  searchPublicMarkets,
  inspectPublicMarketPair,
} from "@prigenfi/shared/market-research";
import { assessMarketIntegrity } from "@prigenfi/shared/market-integrity";
import { confidentialCapabilities } from "@prigenfi/shared/confidential-policy";

/** No private session, credentials, wallets, vaults, spenders or signers. */
export function createPublicResearchMcp() {
  const server = new McpServer(
    { name: "prigenfi-public-research", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "PrigenFi public EVM research only. All observations are public, may be incomplete, and do not certify safety or profitability. No wallet authorization, balance, confidential strategy, raw call, signing, trade or swap tools exist. Do not send personal goals, wallet details or secrets to market data providers.",
    },
  );
  const respond = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  });
  const unavailable = () => ({
    ...respond({
      error: "PUBLIC_PROVIDER_UNAVAILABLE",
      executionAllowed: false,
    }),
    isError: true,
  });
  const readonly = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  };
  server.registerTool(
    "market_search",
    {
      description:
        "Research public EVM token/pair markets from DEX Screener with explicit source and retrieval time. No wallet access or executable quote.",
      inputSchema: marketSearchSchema,
      annotations: readonly,
    },
    async (input) => {
      try {
        return respond(await searchPublicMarkets(input));
      } catch {
        return unavailable();
      }
    },
  );
  server.registerTool(
    "market_pair_lookup",
    {
      description:
        "Inspect one exact public DEX pair address on the specified EVM chain. Public data only, no trade authorization.",
      inputSchema: marketPairLookupSchema,
      annotations: readonly,
    },
    async (input) => {
      try {
        return respond(await inspectPublicMarketPair(input));
      } catch {
        return unavailable();
      }
    },
  );
  server.registerTool(
    "market_integrity_assess",
    {
      description:
        "Check public liquidity, recency and risk indicators for one pair. Not a safe-investment certificate, price oracle or trading signal.",
      inputSchema: marketPairLookupSchema,
      annotations: readonly,
    },
    async (input) => {
      try {
        const data = await inspectPublicMarketPair(input);
        return respond(
          assessMarketIntegrity(data.pair, data.fetchedAt, {
            chain: input.chain,
            pairAddress: input.pairAddress,
          }),
        );
      } catch {
        return unavailable();
      }
    },
  );
  server.registerTool(
    "confidential_capabilities_get",
    {
      description:
        "Public crypto-only Sepolia test wrapper names and explicitly disabled agent trade execution; never read or decrypt a user's private balances.",
      inputSchema: z.object({}).strict(),
      annotations: { ...readonly, openWorldHint: false },
    },
    () => respond(confidentialCapabilities),
  );
  server.registerTool(
    "agent_execution_status",
    {
      description:
        "Show that no public or confidential agent trading capability, wallet spending permission or keys exist on this endpoint.",
      inputSchema: z.object({}).strict(),
      annotations: { ...readonly, openWorldHint: false },
    },
    () =>
      respond({
        executionAllowed: false,
        privateExecution: false,
        publicTradeFallback: false,
        walletAuthorization: "none",
        confidentialityGuarantee: false,
        reason: "NO_VERIFIED_CONFIDENTIAL_EXECUTION_OR_WALLET_POLICY",
      }),
  );
  return server;
}
