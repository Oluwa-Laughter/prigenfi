# Architecture

```mermaid
flowchart LR
  Wallet[User wallet] --> UI[Next.js web app]
  UI --> Vault[AgentVault on Anvil or Sepolia]
  UI --> Zama[Official Zama React SDK]
  Zama --> Wrappers[Official Sepolia ERC-7984 wrappers]
  Agent[External MCP client] --> MCP[Local stdio MCP v2 server]
  MCP --> SDK[PrigenFi SDK]
  SDK --> Reads[Block-consistent public reads and eth_call]
  Reads --> Vault
  Metadata[Fastify metadata API] --> Registry[Shared public asset registry]
```

## Working boundaries

| Component                      | Responsibility                                                                                        | Authority                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `apps/web`                     | Marketing, docs, injected wallet, vault controls, confidential tools                                  | User signs wallet transactions            |
| `contracts/src/AgentVault.sol` | Immutable owner, per-agent/token limits, nonce, recipient, expiry, pause/revoke, withdrawal           | Owner policy; agent's own scoped transfer |
| `VaultFactory.sol`             | Create independent vaults, emitting owner/vault event                                                 | Caller becomes owner                      |
| `MockUSD.sol`                  | Six-decimal local faucet                                                                              | Chain 31337 only, no value                |
| `packages/shared`              | Zod schemas, exact units, chain/asset constants, generated ABI/bytecode                               | Single authoritative definitions          |
| `packages/sdk`                 | Verify vault runtime code, fixed-block policy reads, simulation, ephemeral proposals, recent activity | Read/eth_call only                        |
| `packages/zama`                | Wrapper discovery verification and official SDK facade                                                | User wallet only                          |
| `services/mcp-server`          | Ten tools, fixed operator-configured vault/agent/token, stdio                                         | No signing or execution                   |
| `services/api`                 | Public metadata, health/readiness, rate limits, redacted logs                                         | Loopback, no private endpoints            |

The frontend directly uses the same SDK and on-chain contracts as MCP. The metadata service is optional; it does not pretend to provide authentication or agent persistence. Vault events are the source of ownership and execution truth. Browser receipts are session history; the SDK indexes only the latest 1000 blocks, without a durable reconciler or finality guarantees.

## Vault permission and proposal flow

1. User creates a vault, or loads an existing vault whose runtime code matches the generated artifact with immutable locations masked.
2. User funds it via direct ERC-20 transfer, without approval to a general router.
3. User authorizes an agent/token/recipient tuple with amount caps and expiry.
4. The SDK pins policy and balance reads to one block. Its simulation checks scope, budget, nonce and a five-minute proposal deadline, then calls `executeTransfer` via eth_call.
5. MCP may store an allowed simulation in its bounded process-local session. It never submits it.
6. A connected agent wallet can submit the fixed transfer directly. The vault independently rechecks its policy. No arbitrary target/selector is accepted.

The application has no trade venue, price oracle, quote, swap, signed trade-intent execution, durable queue or autonomous execution runtime. A proposal deadline is off-chain freshness, not an on-chain EIP-712 expiry. Direct Ethereum transactions bind caller, chain and nonce; vault nonces add application replay protection and survive reauthorization.

## Confidential path

The user separately verifies Sepolia wrapper code, underlying code/address, decimals and rate. Zama hooks orchestrate mint (public faucet call), shield, permit authorization, balance decryption, encrypted transfer, unshield and session recovery. Confidential amounts are not in the agent vault policy. The browser keeps separate in-memory SDK/query stores and remounts on account or network change. MCP and API never consume decrypted state.

## Future boundaries

Add an audited ERC-4337/7579 account/session adapter without replacing vault policy. Add SIWE/ERC-1271 authentication, PostgreSQL tenant-scoped persistence, OAuth-protected remote MCP, durable execution reconciliation and vetted testnet venues in subsequent vertical slices. Base and Arbitrum public-token adapters are future capabilities; no FHE support is asserted.

## November 8 frontend and Ethereum-market read model

The Next.js `apps/web/src/app/(marketing)` route group has its own marketing layout; `(workspace)` has its own wallet-aware sidebar and top bar. Customer pages use shared UI and wallet providers without leaking consumer navigation into the public site. `/vault` preserves wallet-owned restricted ERC-20 contract operations; `/portfolio` separates Zama confidential asset tools from public vault scopes; `/activity` reads recent, verified contract events (no profit inference).

