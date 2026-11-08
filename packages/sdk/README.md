# @prigenfi/sdk

The typed PrigenFi integration layer reads a configured public vault, checks spending policies and performs simulation-only proposals against the existing local ERC-20 development vault. Local test-only transfers are **not** private DeFi trades.

The target architecture is **AI research → typed proposal → owner-authorized smart-account policy → verified confidential venue → finalized settlement → trustworthy analytics**. No part of this SDK may treat natural-language instructions, a model decision or MCP identity as authorization to move funds. RPC reads must be chain- and block-consistent; reject expired or overspent intents and replayed nonces.

Do not turn this into an unrestricted generic contract-call engine. No production session module, ERC-4337 deployment or mainnet settlement should be claimed until independently verified.

Run repository `pnpm test`, `pnpm typecheck` and `pnpm build`; local vault integration requires an isolated Anvil deployment.
