# Wallet-scoped remote MCP research — developer preview

PrigenFi supports two **different** MCP connections:

- **Existing local stdio MCP** (`pnpm mcp`): runs on a developer's device, uses the nine general public-data research/availability tools, does not require wallet login, and **never** grants capital permissions. Codex already supports this integration. See [AGENT_CONNECTION.md](AGENT_CONNECTION.md).
- **Wallet-scoped Streamable HTTP MCP** (`POST /api/mcp`): opt-in, server-side access for an agent profile created and owned through authenticated PrigenFi wallet sign-in. Each request is reauthorized from PostgreSQL and the resulting tools enforce its saved network and market limits. **This is a service-token developer preview, NOT an OAuth 2.1 implementation.** No public production service should be enabled without dedicated operator review, HTTPS, monitored rate limits and proper OAuth authorization infrastructure.

## Operator provisioning

Provision a dedicated PrigenFi Postgres instance and verify the exact production HTTPS origin and approved Sepolia RPC as described in [AGENT_ACCOUNTS.md](AGENT_ACCOUNTS.md). Run:

```sh
pnpm db:agents:migrate
```

This applies the two explicit, additive migrations: `0001_agent_research_accounts.sql` and `0002_agent_mcp_keys.sql`. Do not change an existing production database without an operator-approved migration/backup process.

Only after the service is deployed behind HTTPS with the preceding security configuration, the operator may set the **server-only** feature flag:

```sh
PRIGENFI_MCP_HTTP_ENABLED=true
```

**Disabled by default.** It requires all normal account-service configuration; never use `NEXT_PUBLIC_` for tokens or backend settings. Non-HTTPS remote origins are rejected; plain HTTP is limited to localhost for isolated tests. The API and wallet-authenticated issuance endpoints fail closed if service prerequisites are missing.

## User and developer workflow

1. On `/agents`, connect the intended wallet and complete the one-time SIWE sign-in. Smart-account signatures are verified through the configured chain RPC (ERC-1271 supported).
2. Create a research-only profile: choose a name, host (`codex`, `claude`, other), selected EVM **research** networks, allowed research categories and an expiry. Saving a profile does not launch an agent or authorize a trade.
3. If the operator has explicitly enabled the remote service, click **Issue research connection** for this profile. The server returns an unpredictable `prf_…` bearer token **once**. The token is not persisted in browser localStorage or sent to a public provider. Copy it into a trusted local secrets manager or environment variable; losing it means issuing a new one and thereby invalidating the previous token.
4. In a terminal of your trusted machine, arrange for the `PRIGENFI_MCP_TOKEN` environment variable to be securely available to Codex without printing it into shell history or committing it to a repository. The CLI supports:

```sh
codex mcp add prigenfi-profile --url https://YOUR_APPROVED_PRIGENFI_ORIGIN/api/mcp --bearer-token-env-var PRIGENFI_MCP_TOKEN
```

5. Restart the host if needed. Verify `/mcp` (or `codex mcp get prigenfi-profile`) and ask the model to discover `research_scope_get`, `research_market_search`, `research_pair_lookup`, `agent_execution_status` and `interpret_scoped_research_goal`. The AI host, not PrigenFi, interprets the user's voluntarily shared natural-language goal.
6. **Disable access keys** on the profile to revoke all its remote credentials. Issuing a replacement key rotates and revokes the previous one. Revoking the entire profile also blocks its key immediately, including in an already-running MCP host. Each key expires in at most 24 hours, or sooner if its parent profile expires. A registered or connected host can no longer perform the next tool call after revocation.

Do not paste a bearer token into an LLM prompt, a screenshot, a support message, a GitHub issue or a browser URL. The key is visible once; PrigenFi cannot retrieve its original text from the hash stored in PostgreSQL. The exact approved `Host` header and any supplied `Origin` header are checked at the HTTP boundary. Native non-browser MCP clients may omit Origin, but requests still require a valid bearer. Cross-origin browser Origins are rejected. No CORS wildcard is issued.

## Strict scope and privacy

- Token scope comes from a real owner-authenticated database profile, never a client-supplied text instruction. The HTTP server uses **five read-only tools** and one host-facing prompt. Every market lookup requires both an allowed chain and an allowed research category; a model cannot escalate its own permissions by changing input JSON or by writing a prompt. All live provider observations remain **PUBLIC**, sourced and time-stamped.
- The token is a random 256-bit credential, stored as a SHA-256 hash only. Each HTTP call rechecks token expiry/revocation, parent-profile expiry/revocation, the configured testnet chain and an atomic **30-request/minute** limit. Key issuance is capped at five per profile per hour and serializes rotations in the database.
- The system never returns confidential balances, private strategy text, seed phrases, signing keys or smart-account spending rights. It does **not** submit swaps, execute investments, decrypt ciphertext, trade publicly as a privacy fallback, generate synthetic performance metrics or promise profits.
- Research network permissions (e.g., Base/Arbitrum) are **not** claims of FHE trading support on those chains. Zama-compatible encrypted settlement for each token/venue/chain still needs independent verification. A valid MCP token does not prove that the wallet owner has granted a value-moving session key.

## Protocol and security limitations

The implementation uses the official MCP TypeScript SDK's per-request Streamable HTTP handler. Each HTTP POST is authorized before protocol processing, and no local Anvil developer-vault tool is exposed. It is stateless and supports compatible legacy clients while using modern protocol exchanges when negotiated. This development token approach **is not complete OAuth 2.1 MCP authorization**, does not advertise a trusted authorization server, and must not be confused with a production identity federation or wallet-bound OAuth session.

Before enabling externally for general users: implement the MCP OAuth protected-resource and authorization-server metadata, client registration and consent flow, audience/resource checks, scoped access/refresh tokens, cross-tenant isolation review, credential recovery/revocation UX, monitoring and abuse controls, proxy trust-boundary review, load tests and independent security audit. Transaction execution stays disabled regardless of OAuth progress.

## Engineering tests

`pnpm test:profile-mcp` uses only disposable local Anvil, Postgres and a localhost Next.js production server with `PRIGENFI_MCP_HTTP_ENABLED=true`. It performs a **real SDK Streamable HTTP handshake**, checks a wallet-owned saved research scope, rejected network/market inputs, rotating and revoking bearer keys, cross-origin denial and 30-requests-per-minute enforcement, with no real transfers or live user accounts. The companion `pnpm test:agent-accounts` checks SIWE EOA/ERC-1271 signatures and profile owner isolation. These are included in GitHub CI with a disposable Postgres service container.

References: [MCP 2026 Streamable HTTP spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports), [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [Codex MCP setup](https://developers.openai.com/codex/mcp).
