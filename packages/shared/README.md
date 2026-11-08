# @prigenfi/shared

Shared types, token registries, ABI types, validation and independent financial safety policy for PrigenFi web, SDK and MCP.

`confidential-policy.ts` mandates confidential-only research. `agent-planning.ts` validates market scope, expiry, supported official Sepolia wrappers, total suggested allocation and slippage. It returns **research eligibility only**. No AI tool output grants wallet signing, fund movement or encrypted-value decryption.

`swap-venue.ts` performs read-only Ethereum Sepolia inspection of an official Zama RFQ contract proxy and UUPS implementation. A verified proxy is not a verified trade. Execution remains disabled until FHE-capable venue/pair, owner permissions and settlement are proven.

Registry addresses and contract ABIs are sourced chain identities, not live user balances or fake market data. Use exact-decimal bigint units and reject unknown assets, chains, allowances and public-fallback requests. Run `pnpm typecheck` and `pnpm test` from the repository root.