`GET /api/markets?q=...` is a public, read-only Next route querying the fixed DEX Screener pair search endpoint, filtering `chainId === ethereum`, validating addresses, and normalizing/slicing public metadata. The client displays data source, cache age and no-execution disclosures; public search terms can reach the provider. It is **not** a risk oracle, account-trading API, or confidential route. Chart components consume normalized pool volume and liquidity figures, not client-generated market prices.

`apps/web/src/lib/performance.ts` computes win rate and realized returns only from an upstream _verified finalized closed-position dataset_. The current app does not have that indexer and intentionally passes no trades to the conditional UI. No synthetic profit numbers appear on user pages. Performance fixtures exist in unit tests only.

## Confidential-only research vs. execution gate

`packages/shared/src/index.ts` now contains seven official Zama Sepolia unbacked test wrapper addresses, their actual technical `Mock` identifiers, consumer display labels, underlying tokens and test flags. `packages/zama` verifies wrapper and underlying code, exchange `rate` and decimals at the active chain block before unlocking wallet-scoped operations. Do not hardcode all tokens to 6 underlying decimals: cZAMA, cWETH and some other wrappers differ.

`packages/shared/src/confidential-policy.ts` owns a typed per-market draft schema with `privacy: confidential-only` as a literal invariant. `assessConfidentialTrade` currently returns `executionAllowed=false` for every market because no verified encrypted trading venue or authenticated agent execution service is connected. Both new read-only local stdio MCP tools (`confidential_capabilities_get`, `confidential_route_check`) expose the same policy without storing private instructions or signing transactions. Existing public ERC-20 vault test transfers, simulations and proposals are unrelated to private trade execution and MUST NOT be used as a fallback.

Target flow: authenticated wallet/user → optional private agent reasoning → typed private mandate → supported protocol/market compatibility proof → encrypted testnet trade simulation → on-chain authorized agent policy → independently verified confidential settlement → privacy-safe indexer → verified analytics. A public Ethereum market-data provider is a separate research input and may observe queries. It is not an FHE execution channel. The user's instructions stay local in the current implementation; this is not an operational AI trading agent yet.

## Zama ConfidentialSwap read-only verification boundary — November 8, 2026

The source-of-truth registry under `infra/zama-registry` is an upstream, unchanged `testnet.json` plus `manifest.json`; the tracked JSON is intentionally excluded from Prettier so the official SHA-256 remains reproducible. `scripts/verify-confidential-swap.ts` verifies the manifest digest and exact Sepolia registry identity before consulting JSON-RPC. The shared pure `inspectZamaSwapVenue` reader snapshots chain ID, block number, proxy code, ERC-1967 implementation storage, implementation code and the standard UUPS `proxiableUUID()`. All external calls are read-only and pinned to one block.

`GET /api/confidential-venue` uses a server-controlled Sepolia RPC and a four-minute server cache. The browser `/privacy` surface displays the read model but has no interaction that can sign, decrypt, quote or send a trade. Read errors return a redacted blocked status (no RPC URL leaked). On-chain proxy/UUPS presence and even bytecode hashes do **not** prove any pair liquidity or FHE/private-order compatibility. All agent and confidential trading policy gates remain unchanged and false.

## Shared EVM market-data and MCP agent reasoning — November 9, 2026

The new `@prigenfi/shared/market-research` module is a fail-closed public research boundary. The web `/api/markets?chain=...&q=...` and local MCP `market_search` and `market_pair_lookup` invoke the same bounded DEX Screener adapter. It checks an explicit EVM research chain list, validates token and pair addresses, restricts public token symbols/address searches, retains source and fetch timestamp, and does not mix data from other chains. Exact token addresses use the per-chain token-pairs endpoint; globally ranked symbol searches can return no results for an otherwise active chain. No synthetic data fills the gap. Every returned pair has `privateTradingAvailable:false`.

