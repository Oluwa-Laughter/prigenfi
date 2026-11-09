# PrigenFi product direction and current reality

**PrigenFi is a privacy-preserving, agent-native DeFi protocol enabling autonomous AI agents to trade, manage assets, and execute financial strategies across EVM chains using Zama FHE, smart accounts, and MCP.**

The user journey is **give a goal → choose markets and risk constraints → grant narrowly scoped account permission → receive explainable proposals → see executed, verified results → revoke or adjust**. Trading mechanisms such as an RFQ adapter, proxy/implementation verification and smart-contract deployments are internal protocol concerns, not user-visible actions. A user never needs to deploy a contract in order to describe a strategy.

Private automation is **not live**. The preview has wallet-owned confidential Sepolia test tokens, public-market research, a copyable research mandate and local MCP policy simulation. It does not have authenticated agent sessions, safe autonomous FHE trades, real P&L or supported cross-chain private execution. No claims of guaranteed profits. ERC-20 compatibility alone does not confer confidentiality; verify each chain, asset and venue.

Live market display needs sourced API results, no hardcoded profits, prices, balances or synthetic trading performance. Product categories and strategy examples are templates, not live positions. Test wrappers remain clearly unbacked test assets, with consumer-friendly symbols (cUSDC, cUSDT, cZAMA, etc.). Any underlying official contract technical names belong in engineering documentation.

Workspace navigation exposes ordinary account actions and agent exploration. Desktop sidebar collapses; mobile menu opens/closes, with keyboard escape. Developer tools live under /docs, and the isolated public ERC-20 vault is a developer sandbox only. There are no "deploy vault" actions in the consumer UI or sandbox screen. Technical confidential-swap status is inspected via a separate read-only API and engineering records, not displayed as consumer RFQ diagnostics.

Browser screenshots/traces are disabled and legacy PNGs are removed from docs. Automated tests use DOM, accessibility, layout, actual local vault simulation and RPC checks instead. Engineering specifics, privacy boundaries and future work are maintained in ARCHITECTURE.md, NEXT_STEPS.md and BUILD_STATUS.md.

## Agent-native multi-EVM research milestone — November 9, 2026

The user can select real public market research across Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain, while private execution support remains **unverified and disabled** on all these live networks. A user can enter their own natural-language goal and research limits; there is no synthetic return or prefilled capital allocation. A compatible, explicitly connected MCP host may interpret their voluntarily shared goal via `interpret_private_defi_goal`. The app and MCP now use one real DEX Screener adapter with time/source/network metadata, plus strict chain and contract-address validation. `agent_market_research_check` rejects an untrusted model's attempt to change market, network, or query scope. This is not authenticated wallet permission. A verified, wallet-scoped strategy execution engine is still pending.
