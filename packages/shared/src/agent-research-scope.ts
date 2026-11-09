import { z } from "zod";
import { marketNetworkSchema } from "./market-research";
import { marketDomains } from "./confidential-policy";

/** A public-data research contract, not authority to trade or share wallet data. */
const publicSearchTermSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0x[a-fA-F0-9]{40}|[a-zA-Z0-9][a-zA-Z0-9./_-]{1,20})$/,
    "Only public token symbols, pairs, or an EVM contract address may be searched",
  );
export const ownerResearchConstraintsSchema = z
  .object({
    goal: z.string().trim().min(12).max(1200),
    market: z.enum(marketDomains),
    allowedNetworks: z.array(marketNetworkSchema).min(1).max(6),
    privacy: z.literal("confidential-only"),
  })
  .strict();
export const agentPublicResearchDecisionSchema = z
  .object({
    network: marketNetworkSchema,
    market: z.enum(marketDomains),
    tokenOrPair: publicSearchTermSchema,
    expiresAt: z.number().int().positive(),
  })
  .strict();
export const agentPublicResearchSubmissionSchema = z
  .object({
    callerConstraints: ownerResearchConstraintsSchema,
    agentDecision: agentPublicResearchDecisionSchema,
  })
  .strict();

/**
 * An MCP host can be a model. Neither the model nor the caller-provided goal
 * is authenticated here. A positive decision authorizes NOTHING onchain.
 */
export function evaluateAgentPublicResearch(
  submission: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const parsed = agentPublicResearchSubmissionSchema.safeParse(submission);
  const base = {
    privacy: "confidential-only" as const,
    mode: "public-market-research" as const,
    executionAllowed: false as const,
    walletAuthorization: "none" as const,
    privateExecutionVerified: false as const,
    ownerAuthenticated: false as const,
    externalProviderReceivesSearchTerm: true as const,
  };
  if (!parsed.success)
    return {
      ...base,
      acceptedForResearch: false,
      reasons: ["INVALID_RESEARCH_REQUEST"],
    };
  const { callerConstraints, agentDecision } = parsed.data;
  const reasons: string[] = [];
  if (
    new Set(callerConstraints.allowedNetworks).size !==
    callerConstraints.allowedNetworks.length
  ) {
    reasons.push("DUPLICATE_RESEARCH_NETWORK");
  }
  if (!callerConstraints.allowedNetworks.includes(agentDecision.network)) {
    reasons.push("NETWORK_OUTSIDE_RESEARCH_SCOPE");
  }
  if (
    callerConstraints.market !== "portfolio" &&
    callerConstraints.market !== agentDecision.market
  ) {
    reasons.push("MARKET_OUTSIDE_RESEARCH_SCOPE");
  }
  if (
    !Number.isSafeInteger(nowSeconds) ||
    nowSeconds <= 0 ||
    agentDecision.expiresAt <= nowSeconds ||
    agentDecision.expiresAt > nowSeconds + 900
  ) {
    reasons.push("RESEARCH_REQUEST_EXPIRED_OR_TOO_LONG");
  }
  return {
    ...base,
    acceptedForResearch: reasons.length === 0,
    reasons: [
      ...reasons,
      "PUBLIC_DATA_ONLY",
      "PUBLIC_FALLBACK_FORBIDDEN",
      "NO_PRIVATE_TRADING_EXECUTION",
    ],
  };
}