A connected MCP host may use `interpret_private_defi_goal` to have its **own model** interpret a voluntarily shared user goal. Before issuing public market reads, it can submit its chosen network, token and domain through `agent_market_research_check`, which checks against caller-provided research constraints, rejects stale steps and returns minimal nonsecret reason codes. This is not owner-signed authority and does not persist a session. Actual private execution will require verified FHE-aware EVM venue contracts, owner authentication, audited smart-account permissions, limited session keys, deterministic risk guards and finalized settlement reconciliations.

Anvil-only ERC-20 vault read/simulate tools are conditionally registered on local-chain 31337; ordinary MCP clients cannot see or call them. There is no transaction submission path in the normal MCP interface.

## Agent connection layers — November 9, 2026

`services/mcp-server/src/research-stdio.ts` is the default local, read-only MCP transport. It directly creates `createMcpServer()` without a vault client; it cannot expose local developer-transfer tools, regardless of inherited RPC/vault environment settings. Only explicitly running `pnpm mcp:dev` and configuring an Anvil chain-31337 test client exposes test transfer simulations. `scripts/agent-connect-config.ts` generates platform-local absolute-node Codex TOML and Claude JSON entries without secrets. `scripts/agent-connect.ts` tests the actual protocol through `@modelcontextprotocol/client`, verifies nine research tools, the interpretation prompt, and the blocked execution status, and can write ignored local host fragments. No remote server, OAuth grants, or wallet session is established. The Next.js `/agents/connect` page offers instructions and copy controls, not a counterfeit connection status.

## Authenticated wallet and research profile service — November 11, 2026

A fixed `PRIGENFI_APP_ORIGIN` and configured Sepolia RPC define the only accepted EIP-4361 origin/domain/chain. The `POST /api/auth/challenge` route generates a cryptographic nonce stored by SHA-256, limits issuance by account and persists only a hash of the SIWE message. `POST /api/auth/verify` atomically marks the nonce used, retaining issuance records for rate limiting, compares the message hash, checks time/domain/chain and verifies the signature on the configured chain with viem public-client `verifyMessage`, which can resolve ERC-1271 smart accounts. An opaque random two-hour token is stored **hashed** in Postgres and delivered as a Secure (for HTTPS), HttpOnly, Strict SameSite cookie. API writes enforce exact Origin and a live session. `/api/agents` uses per-owner, per-chain SQL scope for creating/listing/revoking records and enforces research-network/market schema and bounded expiry. `infra/migrations/0001_agent_research_accounts.sql` is operator-applied, never auto-run from a web request. No encryption keys, private strategy instructions, fake holdings, wallet authorization or financial transaction endpoints are present.

The durable research profile record is an **application control plane**, not evidence of a connected MCP agent or value-moving authority. A future independent signed smart-account policy and authenticated OAuth-protected MCP runtime must bridge these boundaries. EIP-1271 signer-change invalidation and server-side session revocation policy still require hardening before value-moving features. More: `docs/AGENT_ACCOUNTS.md`.

## Wallet-scoped remote MCP — November 11, 2026

`infra/migrations/0002_agent_mcp_keys.sql` persists hashed, per-profile short-lived bearer credentials (never the token itself). The authenticated owner controls issuing/rotating/revoking keys via `/api/agents/[id]/access-key`. Only when explicitly opted in, `/api/mcp` uses the official MCP SDK's per-request Streamable HTTP handler to expose four **read-only, scope-checked** research tools and a host-facing natural-language interpretation prompt. The API checks the exact Host and supplied Origin, token/profile status, chain and atomic 30-per-minute budget against Postgres before building an MCP server. Every public token/pair lookup verifies both persisted chain and market domain. No value-moving or private decryption code path exists. There is no remote OAuth provider yet; this is a restricted developer preview, not a production authorization claim. See `docs/REMOTE_AGENT_MCP.md`.

## Market-integrity and upgrade-governance boundaries — November 11, 2026

One shared market-integrity module analyzes bounded, identity-checked real DEX Screener observations. The Next.js `/markets` page and stdio/HTTP MCP research endpoints use the same deterministic rules. The wallet-scoped HTTP risk tool first verifies stored owner scope for both EVM research network and market category; upstream provider text is untrusted, and `fetchedAt` is retrieval time rather than authenticated quote time. The screen never signs or submits an order.

