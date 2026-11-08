# PrigenFi

**Private finance. Powered by agents.**

PrigenFi is building an Ethereum-market agent platform that connects user trading instructions, controlled capital access, DeFi market discovery and privacy-preserving asset infrastructure. Users should be able to direct agents toward Ethereum spot pairs, meme coins, lending, staking and other supported DeFi markets without giving agents unrestricted access to their wallets.

This repository contains a real engineering foundation and a **testnet-only product preview**, not a live autonomous trading service. No mainnet execution, confidential swap venue or investment returns are available.

## Product experience

The public site and app now have separate layouts and navigation:

| Route         | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `/`           | Public marketing: what PrigenFi is and how delegated finance works                       |
| `/dashboard`  | Financial command center, public-market charts and honestly unavailable agent results    |
| `/markets`    | Live Ethereum DEX-pair discovery, meme/spot/DeFi/stablecoin research                     |
| `/agents`     | User-defined agent research mandates, ready to copy, not wallet permissions              |
| `/strategies` | Research-oriented mandate templates: meme, DEX, lending, staking, stablecoins, perps     |
| `/portfolio`  | Connected wallet gas balance and Zama-backed confidential test token tools               |
| `/activity`   | Read actual on-chain scoped vault events on the connected supported test network         |
| `/vault`      | Isolated testnet vault, agent permissions, simulation, pause/revoke and owner withdrawal |
| `/settings`   | Security boundaries and links to wallet controls                                         |
| `/docs`       | Developer/MCP integration instructions, separate from the customer-facing app            |

## Market data and analytics

The app uses DEX Screener's public Ethereum pair-search API through a rate-cached Next.js route (`/api/markets`). Public market charts summarize 24h pool volume and liquidity **from provider responses**, with explicit timestamps, error states and source links. This feed does not quote executable private trades, and user searches are not confidential.

Agent win rate and realized P&L must come from verified, finalized closed positions with cost basis. The app deliberately displays **no win rate or profits** before such a settlement indexer exists. A tested settlement-summary calculator and conditional chart renderers are in the repository, but no trade journal is yet connected.

## Existing execution foundation

- Solidity owner-controlled isolated ERC-20 vault with agent/token/recipient scope, per-transfer and daily caps, expiry, pause, revocation and owner withdrawals.
- Foundry adversarial, fuzz and invariant tests; generated ABIs and verified local Anvil integration.
- Typed policy SDK and stdio MCP v2 tools for scoped reads and simulation-only proposals.
- Zama's official TypeScript/React SDK for wallet-controlled confidential test assets, including shielding, user-authorized decryption and transfers where supported.
- Testnet-facing labels **cUSD** and **cUSDT** correspond to Zama's **unbacked test wrappers** (technical symbols cUSDCMock/cUSDTMock); they are not dollar-backed stablecoins.
- No remote MCP OAuth, durable user agents, settlement indexer, private swap execution, autonomous strategy runner or cross-chain confidential rail yet.

**A natural-language mandate is not financial authorization.** Real agent execution will require independent wallet-level session permissions, venue-specific policy checks, simulation, transaction reconciliation and auditable strategy outcomes. The user must be able to revoke access.

## Run locally

Node.js 22+, pnpm 10.34.6 and Foundry are required.

```sh
pnpm install --frozen-lockfile
pnpm contracts:build
pnpm build
pnpm dev
```

For local vault integration:

```sh
# In another terminal: anvil --silent
pnpm local:deploy
LOCAL_INTEGRATION=1 pnpm test
LOCAL_INTEGRATION=1 pnpm test:browser
```

The local deployment uses unlocked Anvil test identities. Do not use production wallets or commit signing credentials. No public-chain deployment was performed by this frontend refresh.

## Engineering checks

```sh
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm test:contracts
pnpm build
pnpm test:browser
```

Tests involving Anvil are intentionally skipped unless `LOCAL_INTEGRATION=1` and the local chain is provisioned. Browser tests cover the public and application navigation, desktop/mobile layouts, market charts with explicit test-only API fixtures, mandate templates, and the local vault authority flow.

## Engineering documentation

See [product direction](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [build status](docs/BUILD_STATUS.md), [next milestones](docs/NEXT_STEPS.md), [Zama integration](docs/ZAMA_INTEGRATION.md), [MCP integration](docs/MCP_INTEGRATION.md), and [security threat model](docs/security/THREAT_MODEL.md). Reviewed development skills and their sources are recorded in [engineering skills](docs/ENGINEERING_SKILLS.md).

PrigenFi is designed to grow into a real product for users and agents, with security and privacy guarantees established through verified infrastructure rather than branding claims.
