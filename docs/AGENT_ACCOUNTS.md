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

The research-profile registration is **not cryptographic proof that an external host is running**, and the host label is chosen by the user. The profile's network and market scopes are **metadata**, not a firewall installed in Codex/Claude. An AI host cannot take possession of this session cookie through MCP. ERC-1271 smart-wallet signatures are now revalidated against current onchain authority for each protected web/MCP request; invalidation revokes stale web sessions and linked research keys, as documented in the November 13 section below. This foundation is **not sufficient** for delegated trading.

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

## Live ERC-1271 signer-rotation revalidation — November 13, 2026

Smart-account signatures are **dynamic**: a successful ERC-1271 SIWE sign-in is not proof that the original signer remains authorized two hours later. The account-control plane now checks the original contract-account authentication signature with the chain's **current** `isValidSignature` result before returning a live browser owner and before authorizing a hosted wallet-scoped MCP research bearer. If the contract no longer accepts the signature, the service atomically invalidates that owner's existing ERC-1271 sessions and revokes all associated hosted research credentials. A new authorized signer can sign in again; an old signer cannot regain access. The browser displays the ordinary signed-out state when authorization has changed. RPC failures and wrong-chain responses fail closed (503), not as a cached approved session. This adds **no wallet spending, transaction signing, ERC-7579 module or confidential trade execution**.

### Explicit operator migration and encryption key

Apply **`infra/migrations/0005_erc1271_session_authority.sql`** intentionally, only after backing up the database and preparing users for reauthentication. The migration _invalidates all pre-migration web sessions and revokes previously issued read-only hosted MCP keys_, because their signer-authorization lineage was not recorded. It adds `auth_kind` and encrypted signature-proof storage to browser sessions, and `auth_kind`/`auth_session_hash` lineage to MCP keys; it never automatically migrates legacy sessions into the less restrictive EOA category. The migration is idempotent and the migrator verifies the new columns.

Provision a **random 32-byte `PRIGENFI_AUTH_PROOF_KEY` as 64 hex characters** in your trusted server-only secret manager. It must be set on every Next.js instance in one environment. Never commit, log, put into `NEXT_PUBLIC_*`, or reuse another application's encryption key. For local disposable test runs only, an operator can set `export PRIGENFI_AUTH_PROOF_KEY="$(openssl rand -hex 32)"` before starting Next.js. If missing or malformed, ERC-1271 session creation and validation fail closed. Changing or losing this key prevents decrypting old proofs and requires affected smart-wallet owners to reauthenticate and reissue research keys. Keep the key available to every active instance through an approved rotation plan; it does not contain or grant wallet private keys.

A successful ERC-1271 login stores only an opaque cookie-token hash plus the user's session-specific signed SIWE message and signature **encrypted at rest with AES-256-GCM**, a unique random IV, and authenticated associated data binding owner address, authentication chain and hashed session token. The ciphertext is not reversible without the separate server key. No plaintext signature or SIWE message is returned by the session API, written to logs, sent to MCP, or stored unencrypted in Postgres. This signature is an authentication credential, **not a transaction approval**, but must still be protected as sensitive material. Ordinary EOAs are recognized by actual ECDSA recovery to the account address and require no encrypted signer proof; the server refuses to label a nonrecoverable contract-account signature as EOA when an RPC code read fails.

For hosted wallet-scoped MCP, a research key minted by an ERC-1271 wallet binds to that specific browser authentication session and expires no later than that session (at most two hours). The backend checks the issuing session's **current** ERC-1271 authority on every request before granting any research tool, even if the browser never returns. A new smart-wallet sign-in automatically revokes older contract sessions and keys for that account; a detected signer change does the same. EOA-issued research tokens retain their previous separately revocable 24-hour ceiling, which is **not** financial authority. Unsupported/legacy signer types do not inherit a grandfathered bearer permission.

The exact contract code and its owner's state are controlled externally. Revalidation correctly follows a well-behaved ERC-1271 account's `isValidSignature` implementation, but it is **not a guarantee against intentionally dishonest wallets, compromised RPCs, owner authorization models outside ERC-1271, or every wallet implementation's custom signature rules**. It also does not authorize trading, solve OAuth 2.1 consent, or replace audited on-chain ERC-7579 spending/revocation controls. Before mainnet, test real supported smart-account implementations, chain finality and RPC failure behavior independently.

**Engineering evidence:** `tests/authority-proof.test.ts` covers encryption randomness, session/owner/chain binding, ciphertext and tag tampering, secret-key rotation and invalid inputs. The real local `scripts/verify-agent-accounts.ts` deploys a disposable mutable ERC-1271 account on Anvil, encrypts its signed SIWE proof into real PostgreSQL, issues a live scoped research bearer, rotates the owner signer onchain, and demonstrates that **the bearer fails without a browser refresh**, the old cookie fails and keys are revoked while the new signer can log in. The separately executed `scripts/verify-profile-mcp.ts` still proves ordinary EOA-hosted MCP functionality. No live Sepolia/mainnet signing or funds are involved.
