# Zama official confidential swap: integration feasibility

The generated [Zama Sepolia registry](https://github.com/zama-ai/protocol-registry/blob/main/testnet.md) lists a **ConfidentialSwap RFQ proxy** on Ethereum Sepolia (chain ID 11155111):

**0xab86445f72A64A99C8d248dcE004915B45C88e20**

Zama describes an on-chain blind RFQ auction for confidential-token pairs at [Confidential Swap](https://www.zama.org/confidential-swap). This is an existing protocol candidate, not an integrated PrigenFi exchange.

## Verified technical status — November 8, 2026

The official Zama **testnet.json** snapshot and **manifest.json** were pinned byte-for-byte from `zama-ai/protocol-registry`. Their SHA-256 matched. The testnet registry source commit is `93283992cc39442fa9019c1474ef69331429e71a`, and the full JSON checksum is `68be316c990789ebcf33276392e8780d5ce6e04a31c8f7f7b9fbefceb58d93b5`. The exact contract entry identifies chain ID 11155111 and deployment block 11687343. Evidence is under `infra/zama-registry/`.

A read-only Sepolia JSON-RPC observation at block **12091125** confirmed:

- The proxy has deployed bytecode, with Keccak-256 code hash `0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6`.
- ERC-1967 implementation storage points to `0x93FA553AFd73952105450264620eA08aBa7B52d5`, which also has deployed bytecode (hash `0x9814915edd2e296962367eeeba9d9d798dc45bbd13988040713e15fa7a0f003e`).
- Direct `proxiableUUID()` on the implementation returns the EIP-1967 implementation slot, consistent with UUPS.

These findings establish only that a registry-listed UUPS proxy and implementation are deployed at the observed block. No swap ABI, pair listing, encrypted lifecycle, quote maker eligibility, upgrade authority, access control, liquidity, user consent or end-to-end confidential transaction has yet been independently verified. The execution gate stays closed.

`pnpm verify:swap:source` is a deterministic offline registry integrity test; `pnpm verify:swap` rechecks the live chain and records a new public observation. The workspace `/privacy` panel uses an isolated, cached read-only API and reports failures honestly. Tests cover wrong-chain responses, missing implementation, malformed storage, invalid UUID and absent bytecode.

## Engineering checklist

1. Pin Zama's generated registry JSON, manifest and source commit. Independently verify the Sepolia proxy's current on-chain bytecode, UUPS implementation slot, admin/upgrade authority and verified ABI.
2. Find and version-pin the official ConfidentialSwap interface and client APIs. Do not invent calldata. Reproduce the reference RFQ creation, market-maker quote, cancellation/refund and settlement flows with test-only assets.
3. Validate supported token pairs and quote/liquidity eligibility separately. The mainnet website's listed cUSDC/cUSDT and other pairs are **not automatically Sepolia guarantees**.
4. Integrate authenticated agent sessions with independent wallet controls. Restrict venue address, selectors, allowed pairs, spending caps, expiry, operator permissions and revocation; agent text never grants authority.
5. Exercise testnet FHE input encryption, ACL, proofs, async settlement and fee/gas handling using a dedicated owner-funded test wallet. Verify negative paths and adversarial cases without ever exporting secret keys.
6. Build a privacy-safe settlement journal and honest portfolio analytics from finalized fills before enabling any strategy execution.

PrigenFi covers broad Ethereum markets (spot, DeFi, staking, stablecoins, emerging tokens and derivatives), but markets without a verified private venue and liquidity must remain research-only. Confidential amounts do not hide all Ethereum metadata.

Review Zama's commercial licensing terms and patent license requirements before launch.
