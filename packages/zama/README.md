# @prigenfi/zama

Zama FHE wallet integration for **supported official Sepolia test wrappers**, including cUSDC, cUSDT, cZAMA, cWETH and other verified assets. Product display names omit upstream test-contract suffixes, while technical identifiers remain accurate. These wrappers are unbacked test assets; the cZAMA test underlying is not the real ZAMA token.

Use the maintained `@zama-fhe/sdk` and `@zama-fhe/react-sdk` APIs. Verify chain, bytecode, underlying, decimals and rate at runtime. Decryption requires a user action and correct permissions; never send private values or keys to MCP, market research, logs or analytics.

FHE protects supported encrypted values, **not all Ethereum metadata**. Public searches, wallet addresses and transaction timing can remain visible. Private execution for arbitrary ERC-20s/EVM chains does not exist by default. Do not conflate RFQ proxy discovery with a live private swap.

Run `pnpm verify:zama` for public read-only registry evidence and repository tests. A separately authorized and funded testnet wallet is required for actual encrypted transaction proofs.
