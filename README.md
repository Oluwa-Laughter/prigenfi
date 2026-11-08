# PrigenFi

**Privacy-preserving DeFi, built for agents and the people who authorize them.**

PrigenFi is building an Ethereum-market agent platform that connects user trading instructions, controlled capital access, DeFi market discovery and privacy-preserving asset infrastructure. Users should be able to direct agents toward any supported Ethereum market—from DeFi and spot markets to staking, stablecoins and emerging tokens—without giving agents unrestricted access to their wallets. **Confidential-only execution is an absolute requirement**, not an optional market feature.

This repository contains a real engineering foundation and a **testnet-only product preview**, not a live autonomous trading service. No mainnet execution, confidential swap venue or investment returns are available.

## What PrigenFi is building

**PrigenFi is a privacy-preserving, agent-native DeFi protocol enabling autonomous AI agents to trade, manage assets, and execute financial strategies across EVM chains using Zama FHE, smart accounts, and MCP.**

A user should be able to **describe a financial goal in plain language, choose the markets and risks they permit, authorize an agent through wallet-controlled rules, and monitor verified outcomes.** An agent should research markets and propose decisions, not require users to deploy Solidity contracts or decipher RFQ terminology. The interface has distinct pages for agents, markets, strategies, portfolio, activity, privacy and settings, with a collapsible desktop sidebar and mobile drawer.

This is the **target product**, not a claim that automated private trading is live today. Private execution is blocked pending actual confidential venue proof, smart-account policy enforcement, user authentication and completed settlement integration. Profit is never guaranteed. **A chain or token being EVM-compatible does not mean Zama FHE supports private trading there.**

## Data and user experience rules

- Public market prices, volumes and liquidity are fetched from a disclosed external source. These are _research signals_, **not** executable private trade quotes; the upstream service can see public search requests.
- Agent win rate, P&L and portfolio performance must be computed only from authenticated, settled user trades. Until there are verified trades, show an unavailable state—not hardcoded balances, winning percentages or demo profit charts.
- Market and strategy categories are selectable **instruction templates**, not live trades or positions. SDK fixtures and local tests are never presented as real investments.
- The consumer UI never requests contract deployments. The isolated public ERC-20 vault is a **developer-only sandbox** reachable from the developer documentation, not the proposed user onboarding or a confidential agent smart account.
- RFQ may be an internal execution adapter among other vetted confidential venues. No RFQ, proxy/UUPS address or deployment diagnostic is needed in the user experience.
- **No screenshot files are produced by browser tests or committed to the docs folder.** Existing screenshot files were removed from the repository's current tree. Browser tests still verify navigation, wallet safety and responsive layout without screenshots/traces.

## Product experience

The public site and user workspace have separate navigation. The workspace sidebar can be collapsed on desktop and opened as a drawer on mobile:

| Route         | Purpose                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| `/`           | Public marketing: what PrigenFi is and how delegated finance works                            |
| `/dashboard`  | Financial command center, public-market charts and honestly unavailable agent results         |
| `/markets`    | Live Ethereum DEX-pair discovery, meme/spot/DeFi/stablecoin research                          |
| `/agents`     | User-defined agent research mandates, ready to copy, not wallet permissions                   |
| `/strategies` | Research-oriented mandate templates: meme, DEX, lending, staking, stablecoins, perps          |
| `/portfolio`  | Connected wallet gas balance and Zama-backed confidential test token tools                    |
| `/privacy`    | User-friendly privacy explanation, supported confidential assets and trade-readiness policy   |
| `/activity`   | Read actual on-chain scoped vault events on the connected supported test network              |
| `/vault`      | **Developer sandbox only**: existing local ERC-20 vault, scoped transfer tests and revocation |
| `/settings`   | Security boundaries and links to wallet controls                                              |
| `/docs`       | Developer/MCP integration instructions, separate from the customer-facing app                 |

## Market data and analytics

The app uses DEX Screener's public Ethereum pair-search API through a rate-cached Next.js route (`/api/markets`). Public market charts summarize 24h pool volume and liquidity **from provider responses**, with explicit timestamps, error states and source links. This feed does not quote executable private trades, and user searches are not confidential.

Agent win rate and realized P&L must come from verified, finalized closed positions with cost basis. The app deliberately displays **no win rate or profits** before such a settlement indexer exists. A tested settlement-summary calculator and conditional chart renderers are in the repository, but no trade journal is yet connected.

## Engineering foundation (separate from user workflows)

