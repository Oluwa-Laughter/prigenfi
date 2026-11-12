# Wallet-authenticated agent research accounts

PrigenFi lets users instruct independent AI agents to research EVM markets, while keeping wallet authority separate. **This milestone adds real, owner-authenticated research-agent profiles, not automated trading.** Profiles are private application metadata: host label, permitted public research networks and market categories, expiration, and revocation status. They do not store instructions, balances, secrets or private positions; they do not cause any contract deployment or give an agent session keys.

## Operator setup — explicit and fail-closed

This feature requires a **dedicated** secured Postgres database, an operator-approved application origin, a supported testnet chain and a trusted RPC. It intentionally stays unavailable without them; no fake agents, in-memory sessions or fallback database are created. Keep credentials out of Git and never put them in `NEXT_PUBLIC_` variables.

Configure the following **server-only** variables on your host (e.g. Vercel, after creating the dedicated database):

```sh
PRIGENFI_DATABASE_URL=postgres://USER:PASSWORD@HOST/DATABASE?sslmode=require
PRIGENFI_APP_ORIGIN=https://your-production-host.example
PRIGENFI_AUTH_CHAIN_ID=11155111
PRIGENFI_AUTH_RPC_URL=https://your-verified-sepolia-rpc.example
```

`PRIGENFI_APP_ORIGIN` must be the **exact public origin** users load, with HTTPS for non-local hosts. The allowed authentication chains are Ethereum Sepolia (11155111) and isolated Anvil (31337); 31337 is for local development only. The RPC is used to verify **EOA and ERC-1271 smart account** signatures against the selected chain. If a real RPC or database is unavailable, the API refuses privileged operations rather than generating fabricated results. Configure restrictive database roles, encryption in transit, connection limits and an approved backup/rotation plan before using real users.

After securely providing these variables to a trusted operator terminal, run the **explicit** migration:

```sh
pnpm db:agents:migrate
```

The migration creates `prigenfi_auth_challenges`, `prigenfi_auth_sessions` and `prigenfi_research_agents`. It is not triggered by a page load or wallet sign-in. Do **not** reuse another product's existing production database for PrigenFi without review. A local test DB and Anvil are used only for engineering verification.

## Actual owner journey

1. Connect your own wallet, then choose **Sign in with wallet** on `/agents`. This is an EIP-4361 text-signing request, not a transaction or an approval to spend funds.
2. The server issues a random, single-use SIWE nonce tied to the exact origin, account, chain and a five-minute expiry. It rate-limits issuance per account. It never trusts forwarded Host headers to choose an auth domain.
3. The signature is verified by the configured network RPC via viem's public-client verifier. That verifier supports EOA and deployed ERC-1271 smart-account signatures. Challenges are atomically marked used (retained temporarily for issuance rate limiting), including failed signatures, to block replay or concurrent verification.
4. A two-hour opaque, random session token is hashed for database storage, and the browser receives an `HttpOnly`, `SameSite=Strict`, path-rooted cookie (and `Secure` on HTTPS). The token is never sent to an AI agent or copied into localStorage.
5. The user can save and revoke **research profiles** that belong only to their signed-in address and chain. Choose an agent label, host, supported research networks/markets and a one-, seven- or thirty-day expiration. Each profile is returned from the real database; no fake connection counts or historic trading data appear.
6. Revocation changes a real server record, and sign-out deletes the server-side session. Changing the browser's connected wallet or chain hides the account controls until the wallet matches the authenticated session. **Connecting Codex through MCP does not automatically attach it to a saved research profile.**

All state-mutating endpoints require an exact same-origin `Origin` header, strict bounded JSON input and an owner session; agent IDs are unguessable UUIDs but still checked against the owner in the SQL statement. Query text is parameterized and owner lookup never relies on a caller-supplied owner address. The database never returns other owners' profiles, and there is no profile-to-trade-execution endpoint.

## Security limits and next phase

The research-profile registration is **not cryptographic proof that an external host is running**, and the host label is chosen by the user. The profile's network and market scopes are **metadata**, not a firewall installed in Codex/Claude. An AI host cannot take possession of this session cookie through MCP. If a contract-account's EIP-1271 signer changes, its existing web session still lasts until logout or expiry; before enabling any value movement we must add contract-account authorization revalidation / session invalidation. This foundation is **not sufficient** for delegated trading.

