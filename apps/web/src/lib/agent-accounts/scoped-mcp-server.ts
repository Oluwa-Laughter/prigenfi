import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { marketDomains } from "@prigenfi/shared/confidential-policy";
import {
  marketNetworkSchema,
  marketQuerySchema,
  marketPairLookupSchema,
  searchPublicMarkets,
  inspectPublicMarketPair,
} from "@prigenfi/shared/market-research";
import type { RemoteResearchScope } from "./mcp";

const market = z.enum(marketDomains);
const researchSearch = z
  .object({ chain: marketNetworkSchema, market, query: marketQuerySchema })
  .strict();
const researchPair = marketPairLookupSchema.extend({ market }).strict();

export function createProfileScopedMcp(scope: RemoteResearchScope) {
  const server = new McpServer(
    { name: "prigenfi-scoped-research", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "This PrigenFi server provides public research only for one wallet-owned, expiring profile. Networks and market categories are enforced in each tool. Never expose secrets, balances or private instructions to public-data providers. No encrypted trade, wallet signature, decryption, order execution or profit guarantee exists here. A valid token is NOT consent to spend funds.",
    },
  );
  const respond = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  });
  function allowed(chain: string, domain: string) {
    return (
      scope.allowedNetworks.includes(chain) &&
      scope.allowedMarkets.includes(domain)
    );
  }
  const denied = () => ({
    ...respond({
      error: "RESEARCH_SCOPE_DENIED",
      executionAllowed: false,
      permissionType: "research-only",
    }),
    isError: true,
  });
  const unexpected = () => ({
    ...respond({
      error: "PUBLIC_PROVIDER_UNAVAILABLE",
      executionAllowed: false,
    }),
    isError: true,
  });
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  };
  server.registerTool(
    "research_scope_get",
    {
      description:
        "Inspect the exact saved research networks and markets, expiry and explicit disabled trading boundary of this authenticated MCP profile.",
      inputSchema: z.object({}).strict(),
      annotations,
    },
    () =>
      respond({
        id: scope.agentId,
        label: scope.label,
        host: scope.host,
        allowedNetworks: scope.allowedNetworks,
        allowedMarkets: scope.allowedMarkets,
        expiresAt: scope.expiresAt,
        permissionType: "public-market-research-only",
        executionAllowed: false,
        ownerWalletAccess: false,
        confidentialTradeEnabled: false,
      }),
  );
  server.registerTool(
    "research_market_search",
    {
      description:
        "Public EVM token or pair research through DEX Screener; chain AND market must match the wallet owner's saved profile. No wallet access or execution.",
      inputSchema: researchSearch,
      annotations: { ...annotations, openWorldHint: true },
    },
    async (input) => {
      if (!allowed(input.chain, input.market)) return denied();
      try {
        return respond(
          await searchPublicMarkets({ chain: input.chain, query: input.query }),
        );
      } catch {
        return unexpected();
      }
    },
  );
  server.registerTool(
    "research_pair_lookup",
    {
      description:
        "Public DEX pool inspection; both chain and market category are checked against owner-saved profile. Not an executable quote.",
      inputSchema: researchPair,
      annotations: { ...annotations, openWorldHint: true },
    },
    async (input) => {
      if (!allowed(input.chain, input.market)) return denied();
      try {
        return respond(
          await inspectPublicMarketPair({
            chain: input.chain,
            pairAddress: input.pairAddress,
          }),
        );
      } catch {
        return unexpected();
      }
    },
  );
  server.registerTool(
    "agent_execution_status",
    {
      description:
        "Confirm that wallet spending, confidential swaps and trade execution are unavailable even with this access token.",
      inputSchema: z.object({}).strict(),
      annotations,
    },
    () =>
      respond({
        privateExecution: false,
        publicTradeFallback: false,
        walletAuthorization: "none",
        registeredProfileIsTradingConsent: false,
        reason: "NO_VERIFIED_CONFIDENTIAL_EXECUTION_OR_WALLET_POLICY",
      }),
  );
  server.registerPrompt(
    "interpret_scoped_research_goal",
    {
      title:
        "Interpret a user-provided research goal within a wallet-owned profile",
      description:
        "Connected AI host interprets a goal the user explicitly shares; profile network and market limits cannot be overridden by prompt text.",
      argsSchema: z
        .object({
          goal: z.string().trim().min(12).max(1200),
          network: marketNetworkSchema,
          market,
        })
        .strict(),
    },
    ({ goal, network, market }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: allowed(network, market)
              ? [
                  "The user voluntarily shared this public market research goal with the AI host:",
                  goal,
                  "Network: " + network,
                  "Market: " + market,
                  "Use only this profile's scoped public research tools. Do not share any private information with DEX Screener.",
                  "Explain risks and uncertainty; never claim execution, ownership of tokens, profits or wallet authorizations.",
                ].join("\n")
              : "RESEARCH_SCOPE_DENIED: The selected network or market is outside the owner-approved research profile. Do not analyze or run tools for it.",
          },
        },
      ],
    }),
  );
  return server;
}
