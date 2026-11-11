import { z } from "zod";
import type { MarketPair } from "./market-research";

/** Conservative, explicitly documented research-screening thresholds.
 * These are NOT observations, forecasts, venue-specific executable quotes,
 * portfolio allocations or evidence of token safety. Never trade on a pass.
 */
export const marketIntegrityPolicy = Object.freeze({
  minPoolLiquidityUsd: 75_000,
  min24hVolumeUsd: 5_000,
  maxAbs24hMovePercent: 40,
  maxVolumeToLiquidityRatio: 30,
  minPoolAgeHours: 48,
  maxFetchAgeSeconds: 120,
  maxClockSkewSeconds: 30,
});

export const marketIntegrityInputSchema = z
  .object({
    chain: z.string().min(1),
    pairAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  })
  .strict();

type Severity = "insufficient-evidence" | "heightened-risk" | "review-required";
export type MarketIntegritySignal = {
  code: string;
  kind: "data-quality" | "risk-indicator" | "verification";
};

/** Returns a source-bound, non-predictive public-market screening result.
 * Missing fields FAIL CLOSED instead of being interpreted as 0 or safe.
 * DEX Screener fetchedAt is our receipt time, NOT a provider trade timestamp.
 */
export function assessMarketIntegrity(
  pair: MarketPair | null,
  fetchedAt: string,
  expected: { chain: string; pairAddress: string },
  nowMs = Date.now(),
) {
  const signals: MarketIntegritySignal[] = [];
  const flag = (code: string, kind: MarketIntegritySignal["kind"]) =>
    signals.push({ code, kind });
  const fetchedMs = Date.parse(fetchedAt);
  const policy = marketIntegrityPolicy;
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !Number.isFinite(fetchedMs) ||
    fetchedMs > nowMs + policy.maxClockSkewSeconds * 1000 ||
    nowMs - fetchedMs > policy.maxFetchAgeSeconds * 1000
  )
    flag("MARKET_FETCH_TIME_INVALID_OR_STALE", "data-quality");
  if (
    !pair ||
    pair.chain !== expected.chain ||
    pair.pairAddress.toLowerCase() !== expected.pairAddress.toLowerCase()
  )
    flag("PAIR_IDENTITY_UNVERIFIED", "data-quality");
  if (pair) {
    if (
      pair.priceUsd === null ||
      !Number.isFinite(Number(pair.priceUsd)) ||
      Number(pair.priceUsd) <= 0
    )
      flag("PRICE_MISSING_OR_INVALID", "data-quality");
    if (pair.liquidityUsd === null || !Number.isFinite(pair.liquidityUsd))
      flag("POOL_LIQUIDITY_UNAVAILABLE", "data-quality");
    else if (pair.liquidityUsd < policy.minPoolLiquidityUsd)
      flag("POOL_LIQUIDITY_BELOW_POLICY", "risk-indicator");
    if (pair.volume24hUsd === null || !Number.isFinite(pair.volume24hUsd))
      flag("DAY_VOLUME_UNAVAILABLE", "data-quality");
    else if (pair.volume24hUsd < policy.min24hVolumeUsd)
      flag("DAY_VOLUME_BELOW_POLICY", "risk-indicator");
    if (pair.change24h === null || !Number.isFinite(pair.change24h))
      flag("DAY_PRICE_CHANGE_UNAVAILABLE", "data-quality");
    else if (Math.abs(pair.change24h) > policy.maxAbs24hMovePercent)
      flag("LARGE_DAY_PRICE_MOVE", "risk-indicator");
    if (
      pair.volume24hUsd !== null &&
      Number.isFinite(pair.volume24hUsd) &&
      pair.liquidityUsd !== null &&
      Number.isFinite(pair.liquidityUsd) &&
      pair.liquidityUsd > 0 &&
      pair.volume24hUsd / pair.liquidityUsd > policy.maxVolumeToLiquidityRatio
    )
      flag("UNUSUAL_VOLUME_TO_LIQUIDITY", "risk-indicator");
    if (
      pair.pairCreatedAtMs === null ||
      !Number.isSafeInteger(pair.pairCreatedAtMs) ||
      pair.pairCreatedAtMs <= 0 ||
      pair.pairCreatedAtMs > nowMs + policy.maxClockSkewSeconds * 1000
    )
      flag("POOL_CREATION_TIME_UNVERIFIED", "data-quality");
    else if (nowMs - pair.pairCreatedAtMs < policy.minPoolAgeHours * 3600_000)
      flag("RECENT_POOL_CREATION", "risk-indicator");
  }
  // A token can be blacklisted, honeypotted or malicious despite healthy
  // pool numbers. Only independent on-chain checks can address that class.
  flag("TOKEN_CODE_AND_TRANSFER_RULES_UNVERIFIED", "verification");
  flag("PROVIDER_OBSERVATION_TIME_UNAVAILABLE", "verification");
  const insufficient = signals.some((s) => s.kind === "data-quality");
  const heightened = signals.some((s) => s.kind === "risk-indicator");
  const classification: Severity = insufficient
    ? "insufficient-evidence"
    : heightened
      ? "heightened-risk"
      : "review-required";
  return {
    classification,
    signals,
    source: "DEX Screener" as const,
    sourceClass: "untrusted-public-market-observation" as const,
    fetchedAt,
    providerQuoteTimestampVerified: false as const,
    tokenContractAudited: false as const,
    independentLiquidityVerification: false as const,
    screenType: "deterministic-research-only" as const,
    executionAllowed: false as const,
    confidentialExecutionAvailable: false as const,
    expectedChain: expected.chain,
    expectedPairAddress: expected.pairAddress.toLowerCase(),
    policy,
  };
}
