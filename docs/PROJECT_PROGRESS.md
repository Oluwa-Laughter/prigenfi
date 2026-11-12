# PrigenFi: project progress and release boundaries

**Reviewed 2026-11-12** from the `main` repository, source code, local integration tests and GitHub workflow results. This page describes what exists, not promised trading features or speculative completion percentages.

## Product thesis

PrigenFi aims to let a wallet owner direct AI agents to research, eventually trade, and manage DeFi strategies across approved EVM networks while requiring confidentiality, independently enforced wallet permissions, and verified accounting. **No real-money autonomous trading or confirmed private swap execution exists yet.** Public-chain research is not confidential by itself.

## Shipped in source and verified locally

| Capability               | Current engineering reality                                                                                                                                                                       | Readiness boundary                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Customer experience      | Responsive public website plus `/dashboard`, `/markets`, `/saved`, `/agents`, `/strategies`, `/portfolio`, `/privacy`, `/activity`, `/settings`; compact typography and keyboard quick-navigation | UI tested in Chromium, not evidence of externally deployed backend                                                                       |
| Market research          | Fixed-network, source-stamped public DEX Screener adapter with chain/address identity checks, conservative risk screen, no fake pricing                                                           | Third-party observations are untrusted and don't prove token safety, venue support or executable quote                                   |
| Wallet account backend   | EIP-4361 SIWE challenge, single-use nonce, EOA/ERC-1271 signature verification, hashed 2-hour sessions, owner/chain-scoped PostgreSQL research profiles                                           | Real deployment requires dedicated Postgres, explicit migrations, exact HTTPS origin and configured chain RPC                            |
| Saved research           | Owner-scoped list of up to 25 **public EVM pool identifiers**, pool-inspection route, dedicated full-list manager, single remove, browser-side CSV export and typed clear-all confirmation        | Exports contain only saved chain/pair/time identifiers; neither a portfolio nor private strategy store                                   |
| Agent research           | Local stdio MCP, skills and optional hosted read-only tools; wallet-scoped research profiles and revocable preview bearer credentials                                                             | External hosted endpoints are opt-in/off by default; no OAuth 2.1 hosted user consent, financial execution or trustworthy agent autonomy |
| Smart contracts          | Solidity immutable testnet-only development vault with agent/token/recipient scopes, expiry, nonces, pause and aggregate per-token/day limits. Separate upgradeable research-policy reference     | Neither is an audited, connected ERC-4337/7579 trading custody module                                                                    |
| Zama confidential assets | Official Zama integration and registered unbacked Sepolia crypto wrappers cUSDC, cUSDT, cZAMA, cWETH; wallet-scoped confidential asset tooling                                                    | No independently reproduced private order→settlement venue, liquidity/quote/ACL proof or finality accounting                             |
| Reporting                | Source-aware public market graphs and genuine testnet vault events; user research profile counts                                                                                                  | Win rate, realized P&L, closed positions and confidential trade history are unavailable without reconciled on-chain evidence             |

## What a user can do today (on a configured test deployment)

1. Explore a source-identified public EVM pair, inspect real reported market metadata and limitations.
2. Connect a supported test wallet and sign in to the account backend with a message signature (not a transaction).
3. Save the pool under that authenticated wallet; later inspect, export or remove the list without calling external market providers for the export.
4. Create and revoke research-only agent profiles with permitted networks/market categories and expiry.
5. Use official Sepolia test-wrapper privacy tools with explicit wallet consent where supported. Do not infer that those assets have a working confidential DeFi execution venue.

A wallet connection or saved market **never authorizes an AI agent to move funds**. Do not publish a mainnet trading button, mock return figure, synthetic balance, or public DEX fallback under the "private" label.

## Critical path to confidential agent finance

1. **Production control plane:** configure an approved HTTPS origin, isolated PostgreSQL, migrations, monitored auth, per-user data retention/export/deletion, and live deployment smoke. Recheck ERC-1271 signer changes and revoke stale sessions.
2. **Independent authority:** integrate independently reviewed smart-account (ERC-4337/7579) session permissions for verified user-owned signing, venue/selector/asset scopes, budgets, expiry and immediate revocation; forbid agent-model text as authorization.
3. **Confidential venue proof:** reproduce one real encrypted crypto-asset order→match→settle→finalize testnet trace on an independently verified Zama-compatible venue, including ACL, liquidity, quotes, failed fills, slippage and recovery. Never silently fall back to public execution.
4. **Truthful accounting:** ingest finality-aware receipts and reconcile private execution metadata without leaking confidential balances, then derive actual cost basis and closed-position win rate/P&L.
5. **Operational readiness:** security review, incident response, monitoring, live wallet acceptance tests, abuse controls and explicit gated mainnet release decision. No test passing alone equals an audit.

The `services/api` Fastify service is intentionally **public metadata-only**; the real authenticated account backend lives in `apps/web/src/app/api`. Browser/account UX uses actual Postgres records and honest unavailable states rather than fabricated users. See [Architecture](ARCHITECTURE.md), [Build status](BUILD_STATUS.md), [Next steps](NEXT_STEPS.md), and [Security](SECURITY_AND_UPGRADES.md).
