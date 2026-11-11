# PrigenFi public metadata API

A constrained backend for public health and capability metadata. The current service does **not** authenticate users, hold trading capital, manage private sessions, persist agent instructions, place swaps or provide finalized profit accounting.

An eventual production backend needs SIWE/ERC-1271 authentication, audited smart-account policies, tenant-isolated storage, privacy-safe agent orchestration, durable intent queues, idempotency, transaction reconciliation and verified realized performance. Public API access or an LLM session must never imply wallet authorization.

Avoid fabricated market prices, fake balances, hardcoded returns or data extracted from private FHE values. Treat every remote source as untrusted. Development: `pnpm api`; tests and type checking run from the repository root.

## Research-agent account routes in Next.js — November 11, 2026

Wallet-authenticated research-agent accounts are implemented in the **Next.js web server** (`apps/web/src/app/api/auth/*` and `/api/agents/*`), not in this public metadata-only Fastify API. These routes use a dedicated operator-provisioned Postgres database, EIP-4361 SIWE, ERC-1271-aware chain signature verification, session cookies and strict owner-scoped SQL. Never add unrestricted signing or portfolio/trading endpoints to the metadata server. See `docs/AGENT_ACCOUNTS.md`.
