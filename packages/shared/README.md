# @prigenfi/shared

Shared types, token registries, ABI types, validation and independent financial safety policy for PrigenFi web, SDK and MCP.

`confidential-policy.ts` mandates confidential-only research. `agent-planning.ts` validates market scope, expiry, supported official Sepolia wrappers, total suggested allocation and slippage. It returns **research eligibility only**. No AI tool output grants wallet signing, fund movement or encrypted-value decryption.

`swap-venue.ts` performs read-only Ethereum Sepolia inspection of an official Zama RFQ contract proxy and UUPS implementation. A verified proxy is not a verified trade. Execution remains disabled until FHE-capable venue/pair, owner permissions and settlement are proven.

Registry addresses and contract ABIs are sourced chain identities, not live user balances or fake market data. Use exact-decimal bigint units and reject unknown assets, chains, allowances and public-fallback requests. Run `pnpm typecheck` and `pnpm test` from the repository root.

## Multi-chain public market research and agent scope

`market-research.ts` is the single real provider adapter for the web and MCP. Its six allowlisted EVM chain IDs are **public research scopes**, not Zama/FHE deployment guarantees. It accepts symbol/pair searches and exact contract-address lookups, validates the provider response, drops wrong-chain and malformed-address results, bounds results to 24, and returns null rather than invented prices or volumes. The provider can observe a requested symbol or contract address; never forward private user instructions.

`agent-research-scope.ts` validates a model's proposed public research step against caller-supplied network scope, market domain, expiry, and safe symbol/address format. It does not verify that the caller is the owner; its positive result permits **public research only**, with `executionAllowed:false` and zero wallet authorization. `agent-planning.ts` separately handles Sepolia confidential-wrapper proposals.

## Market evidence and public input hardening — November 11, 2026

The shared `market-integrity` package export provides conservative, deterministic public EVM pool screening using actual DEX Screener observations from `market-research`. It signals absent/old evidence, low liquidity/24h volume, large short-term moves, abnormal volume-to-liquidity and recent pool creation, and **never** returns safe asset certification or execution authority. The fetch adapter now bounds the response size, verifies requested token-address inclusion in returned pairs, and strips many dangerous label characters; provider data remains untrusted. It powers the web market page and both MCP transports.