- Development-only Solidity owner-controlled isolated ERC-20 vault with agent/token/recipient scope, per-transfer and daily caps, expiry, pause, revocation and owner withdrawals. Users do not deploy this from the product UI.
- Foundry adversarial, fuzz and invariant tests; generated ABIs and verified local Anvil integration.
- Typed policy SDK and stdio MCP tools for scoped reads, simulation-only proposals, confidential capability discovery and strict confidential route assessment. Unsupported trading venues fail closed, with no public fallback.
- Zama's official TypeScript/React SDK for wallet-controlled confidential test assets, including shielding, user-authorized decryption and transfers where supported.
- Testnet-facing labels **cUSDC, cUSDT, cZAMA, cWETH, cBRON, cXAUt and ctGBP** correspond to official, unbacked Zama test wrappers. cZAMA on Sepolia is not the real ZAMA token. Each wrapper is checked against deployed underlying code, decimals and rate before its wallet tools can operate.
- No remote MCP OAuth, durable user agents, settlement indexer, private swap execution, autonomous strategy runner or cross-chain confidential rail yet.

**A natural-language mandate is not financial authorization.** Real agent execution will require independent wallet-level session permissions, venue-specific policy checks, simulation, transaction reconciliation and auditable strategy outcomes. The user must be able to revoke access.

## Confidential market boundary

The common schema in `packages/shared/src/confidential-policy.ts` requires `privacy: "confidential-only"` for all research mandates. A market-specific MCP route-check tool reports execution disabled until a compatible FHE venue and real agent authorization are verified. This does **not** encrypt arbitrary market trades or activate autonomous swaps. Public market discovery is still public and can expose searches to its provider. The instruction composer remains a local, copyable draft; AI-model interpretation, authenticated agent sessions and durable execution are not yet implemented.

## Structured agent proposal validation

External agents can submit structured multi-step research proposals through the local stdio MCP tool agent_plan_evaluate. This validates Sepolia confidential wrapper addresses, portfolio market scope, plan expiry, token-pair constraints, total allocation and slippage. Valid research never grants wallet authority or enables a transaction. The engine does not run an LLM or store private instructions. See docs/AGENT_PLANNING_PROTOCOL.md.

## On-chain confidential venue verification

PrigenFi now has a **read-only inspection** of the official Zama ConfidentialSwap RFQ proxy on Ethereum Sepolia. The registry snapshot at `infra/zama-registry/` is preserved byte-for-byte and checked against Zama's published SHA-256 manifest. The `pnpm verify:swap` command then checks the real chain ID, proxy bytecode, ERC-1967 implementation storage, implementation bytecode and UUPS UUID at a single block, saving a public nonsecret receipt under `docs/evidence/confidential-swap-sepolia.json`. It **does not** create an order, authorize an agent, verify liquidity or enable confidential trading.

The workspace `/privacy` page shows the cached public chain status from a read-only `GET /api/confidential-venue`. It has no user-supplied RPC URL or write route. Even a confirmed proxy is **not** permission to trade: all private execution is disabled until the official RFQ ABI, supported pairs, quote lifecycle, owner permissions, encrypted order proof and settlement are independently verified. The API can return an unavailable state when the public RPC fails.

```sh
pnpm verify:swap:source  # offline, deterministic SHA-256 integrity
pnpm verify:swap         # read-only Sepolia RPC query; no key required
```

See [swap feasibility and next steps](docs/CONFIDENTIAL_SWAP_FEASIBILITY.md).

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

The local deployment is strictly developer tooling and uses unlocked Anvil test identities. Do not use production wallets or commit signing credentials. No public-chain deployment was performed by this frontend refresh.

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

Tests involving Anvil are intentionally skipped unless `LOCAL_INTEGRATION=1` and the local chain is provisioned. Browser tests cover public and application navigation, desktop sidebar collapse/expand, mobile drawer behavior, responsive layouts, market charts with explicitly isolated test-only fixtures, mandate templates and the local vault authority flow. Screenshots and traces are disabled to conserve data and prevent sensitive UI captures.

## Package READMEs

Engineering packages have independent READMEs: [web app](apps/web/README.md), [shared policy and registries](packages/shared/README.md), [typed SDK](packages/sdk/README.md), [Zama wallet adapter](packages/zama/README.md), [local MCP server](services/mcp-server/README.md), [metadata API](services/api/README.md), and [contracts sandbox](contracts/README.md). They distinguish verified functionality from future product work.

## Engineering documentation

See [product direction](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [build status](docs/BUILD_STATUS.md), [next milestones](docs/NEXT_STEPS.md), [Zama integration](docs/ZAMA_INTEGRATION.md), [MCP integration](docs/MCP_INTEGRATION.md), and [security threat model](docs/security/THREAT_MODEL.md). Reviewed development skills and their sources are recorded in [engineering skills](docs/ENGINEERING_SKILLS.md).

PrigenFi is designed to grow into a real product for users and agents, with security and privacy guarantees established through verified infrastructure rather than branding claims.
