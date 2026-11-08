# Zama official confidential swap: integration feasibility

The generated [Zama Sepolia registry](https://github.com/zama-ai/protocol-registry/blob/main/testnet.md) lists a **ConfidentialSwap RFQ proxy** on Ethereum Sepolia (chain ID 11155111):

**0xab86445f72A64A99C8d248dcE004915B45C88e20**

Zama describes an on-chain blind RFQ auction for confidential-token pairs at [Confidential Swap](https://www.zama.org/confidential-swap). This is an existing protocol candidate, not an integrated PrigenFi exchange.

## Verification status

Official registry discovery only. We have **not** independently verified proxy implementation code, contract ABI, supported Sepolia pairs, active liquidity, token operators, FHE proofs, order/quote lifecycle, user eligibility, transaction settlement or refund mechanisms. Existing code therefore keeps all private-agent trade execution disabled.

## Engineering checklist

1. Pin Zama's generated registry JSON, manifest and source commit. Independently verify the Sepolia proxy's current on-chain bytecode, UUPS implementation slot, admin/upgrade authority and verified ABI.
2. Find and version-pin the official ConfidentialSwap interface and client APIs. Do not invent calldata. Reproduce the reference RFQ creation, market-maker quote, cancellation/refund and settlement flows with test-only assets.
3. Validate supported token pairs and quote/liquidity eligibility separately. The mainnet website's listed cUSDC/cUSDT and other pairs are **not automatically Sepolia guarantees**.
4. Integrate authenticated agent sessions with independent wallet controls. Restrict venue address, selectors, allowed pairs, spending caps, expiry, operator permissions and revocation; agent text never grants authority.
5. Exercise testnet FHE input encryption, ACL, proofs, async settlement and fee/gas handling using a dedicated owner-funded test wallet. Verify negative paths and adversarial cases without ever exporting secret keys.
6. Build a privacy-safe settlement journal and honest portfolio analytics from finalized fills before enabling any strategy execution.

PrigenFi covers broad Ethereum markets (spot, DeFi, staking, stablecoins, emerging tokens and derivatives), but markets without a verified private venue and liquidity must remain research-only. Confidential amounts do not hide all Ethereum metadata.

Review Zama's commercial licensing terms and patent license requirements before launch.
