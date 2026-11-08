import { describe, expect, it } from "vitest";
import {
  assessConfidentialTrade,
  confidentialCapabilities,
  confidentialMandateSchema,
  marketDomains,
} from "../packages/shared/src/confidential-policy";
import { confidentialAssets } from "../packages/shared/src";

const draft = {
  market: "portfolio" as const,
  instruction:
    "Discover worthwhile opportunities throughout DeFi and spot markets.",
  watchAssets: "cUSDC / cUSDT / cZAMA",
  suggestedCapitalLimit: "100",
  privacy: "confidential-only" as const,
};
describe("fail-closed confidential agent trading", () => {
  it("accepts a research intent but never enables a public fallback or a private trade without a venue", () => {
    expect(confidentialMandateSchema.safeParse(draft).success).toBe(true);
    for (const market of marketDomains) {
      expect(assessConfidentialTrade({ ...draft, market })).toMatchObject({
        acceptedAsResearch: true,
        executionAllowed: false,
        privacy: "confidential-only",
        reasons: [
          "NO_VERIFIED_CONFIDENTIAL_TRADE_VENUE",
          "NO_AUTHENTICATED_AGENT_EXECUTION",
          "PUBLIC_FALLBACK_FORBIDDEN",
        ],
      });
    }
    expect(confidentialCapabilities.publicExecutionFallback).toBe(false);
    expect(confidentialCapabilities.privateAgentExecution).toBe(false);
  });
  it("rejects public/optional privacy, zero limits, missing instructions and unsupported markets", () => {
    for (const patch of [
      { privacy: "public-allowed" },
      { privacy: "optional" },
      { market: "anything" },
      { suggestedCapitalLimit: "0" },
      { suggestedCapitalLimit: "-2" },
      { instruction: "swap" },
      { watchAssets: "" },
    ]) {
      expect(assessConfidentialTrade({ ...draft, ...patch })).toMatchObject({
        acceptedAsResearch: false,
        executionAllowed: false,
        reasons: ["INVALID_MANDATE"],
      });
    }
  });
  it("registers distinct official test wrappers and never claims their underlying is real Sepolia ZAMA", () => {
    expect(confidentialAssets.map((a) => a.displaySymbol)).toEqual([
      "cUSDC",
      "cUSDT",
      "cZAMA",
      "cWETH",
      "cBRON",
      "cXAUt",
      "ctGBP",
    ]);
    expect(
      new Set(confidentialAssets.map((a) => a.address.toLowerCase())).size,
    ).toBe(confidentialAssets.length);
    expect(
      confidentialAssets.every((a) => a.chainId === 11155111 && a.isTestAsset),
    ).toBe(true);
    expect(
      confidentialAssets
        .find((a) => a.displaySymbol === "cZAMA")
        ?.underlying.toLowerCase(),
    ).not.toBe("0xa798b04149e7a61cc95b7d114ad420e8969ea268");
  });
});
