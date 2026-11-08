# PrigenFi public metadata API

A constrained backend for public health and capability metadata. The current service does **not** authenticate users, hold trading capital, manage private sessions, persist agent instructions, place swaps or provide finalized profit accounting.

An eventual production backend needs SIWE/ERC-1271 authentication, audited smart-account policies, tenant-isolated storage, privacy-safe agent orchestration, durable intent queues, idempotency, transaction reconciliation and verified realized performance. Public API access or an LLM session must never imply wallet authorization.

Avoid fabricated market prices, fake balances, hardcoded returns or data extracted from private FHE values. Treat every remote source as untrusted. Development: `pnpm api`; tests and type checking run from the repository root.
