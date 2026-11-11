# Public market integrity screening (research-only)

This deterministic policy checks **real externally sourced EVM DEX pools** for incomplete or suspicious data. It is not a predictive trading model, source of confidential prices, smart-contract audit, financial recommendation, executable swap quote, investor win-rate or certification of safety.

## Data sources and verification assumptions

PrigenFi uses the published [DEX Screener API](https://docs.dexscreener.com/api/reference) for contract-address pair search and exact `chain/pairAddress` lookup. A response is bounded to 1 MiB in the server before parsing, restricted to a limited set of pairs, matched to the requested chain and token identity, deduplicated and sanitized to reject markup, URLs, control characters and malformed or overlong labels. Remaining provider text is **still untrusted**, including natural-language attempts to influence an AI agent. A contract-address search **must** return a pair containing that address. Pair identity and underlying transaction finality are not independently attested by the provider.

The `fetchedAt` field is the PrigenFi API's **time of retrieval**; it does not certify when a trade was executed, how current a quote is or how much liquidity exists on-chain now. Pair creation time, 24-hour price change, reported liquidity and volume come from the untrusted public provider. A single vendor's reported figures are insufficient to verify hidden transfer restrictions, tax/fee mechanics, owner keys, honeypots, reserve manipulation or the feasibility of any private trade. **No confidential-only execution venue is inferred from public DEX data.**

## Research guardrails (configuration, not market observations)

The public code in `packages/shared/src/market-integrity.ts` sets conservative _research review thresholds_ to flag reported pool liquidity below $75,000, reported 24-hour volume below $5,000, absolute 24-hour price change above 40%, reported 24-hour turnover greater than 30 times liquidity, pool age under 48 hours, or a retrieved response older than 120 seconds (with 30 seconds of clock-skew tolerance). These are policy constants—not hardcoded market prices, predictions, universal trading thresholds, advice or guarantees. They can generate false positives and false negatives.

The resulting classifications are:

- `insufficient-evidence`: missing/inconsistent identity, price, timestamps, liquidity, volume, or expired retrieval; do not infer low risk from null fields
- `heightened-risk`: the above quantitative thresholds triggered, even if a provider supplied all relevant fields
- `review-required`: no threshold flag from the observed snapshot, but contract identity, token transfer rules and observation time remain **unverified**

**Every result includes `executionAllowed:false`, `confidentialExecutionAvailable:false`, `tokenContractAudited:false` and `providerQuoteTimestampVerified:false`.** None of these classifications gives permission to spend assets or convert a user prompt to a signed transaction.

## Actual agent and UI integration

`/markets` now displays the class and evidence flags per real pool, not a fictitious risk score or recommended trade. `market_integrity_assess` is available in the local consumer MCP server; the owner-authenticated HTTP MCP server exposes `research_market_integrity_check`. The latter verifies **both** the owner-saved allowed EVM network and research market category before requesting public provider data. The `prigenfi-market-diligence` Agent Skill orchestrates those actual tools and explicitly treats provider output as untrusted model input.

The independent upgradable `AgentSafetyPolicy` is a **separate, non-custodial on-chain research-policy reference**. It is not connected to these off-chain checks, to the existing `AgentVault`, or to live fund execution; do not claim its parameters enforce trading safety. See [SECURITY_AND_UPGRADES.md](SECURITY_AND_UPGRADES.md).

## Engineering verification

`tests/market-integrity.test.ts` exercises fully deterministic **test-only fixtures** for liquidity, turnover, price volatility, age, data absence, stale retrieval, mismatched pair identity, unrelated token-address results, prompt-like external token names and oversized HTTP responses. The local and hosted MCP tests discover the new tools and check negative permissions; no market data or synthetic profits are persisted as customer results. Real live market feeds are external and can be delayed or unavailable.
