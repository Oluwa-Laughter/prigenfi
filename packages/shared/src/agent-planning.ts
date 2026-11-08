import { z } from "zod";
import { addressSchema, confidentialAssets } from "./index";
import {
  confidentialMandateSchema,
  marketDomains,
} from "./confidential-policy";

/**
 * An LLM may suggest research steps, never authorizations or calldata.
 * No plaintext amount, private balance, signer, venue or ciphertext is accepted.
 */
export const agentResearchStepSchema = z
  .object({
    stepId: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/),
    action: z.enum([
      "monitor",
      "swap",
      "lend",
      "repay",
      "stake",
      "unstake",
      "provide-liquidity",
      "withdraw-liquidity",
      "hedge",
      "rebalance",
    ]),
    market: z.enum(marketDomains),
    chainId: z.literal(11155111),
    tokenIn: addressSchema.optional(),
    tokenOut: addressSchema.optional(),
    allocationBps: z.number().int().min(0).max(10000),
    maxSlippageBps: z.number().int().min(0).max(300).optional(),
  })
  .strict();

export const agentResearchPlanSchema = z
  .object({
    planId: z.string().uuid(),
    privacy: z.literal("confidential-only"),
    chainId: z.literal(11155111),
    expiresAt: z.number().int().positive(),
    steps: z.array(agentResearchStepSchema).min(1).max(8),
  })
  .strict();

export const agentPlanSubmissionSchema = z
  .object({
    mandate: confidentialMandateSchema,
    plan: agentResearchPlanSchema,
  })
  .strict();

export type AgentResearchPlan = z.infer<typeof agentResearchPlanSchema>;

const knownWrappers = new Set(
  confidentialAssets.map((asset) => asset.address.toLowerCase()),
);

const BLOCKERS = [
  "NO_VERIFIED_CONFIDENTIAL_TRADE_VENUE",
  "NO_AUTHENTICATED_AGENT_EXECUTION",
  "OWNER_AUTHORIZATION_REQUIRED",
  "PUBLIC_FALLBACK_FORBIDDEN",
] as const;

const resultBase = {
  privacy: "confidential-only" as const,
  mode: "research-only" as const,
  executionAllowed: false as const,
  walletAuthorization: "none" as const,
  onChainSimulation: false as const,
  decryptedBalancesIncluded: false as const,
};

/**
 * Evaluate an untrusted agent-produced plan against a user-authored draft.
 * Research eligibility is NOT permission to place an order.
 *
 * The return value intentionally excludes instructions, token addresses,
 * budgets, balances and agent reasoning to minimize accidental disclosure.
 */
export function evaluateAgentResearchPlan(
  submission: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const parsed = agentPlanSubmissionSchema.safeParse(submission);
  if (!parsed.success) {
    return {
      ...resultBase,
      acceptedAsResearch: false,
      reasons: ["INVALID_AGENT_PLAN"],
      steps: [],
    };
  }

  const { mandate, plan } = parsed.data;
  const reasons: string[] = [];
  const seen = new Set<string>();
  let totalAllocation = 0;

  if (!Number.isSafeInteger(nowSeconds) || nowSeconds <= 0) {
    reasons.push("UNTRUSTED_EVALUATION_TIME");
  } else if (
    plan.expiresAt <= nowSeconds ||
    plan.expiresAt > nowSeconds + 3600
  ) {
    reasons.push("PLAN_EXPIRY_INVALID");
  }

  const steps = plan.steps.map((step) => {
    const issues: string[] = [];

    if (seen.has(step.stepId)) issues.push("DUPLICATE_STEP");
    seen.add(step.stepId);

    if (mandate.market !== "portfolio" && step.market !== mandate.market) {
      issues.push("MARKET_OUTSIDE_MANDATE");
    }
    if (step.chainId !== plan.chainId) issues.push("CHAIN_MISMATCH");

    if (step.action === "monitor") {
      if (step.allocationBps !== 0) {
        issues.push("MONITOR_MUST_NOT_ALLOCATE_CAPITAL");
      }
    } else {
      if (step.allocationBps === 0) issues.push("ALLOCATION_REQUIRED");
      if (!step.tokenIn) issues.push("INPUT_ASSET_REQUIRED");
    }

    if (step.tokenIn && !knownWrappers.has(step.tokenIn.toLowerCase())) {
      issues.push("UNSUPPORTED_CONFIDENTIAL_INPUT");
    }
    if (step.tokenOut && !knownWrappers.has(step.tokenOut.toLowerCase())) {
      issues.push("UNSUPPORTED_CONFIDENTIAL_OUTPUT");
    }

    if (step.action === "swap" || step.action === "rebalance") {
      if (!step.tokenOut) issues.push("OUTPUT_ASSET_REQUIRED");
      if (
        step.tokenIn &&
        step.tokenOut &&
        step.tokenIn.toLowerCase() === step.tokenOut.toLowerCase()
      ) {
        issues.push("IDENTICAL_ASSETS");
      }
      if (step.maxSlippageBps === undefined) {
        issues.push("SLIPPAGE_BOUND_REQUIRED");
      }
    }

    totalAllocation += step.allocationBps;

    return {
      stepId: step.stepId,
      eligibleForResearch: issues.length === 0,
      reasons: issues,
      executionAllowed: false as const,
    };
  });

  if (totalAllocation > 10000) reasons.push("ALLOCATION_EXCEEDS_100_PERCENT");
  if (steps.some((step) => !step.eligibleForResearch)) {
    reasons.push("STEP_POLICY_REJECTED");
  }

  const researchEligible = reasons.length === 0;
  return {
    ...resultBase,
    acceptedAsResearch: researchEligible,
    reasons: [...reasons, ...BLOCKERS],
    steps,
  };
}
