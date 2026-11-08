import { describe, expect, it } from "vitest";
import {
  agentPlanSubmissionSchema,
  evaluateAgentResearchPlan,
} from "../packages/shared/src/agent-planning";
import { confidentialAssets } from "../packages/shared/src";

const usdc = confidentialAssets[0].address;
const usdt = confidentialAssets[1].address;
const zama = confidentialAssets[2].address;
const now = 2_000_000_000;

const mandate = {
  market: "portfolio" as const,
  instruction: "Research DeFi and market opportunities confidentially.",
  watchAssets: "cUSDC, cUSDT, cZAMA",
  suggestedCapitalLimit: "100",
  privacy: "confidential-only" as const,
};

const step = {
  stepId: "swap-1",
  action: "swap" as const,
  market: "spot" as const,
  chainId: 11155111 as const,
  tokenIn: usdc,
  tokenOut: usdt,
  allocationBps: 4000,
  maxSlippageBps: 100,
};

const make = () => ({
  mandate,
  plan: {
    planId: "00000000-0000-4000-8000-000000000010",
    privacy: "confidential-only" as const,
    chainId: 11155111 as const,
    expiresAt: now + 300,
    steps: [step],
  },
});

describe("agent plan boundary", () => {
  it("accepts well-formed research only, without any execution authority", () => {
    const input = make();
    expect(agentPlanSubmissionSchema.safeParse(input).success).toBe(true);
    const result = evaluateAgentResearchPlan(input, now);
    expect(result).toMatchObject({
      acceptedAsResearch: true,
      executionAllowed: false,
      walletAuthorization: "none",
      onChainSimulation: false,
      privacy: "confidential-only",
      mode: "research-only",
      decryptedBalancesIncluded: false,
    });
    expect(result.reasons).toContain("PUBLIC_FALLBACK_FORBIDDEN");
    expect(result.reasons).toContain("NO_VERIFIED_CONFIDENTIAL_TRADE_VENUE");
    expect(result.steps).toEqual([
      {
        stepId: "swap-1",
        eligibleForResearch: true,
        reasons: [],
        executionAllowed: false,
      },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(mandate.instruction);
    expect(serialized).not.toContain(usdc);
  });

  it("rejects any public or optional-privacy downgrade", () => {
    for (const privacy of ["public", "optional", "public-allowed", null]) {
      const input = make();
      const changed = {
        ...input,
        plan: { ...input.plan, privacy },
      };
      expect(evaluateAgentResearchPlan(changed, now)).toMatchObject({
        acceptedAsResearch: false,
        executionAllowed: false,
        reasons: ["INVALID_AGENT_PLAN"],
      });
    }
  });

  it("rejects an unregistered ERC-20 even on Sepolia", () => {
    const input = make();
    const result = evaluateAgentResearchPlan({
      ...input,
      plan: {
        ...input.plan,
        steps: [{ ...step, tokenOut: "0x0000000000000000000000000000000000000001" }],
      },
    }, now);
    expect(result.steps[0].reasons).toContain(
      "UNSUPPORTED_CONFIDENTIAL_OUTPUT",
    );
    expect(result.executionAllowed).toBe(false);
  });

  it("rejects mismatched market scopes and over-allocation", () => {
    const input = make();
    const result = evaluateAgentResearchPlan({
      ...input,
      mandate: { ...mandate, market: "defi" },
      plan: {
        ...input.plan,
        steps: [
          { ...step, allocationBps: 6000 },
          { ...step, stepId: "swap-2", tokenOut: zama, allocationBps: 5000 },
        ],
      },
    }, now);
    expect(result.acceptedAsResearch).toBe(false);
    expect(result.reasons).toContain("ALLOCATION_EXCEEDS_100_PERCENT");
    expect(result.steps[0].reasons).toContain("MARKET_OUTSIDE_MANDATE");
  });

  it("rejects stale and far-future plans even if all assets are valid", () => {
    const input = make();
    for (const expiresAt of [now - 1, now, now + 3601]) {
      const result = evaluateAgentResearchPlan({
        ...input,
        plan: { ...input.plan, expiresAt },
      }, now);
      expect(result.reasons).toContain("PLAN_EXPIRY_INVALID");
      expect(result.executionAllowed).toBe(false);
    }
  });

  it("rejects duplicate steps, monitoring allocations and missing bounds", () => {
    const input = make();
    const result = evaluateAgentResearchPlan({
      ...input,
      plan: {
        ...input.plan,
        steps: [
          step,
          {
            ...step,
            action: "monitor",
            allocationBps: 100,
          },
        ],
      },
    }, now);
    expect(result.steps[1].reasons).toContain("DUPLICATE_STEP");
    expect(result.steps[1].reasons).toContain(
      "MONITOR_MUST_NOT_ALLOCATE_CAPITAL",
    );
    const missingBound = evaluateAgentResearchPlan({
      ...input,
      plan: {
        ...input.plan,
        steps: [{ ...step, maxSlippageBps: undefined }],
      },
    }, now);
    expect(missingBound.steps[0].reasons).toContain(
      "SLIPPAGE_BOUND_REQUIRED",
    );
  });

  it("rejects self-swaps, missing output and zero investment allocation", () => {
    const input = make();
    const check = (patch: Record<string, unknown>, reason: string) => {
      const result = evaluateAgentResearchPlan({
        ...input,
        plan: { ...input.plan, steps: [{ ...step, ...patch }] },
      }, now);
      expect(result.steps[0].reasons).toContain(reason);
    };
    check({ tokenOut: usdc }, "IDENTICAL_ASSETS");
    check({ tokenOut: undefined }, "OUTPUT_ASSET_REQUIRED");
    check({ allocationBps: 0 }, "ALLOCATION_REQUIRED");
  });

  it("rejects arbitrary chains, extra calldata and invented venues", () => {
    const input = make();
    for (const changed of [
      { ...input.plan, chainId: 1 },
      { ...input.plan, steps: [{ ...step, chainId: 1 }] },
      { ...input.plan, steps: [{ ...step, calldata: "0xdeadbeef" }] },
      { ...input.plan, steps: [{ ...step, venue: "0x123" }] },
      { ...input.plan, steps: new Array(9).fill(step) },
    ]) {
      expect(evaluateAgentResearchPlan({
        ...input,
        plan: changed,
      }, now)).toMatchObject({
        acceptedAsResearch: false,
        executionAllowed: false,
        reasons: ["INVALID_AGENT_PLAN"],
      });
    }
  });

  it("fails closed on invalid evaluation time", () => {
    const result = evaluateAgentResearchPlan(make(), Number.NaN);
    expect(result.acceptedAsResearch).toBe(false);
    expect(result.reasons).toContain("UNTRUSTED_EVALUATION_TIME");
  });
});
