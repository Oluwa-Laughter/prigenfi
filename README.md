# PrigenFi

**Private finance. Powered by agents.**

PrigenFi gives people explicit control over agent-managed capital and gives developers typed financial tools through MCP. This repository contains the first testnet engineering slice: an isolated vault, on-chain spending permissions, public portfolio reads, simulation-only agent proposals, and wallet-controlled confidential token interfaces using Zama.

**Development release. No real funds. No mainnet execution. No confidential swap integration.**

## Start

Use Node 22+, pnpm 10.34.6 and Foundry 1.8.1.

```sh
pnpm install --frozen-lockfile
pnpm contracts:build
pnpm build
pnpm dev
```

Open `http://localhost:3000`: `/` is the public product site, `/dashboard` is the injected-wallet workspace, and `/docs` explains local developer integration. The dashboard is wallet-connected; backend session authentication is not implemented.

For the complete local vault slice:

```sh
# Terminal 1: anvil --silent
pnpm local:deploy
LOCAL_INTEGRATION=1 pnpm test
```

The deploy command uses unlocked Anvil accounts on chain 31337 and prints only public addresses. Load its vault, token, agent and recipient in the dashboard. The owner can authorize, pause and revoke; only the agent's connected wallet can execute its allowed ERC-20 transfer. Mainnet contract creation and agent execution revert.

## What is implemented

- Owner-controlled isolated ERC-20 vaults: fixed transfer selector, token and recipient scope, per-operation and UTC-day spending caps, expiry, monotonic nonces, revoke, pause and owner-only withdrawals.
- Generated authoritative ABIs/bytecode, runtime vault verification, exact bigint units, one-block policy snapshots, real eth_call simulation and bounded ephemeral proposal sessions.
- Ten official MCP v2 tools over stdio, with an external client smoke/integration test. No signing or execution tools.
- Next.js marketing, developer docs, dark/light theme and wallet dashboard with tested responsive states and actual local chain transactions.
- Official Zama SDK/React SDK 3.7.1 adapters and wallet flows for mint, shield, opt-in decryption, confidential transfer and unshield. Sepolia wrapper metadata was verified by RPC; real confidential writes still require a dedicated funded test wallet and end-to-end verification.
- Fastify public metadata API with health/readiness, rate limits and redacted logging. No private data API or persistence.

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:contracts
pnpm test
pnpm build
pnpm exec playwright install chromium
LOCAL_INTEGRATION=1 pnpm test:browser
pnpm verify:zama
```

`pnpm test` without local integration skips Anvil-dependent tests. Browser integration requires a fresh local deployment. CI runs them with Anvil. No test here proves production readiness or an audit.

## Documentation

- [Engineering handoff report](docs/ENGINEERING_REPORT.md)
- [Current build status](docs/BUILD_STATUS.md) and [next steps](docs/NEXT_STEPS.md)
- [Product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md)
- [Development](docs/DEVELOPMENT.md) and [testnet deployment](docs/TESTNET_DEPLOYMENT.md)
- [Zama integration](docs/ZAMA_INTEGRATION.md) and [MCP integration](docs/MCP_INTEGRATION.md)
- [Security](docs/SECURITY.md), [threat model](docs/security/THREAT_MODEL.md), [review](docs/security/REVIEW.md)
- [Reviewed engineering skills](docs/ENGINEERING_SKILLS.md)

ERC-4337/7579 accounts, remote OAuth MCP, SIWE sessions, PostgreSQL persistence, durable execution workers, confidential agent spending, market-data providers and real trading adapters remain future milestones. Base and Arbitrum confidentiality is not assumed.