The separate OpenZeppelin `AgentSafetyPolicy` uses UUPS/ERC-1967 and ERC-7201 namespaced storage with implementation initializer locking, two-step owner governance, codehash-pinned 48h upgrade scheduling and 7d window. Its `executionAllowed` stays false; no financial custody, swap execution, MCP authority or `AgentVault` integration exists. The vault created by `VaultFactory` is direct-deployed and immutable-owner (not upgradeable). See `docs/SECURITY_AND_UPGRADES.md`.

## Hosted no-clone MCP + crypto-only product catalog — November 11, 2026

The Next.js site now distributes three static instruction-only SKILL.md files and `/skills/index.json` for agent hosts. `GET /api/mcp/connect` reports operator-enabled public/owner-scoped MCP endpoints without echoing private configuration. A new strictly optional `POST /api/mcp/public` exposes five read-only public EVM research/capability tools through the official MCP handler. Each HTTP exchange consumes an **atomic 60/minute global shared Postgres budget** created via migration `0003_public_research_mcp_quota.sql`; missing config/database/quota fails closed, and all financial tools are absent. This is not a substitute for WAF, OAuth on user-scoped remote access or a session-granted smart account.

The earlier authenticated `/api/mcp` continues to use wallet-owned, revocable per-profile bearer credentials, persisted scopes, and per-key quotas. Public access must never bypass a wallet profile's denied scope: they are different trust levels. The local stdio MCP remains a maintainer path only, and the user-facing connection guide is now hosted-first.

The active PrigenFi confidential asset allowlist is the crypto-only cUSDC/cUSDT/cZAMA/cWETH set of **unbacked Sepolia test wrappers**, not the full historically verified seven-wrapper source registry. The three other historical reference wrappers are not active UI, MCP capabilities, or agent planning assets. This intentionally narrows product scope without falsifying the archived upstream/source verification evidence.

## Real owner-backed saved research — November 11, 2026

The core application **already has a backend**, separate from the metadata Fastify service:

- `apps/web/src/app/api/auth/*` and `apps/web/src/app/api/agents/*`: owner-signed SIWE/EOA/ERC-1271 identity and PostgreSQL research-agent profile CRUD.
- `apps/web/src/app/api/watchlist`: signed-in wallet-only GET/POST/DELETE for **public** `{chain,pairAddress}` market bookmarks. All writes require the configured exact Origin and known EVM research network; identifiers are lowercased in the database; duplicate saves are idempotent. A PostgreSQL advisory transaction lock prevents racing past 25 entries. Revocation/logout eliminates access immediately when sessions are invalidated.
- `apps/web/src/app/api/workspace/overview`: signed-in owner-only aggregate of live/revoked/expiring research profiles plus the newest five saved public pools and actual saved count. Counts and lists derive from PostgreSQL, never fabricated. Every lookup is constrained by current authenticated owner address and account chain. No user may set an owner address in request JSON.
- `apps/web/src/app/(workspace)/markets/pair/[chain]/[pairAddress]`: validated, read-only pool detail from the shared untrusted DEX Screener adapter and deterministic risk policy, with a wallet-gated Save/Remove control. No trade quote, execution or permission mutation is available.

`infra/migrations/0004_owner_market_watchlist.sql` introduces the single new owner-scoped table with network/address validation and unique key; it must be **applied explicitly** in the target PostgreSQL before using the new API, and only after operator review and backups for any production database. No positions, strategies, confidential balances, wallet seeds or user-token data are written there. Saving a public pool does reveal which pool an account is researching to the PrigenFi backend and is not confidential activity. A public third-party data service sees only the pool identifier/network of the query and never user cookies, wallet session, private amounts or strategy text.

The independent Fastify `services/api` remains a small **public metadata-only** service: health/readiness and active crypto test asset metadata, with rate limits and redacted logs. It neither owns account sessions nor serves profitable trades, real portfolios, financial execution or private MCP. This separation is deliberate; duplicating identity and persistence into Fastify without a secure federation would weaken the boundary.

Navigation UX uses a native focus-managed `<dialog>` to jump to existing customer pages via keyboard `Ctrl/⌘ + K`; all paths are statically declared, not arbitrary links or public-provider text. The new owner dashboard immediately clears saved records when its connected wallet or chain no longer matches the authenticated cookie.
