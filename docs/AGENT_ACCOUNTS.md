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
