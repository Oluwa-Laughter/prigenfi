# PrigenFi

**Privacy-preserving DeFi, built for agents and the people who authorize them.**

PrigenFi is building an EVM-market agent platform that connects user trading instructions, controlled capital access, DeFi market discovery and privacy-preserving asset infrastructure. Users should be able to direct agents toward any supported Ethereum market—from DeFi and spot markets to staking, stablecoins and emerging tokens—without giving agents unrestricted access to their wallets. **Confidential-only execution is an absolute requirement**, not an optional market feature.

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

| Route             | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `/`               | Public marketing: what PrigenFi is and how delegated finance works                            |
| `/dashboard`      | Financial command center, public-market charts and honestly unavailable agent results         |
| `/markets`        | Live, source-labeled research across selected EVM networks; never a private-trading quote     |
| `/agents`         | User-defined agent research mandates, ready to copy, not wallet permissions                   |
| `/agents/connect` | Real local MCP connection guide for Codex, Claude Desktop and developers; no wallet grants    |
| `/strategies`     | Research-oriented mandate templates: meme, DEX, lending, staking, stablecoins, perps          |
| `/portfolio`      | Connected wallet gas balance and Zama-backed confidential test token tools                    |
| `/privacy`        | User-friendly privacy explanation, supported confidential assets and trade-readiness policy   |
| `/activity`       | Read actual on-chain scoped vault events on the connected supported test network              |
| `/vault`          | **Developer sandbox only**: existing local ERC-20 vault, scoped transfer tests and revocation |
| `/settings`       | Security boundaries and links to wallet controls                                              |
| `/docs`           | Developer/MCP integration instructions, separate from the customer-facing app                 |

## Agent integration and source boundaries

`pnpm mcp` starts an existing local stdio MCP server. A connected agent host can retrieve the `interpret_private_defi_goal` prompt, provide its own model reasoning, verify scope with `agent_market_research_check`, search public network data using `market_search`, inspect a specific pool with `market_pair_lookup`, and submit model-authored research plans to fail-closed validators. No model provider API keys or hosting secrets are bundled into this repo. **Do not assume merely connecting MCP enables a signed trade.** Local Anvil-only public ERC-20 vault simulation tools are hidden from ordinary MCP sessions and cannot be mistaken for actual trading. See [MCP integration](docs/MCP_INTEGRATION.md).

An owner has **not** signed an authenticated session or authorized fund movement through these research tools. Private agent strategies, smart account restrictions, on-chain FHE transactions and realized returns remain upcoming engineering work. Users can lose capital when those capabilities eventually become available; PrigenFi does not promise profit.

### Connect an existing AI host

Run `pnpm agent:connect --check` to verify the actual local MCP stdio handshake, **eight consumer research tools**, the host-facing agent prompt and a locked execution boundary. Use `pnpm agent:connect --write` to generate nonsecret Codex and Claude Desktop configuration fragments under ignored `.local/agent-connection/`. You can also print them with `--print codex` or `--print claude`. **The checker does not register or authenticate a remote/user agent**. The consumer default `pnpm mcp` uses a dedicated research-only server that cannot enable developer vault tools from inherited environment settings; local Anvil simulations require explicit `pnpm mcp:dev`. The `/agents/connect` page and [agent connection documentation](docs/AGENT_CONNECTION.md) explain the actual host setup.

## Wallet-authenticated agent research accounts

The `/agents` page now includes **real server-backed registration** for research-only agent profiles when the operator has configured a dedicated Postgres database, a fixed application origin and a trusted Sepolia RPC, then explicitly run `pnpm db:agents:migrate`. Wallet owners sign in with a single-use **EIP-4361 SIWE** challenge; server verification supports EOAs and **ERC-1271** contract accounts. Sessions are time-limited, stored using hashed opaque tokens and managed through secure HttpOnly cookies. Users can save scoped research networks/markets, choose a host name and revoke or expire profiles; results come from database rows, not fake agents or simulated portfolios. **A saved profile does not connect a running MCP agent or grant smart-account spending rights.** The UI shows an unavailable state if the database is not configured. See [wallet-authenticated agent accounts](docs/AGENT_ACCOUNTS.md). Local Anvil + PostgreSQL integration tests verify owner isolation, signatures, nonce replay rejection and revocation without real transactions.

## Market data and analytics

The app and local MCP server use the **same bounded DEX Screener public-data adapter**. The `/api/markets` endpoint accepts only an allowlisted `chain` and token symbol/pair or EVM token contract address. Public **Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain** research is available; contract-address queries use the actual chain-specific provider endpoint instead of inventing missing symbol results. Pair addresses, prices and metrics come only from current provider responses, each with network, source and observation time; invalid values are dropped. No balances, user instruction text or private keys are sent. A public symbol search can return no results because the provider returns a limited global slice. These observations are **not** trade quotes, wallet balances, token safety attestations or confidentiality guarantees.