A production execution service requires explicit user-signed smart-account policy grants, independently enforced targets/selectors/token permissions/limits, revocation, durable agent jobs, authenticated MCP transport, independently verified Zama confidential settlement per supported pair, transaction reconciliation and incident monitoring. Investment returns are neither generated nor guaranteed.

## Verification

The repository includes a disposable local integration check:

```sh
# Run only with a throwaway PostgreSQL database and local Anvil.
pnpm contracts:build
pnpm db:agents:migrate
# Start local production Next.js server with PRIGENFI_* variables set.
AGENT_AUTH_TEST_URL=http://127.0.0.1:3000 PRIGENFI_AUTH_CHAIN_ID=31337 pnpm test:agent-accounts
```

It rejects non-local test URLs and non-Anvil chain IDs. It actually signs with two unlocked local Anvil test accounts, deploys **only a local test-helper ERC-1271 wallet**, checks nonce replay and forged signatures, two-wallet data isolation, owner-only revocation, logout and strict Origin verification. It produces no screenshots and does not broadcast to Sepolia or mainnet.

Official standards: [ERC-4361 SIWE](https://eips.ethereum.org/EIPS/eip-4361), [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271), [viem account signature validation](https://viem.sh/docs/actions/public/verifyMessage).

## Authenticated MCP connection to a saved profile

Once an operator explicitly enables the separate remote research service, signed-in owners may issue a one-time-visible access key from their saved profile on `/agents`. The key is stored only as a hash, expires in at most 24h, and enables real server-validated public research over Streamable HTTP. Rotating or revoking it—or revoking its parent profile—takes effect before the next MCP request. This remains research-only, not wallet spending approval, and is not OAuth 2.1. See [REMOTE_AGENT_MCP.md](REMOTE_AGENT_MCP.md).

## Hosted research access without cloning

The latest connection desk at `/agents/connect` offers **two separate hosted MCP modes**, not local source installation. When the operator provisions the needed Postgres migrations and explicitly enables `PRIGENFI_PUBLIC_MCP_ENABLED=true`, anonymous public research is exposed at `/api/mcp/public`, with five strictly read-only tools and an atomic shared 60-HTTP-exchanges/minute database quota. This public path is not owner scoped and MUST NOT be used to bypass a wallet owner's denied research profile. The existing `/api/mcp` requires a distinct owner-issued, expiring bearer token and independently checks saved network/market scope. Both are disabled by default, both cannot sign/decrypt/spend, and neither is proof of a connected AI host. The connection UI reports the actual configured endpoint status rather than using a guessed localhost/public URL. Three static instruction-only skills are downloadable at `/skills/index.json`, without repository cloning. See [REMOTE_AGENT_MCP.md](REMOTE_AGENT_MCP.md).

## Owner-authenticated saved public markets

With a configured database and SIWE login, `/api/watchlist` now saves a user's **selected public EVM pair contract address and research chain only**. It rejects unsupported chains, malformed addresses, extra client properties, other-owner access, cross-origin writes and post-logout requests. Its bounded 25-row per-owner set is serialized inside Postgres so parallel writes cannot bypass the cap. `/api/workspace/overview` returns authentic current counts and latest profile/pair records scoped to the active wallet session. The browser independently requires a connected wallet/chain matching the session before rendering the response. Users may save/remove pools from the validated onchain market detail page.

This requires the explicitly applied `0004_owner_market_watchlist.sql` migration after database backup/operator review. The bookmark is research metadata, **not a portfolio**. It is visible to the database operator and must not be treated as private position data or permission to trade. Do not add wallet balances, decrypted values, capital amounts, strategies, public provider prices or agent orders to this table. The existing Fastify API remains public metadata-only and is not a second authenticated backend.

### Saved-market self-service privacy controls — November 12, 2026

The customer `/saved` view lists all signed-in wallet-linked public pool bookmarks. `DELETE /api/watchlist` supports strict `{ "clearAll": true, "confirmation": "CLEAR MY MARKETS" }` only after the same live cookie and exact-Origin checks as other authenticated writes. The backend serializes clear with new saves and returns the actual row count; second clears return zero. An unauthenticated, cross-origin or incorrectly confirmed clear is rejected. Individual removal remains independent of whether DEX Screener is available. Client-side CSV export contains only network, pool address, and saved timestamp; it makes no new provider request and excludes wallet address, private goals and balances. This is **not** a full account-erasure feature: research agent profiles, sessions and hashed MCP credentials are separate records requiring separate controls.
