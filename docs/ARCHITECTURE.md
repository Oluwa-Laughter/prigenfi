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