Agent win rate and realized P&L must come from verified, finalized closed positions with cost basis. The app deliberately displays **no win rate or profits** before such a settlement indexer exists. A tested settlement-summary calculator and conditional chart renderers are in the repository, but no trade journal is yet connected.

## Engineering foundation (separate from user workflows)

- Development-only Solidity owner-controlled isolated ERC-20 vault with agent/token/recipient scope, per-transfer and daily caps, expiry, pause, revocation and owner withdrawals. Users do not deploy this from the product UI.
- Foundry adversarial, fuzz and invariant tests; generated ABIs and verified local Anvil integration.
- Typed policy SDK and stdio MCP tools for scoped reads, simulation-only proposals, confidential capability discovery and strict confidential route assessment. Unsupported trading venues fail closed, with no public fallback.
- Zama's official TypeScript/React SDK for wallet-controlled confidential test assets, including shielding, user-authorized decryption and transfers where supported.
- Testnet-facing labels **cUSDC, cUSDT, cZAMA, cWETH, cBRON, cXAUt and ctGBP** correspond to official, unbacked Zama test wrappers. cZAMA on Sepolia is not the real ZAMA token. Each wrapper is checked against deployed underlying code, decimals and rate before its wallet tools can operate.
- No remote MCP OAuth, authenticated external agent sessions, settlement indexer, private swap execution, autonomous strategy runner or cross-chain confidential rail yet. Wallet sign-in protects profile metadata only.

**A natural-language mandate is not financial authorization.** Real agent execution will require independent wallet-level session permissions, venue-specific policy checks, simulation, transaction reconciliation and auditable strategy outcomes. The user must be able to revoke access.

## Confidential market boundary

The common schema in `packages/shared/src/confidential-policy.ts` requires `privacy: "confidential-only"` for all research mandates. The MCP server now offers the `interpret_private_defi_goal` prompt to a **connected external AI host** (that host—not PrigenFi's website—uses an LLM to interpret text the user explicitly shares). It can call `agent_market_research_check` to constrain network, market and symbol query before `market_search` / `market_pair_lookup` returns real public observations. The separate `agent_plan_evaluate` checks typed Sepolia confidential-wrapper research steps. Tool outputs never grant owner authority. Private execution, authenticated sessions and durable agent positions are still not implemented; no LLM prompt can bypass that restriction.

## Structured agent proposal validation

External agents can submit structured multi-step research proposals through the local stdio MCP tool agent_plan_evaluate. This validates Sepolia confidential wrapper addresses, portfolio market scope, plan expiry, token-pair constraints, total allocation and slippage. Valid research never grants wallet authority or enables a transaction. The engine does not run an LLM or store private instructions. See docs/AGENT_PLANNING_PROTOCOL.md.

## On-chain confidential venue verification

PrigenFi now has a **read-only inspection** of the official Zama ConfidentialSwap RFQ proxy on Ethereum Sepolia. The registry snapshot at `infra/zama-registry/` is preserved byte-for-byte and checked against Zama's published SHA-256 manifest. The `pnpm verify:swap` command then checks the real chain ID, proxy bytecode, ERC-1967 implementation storage, implementation bytecode and UUPS UUID at a single block, saving a public nonsecret receipt under `docs/evidence/confidential-swap-sepolia.json`. It **does not** create an order, authorize an agent, verify liquidity or enable confidential trading.

The developer-only read-only `GET /api/confidential-venue` API can inspect public chain status; the customer `/privacy` page intentionally does **not** display RFQ, contract deployment or proxy diagnostics. It has no user-supplied RPC URL or write route. Even a confirmed proxy is **not** permission to trade: all private execution is disabled until the official RFQ ABI, supported pairs, quote lifecycle, owner permissions, encrypted order proof and settlement are independently verified. The API can return an unavailable state when the public RPC fails.

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

## Wallet-scoped remote MCP research preview

The hosted `/agents` page can now issue a **24-hour, single-use-display research access key** for an authenticated wallet-owned profile, provided an operator has configured a dedicated PostgreSQL database, exact HTTPS origin, approved RPC, applied both explicit migrations and opted into `PRIGENFI_MCP_HTTP_ENABLED=true`. An authenticated MCP client can then connect to `/api/mcp` using a bearer from its environment. Each tool call is checked against live token/profile expiry, revocation, the owner's selected EVM research networks and selected market categories, with 30 requests/minute. The token grants **public research only**; there are no trading, private balance or wallet-signing tools. Codex registration uses a separate name (`prigenfi-profile`) and does not alter the existing local `prigenfi` stdio connection. See [remote MCP integration](docs/REMOTE_AGENT_MCP.md). **This service-token preview is not OAuth 2.1 and is OFF until explicitly enabled; do not enable general public access before completing OAuth and security review.**
