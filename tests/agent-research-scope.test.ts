import { describe, expect, it } from "vitest";
import { evaluateAgentPublicResearch } from "../packages/shared/src/agent-research-scope";
const now = 2_000_000_000;
const scope = {
  callerConstraints: {
    goal: "Research legitimate stablecoin opportunities on selected EVM networks.",
    market: "stablecoins" as const,
    allowedNetworks: ["ethereum", "base"] as ("ethereum" | "base")[],
    privacy: "confidential-only" as const,
  },
  agentDecision: {
    network: "base" as const,
    market: "stablecoins" as const,
    tokenOrPair: "USDC",
    expiresAt: now + 300,
  },
};
describe("agent-directed multichain research: never a trading authorization", () => {
  it("accepts bounded public research but never grants signing, funds, or privacy claims", () => {
    const result = evaluateAgentPublicResearch(scope, now);
    expect(result).toMatchObject({
      acceptedForResearch: true,
      executionAllowed: false,
      ownerAuthenticated: false,
      walletAuthorization: "none",
      privateExecutionVerified: false,
      externalProviderReceivesSearchTerm: true,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(scope.callerConstraints.goal);
    expect(serialized).not.toContain(scope.agentDecision.tokenOrPair);
  });
  it("rejects a model expanding chain access", () => {
    const result = evaluateAgentPublicResearch(
      {
        ...scope,
        agentDecision: { ...scope.agentDecision, network: "bsc" },
      },
      now,
    );
    expect(result.acceptedForResearch).toBe(false);
    expect(result.reasons).toContain("NETWORK_OUTSIDE_RESEARCH_SCOPE");
  });
  it("rejects a model expanding the requested financial domain", () => {
    const result = evaluateAgentPublicResearch(
      {
        ...scope,
        agentDecision: { ...scope.agentDecision, market: "derivatives" },
      },
      now,
    );
    expect(result.reasons).toContain("MARKET_OUTSIDE_RESEARCH_SCOPE");
  });
  it("rejects duplicate chain settings and expired or overlong research scope", () => {
    const duplicate = evaluateAgentPublicResearch(
      {
        ...scope,
        callerConstraints: {
          ...scope.callerConstraints,
          allowedNetworks: ["base", "base"],
        },
      },
      now,
    );
    expect(duplicate.reasons).toContain("DUPLICATE_RESEARCH_NETWORK");
    for (const expiresAt of [now - 1, now, now + 901]) {
      const result = evaluateAgentPublicResearch(
        {
          ...scope,
          agentDecision: { ...scope.agentDecision, expiresAt },
        },
        now,
      );
      expect(result.reasons).toContain("RESEARCH_REQUEST_EXPIRED_OR_TOO_LONG");
    }
  });
  it("rejects arbitrary prompt text, unexpected calldata and privacy downgrade", () => {
    for (const changed of [
      {
        ...scope,
        agentDecision: {
          ...scope.agentDecision,
          tokenOrPair: "my personal secret phrase",
        },
      },
      {
        ...scope,
        agentDecision: {
          ...scope.agentDecision,
          tokenOrPair: "USDC",
          calldata: "0xdeadbeef",
        },
      },
      {
        ...scope,
        callerConstraints: { ...scope.callerConstraints, privacy: "public" },
      },
      {
        ...scope,
        agentDecision: { ...scope.agentDecision, network: "solana" },
      },
    ]) {
      const result = evaluateAgentPublicResearch(changed, now);
      expect(result.acceptedForResearch).toBe(false);
      expect(result.reasons).toEqual(["INVALID_RESEARCH_REQUEST"]);
      expect(result.executionAllowed).toBe(false);
    }
  });
});
