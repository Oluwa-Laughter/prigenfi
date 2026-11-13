# PrigenFi product direction and current reality

**PrigenFi is a privacy-preserving, agent-native DeFi protocol enabling autonomous AI agents to trade, manage assets, and execute financial strategies across EVM chains using Zama FHE, smart accounts, and MCP.**

The user journey is **give a goal → choose markets and risk constraints → grant narrowly scoped account permission → receive explainable proposals → see executed, verified results → revoke or adjust**. Trading mechanisms such as an RFQ adapter, proxy/implementation verification and smart-contract deployments are internal protocol concerns, not user-visible actions. A user never needs to deploy a contract in order to describe a strategy.

Private automation is **not live**. The preview has wallet-owned confidential Sepolia test tokens, public-market research, a copyable research mandate and local MCP policy simulation. It does not have authenticated agent sessions, safe autonomous FHE trades, real P&L or supported cross-chain private execution. No claims of guaranteed profits. ERC-20 compatibility alone does not confer confidentiality; verify each chain, asset and venue.

Live market display needs sourced API results, no hardcoded profits, prices, balances or synthetic trading performance. Product categories and strategy examples are templates, not live positions. Test wrappers remain clearly unbacked test assets, with consumer-friendly symbols (cUSDC, cUSDT, cZAMA, etc.). Any underlying official contract technical names belong in engineering documentation.

Workspace navigation exposes ordinary account actions and agent exploration. Desktop sidebar collapses; mobile menu opens/closes, with keyboard escape. Developer tools live under /docs, and the isolated public ERC-20 vault is a developer sandbox only. There are no "deploy vault" actions in the consumer UI or sandbox screen. Technical confidential-swap status is inspected via a separate read-only API and engineering records, not displayed as consumer RFQ diagnostics.

Browser screenshots/traces are disabled and legacy PNGs are removed from docs. Automated tests use DOM, accessibility, layout, actual local vault simulation and RPC checks instead. Engineering specifics, privacy boundaries and future work are maintained in ARCHITECTURE.md, NEXT_STEPS.md and BUILD_STATUS.md.

## Agent-native multi-EVM research milestone — November 9, 2026

The user can select real public market research across Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain, while private execution support remains **unverified and disabled** on all these live networks. A user can enter their own natural-language goal and research limits; there is no synthetic return or prefilled capital allocation. A compatible, explicitly connected MCP host may interpret their voluntarily shared goal via `interpret_private_defi_goal`. The app and MCP now use one real DEX Screener adapter with time/source/network metadata, plus strict chain and contract-address validation. `agent_market_research_check` rejects an untrusted model's attempt to change market, network, or query scope. This is not authenticated wallet permission. A verified, wallet-scoped strategy execution engine is still pending.

## Local agent onboarding, not wallet authorization — November 9, 2026

The workspace `/agents/connect` and developer `/docs` give users real steps to launch a **read-only local MCP server** with their existing agent host. Codex and Claude Desktop configuration templates are generated for the actual local Node and repository paths, and the connection CLI independently tests an MCP handshake, nine tool names, the AI-host interpretation prompt and the execution-disabled state. This is not a signed agent registration or a web/browser-detectable persistent connection. Local Anvil test vault tools are isolated in a separate developer-only start command. No screenshots or made-up agent profits are produced.

## Verified wallet identity and research profile controls — November 11, 2026

Agent onboarding now separates three distinct states: (1) **MCP host connected locally** to public market tools, (2) **wallet owner signed in** to PrigenFi via single-use SIWE with ERC-1271 smart-account support, and (3) **owner-scoped research profile saved** to a dedicated operator-configured Postgres database. None of these grants the external agent trading permission or ensures it is online. The `/agents` page allows sign-in, scoped real-record creation/listing/revocation, time-based expiry and logout. No fabricated profits, agent connections, demo user records or wallet permissions are present. If the real account service is unconfigured the UI honestly displays unavailable rather than inserting fallback accounts. User instructions and private positions are deliberately not persisted in these profiles.

## Scoped, wallet-owned MCP research connections — November 11, 2026

Users can create genuine scoped agent research profiles by signing in with a supported EOA or ERC-1271 smart account, then optionally connect an existing remote MCP-compatible AI host with an expiring, one-time-visible bearer key. The hosted research MCP checks live owner-saved research network/market restrictions, session expiry, quota and immediate revocation before every request. Key issuance is opt-in, disabled until a properly configured operator deployment enables it. The external model interprets the user's voluntarily shared goals; the protocol does not trade, earn yields, deploy contracts or expose confidential balances. OAuth 2.1 identity federation and wallet-granted execution policies are future work.

## Saved public markets — November 11, 2026

A signed-in user can now **inspect a real public EVM pool**, save only its chain and pool address under their authenticated wallet in PostgreSQL, revisit the market from their dashboard, and remove it. The data comes from the same source-checked, time-stamped public DEX Screener adapter used in market research; no user balances, private strategy instructions, token positions, fake asset valuations, signals, returns, fills or transactions are created. A watchlist is an organizational aid, not trading permission or a portfolio. If the provider is down, no substitute price or integrity score is invented.

A product workflow now reads: choose a public market → inspect source/risk and optionally save it → sign in to your wallet-owned workspace → manage research profiles or prepare a private mandate → inspect onchain privacy capabilities → review real records. The backend requires its dedicated operator-provisioned PostgreSQL and SIWE session; when unavailable the UI says so, not showing sample saved users. The product remains research-first with financial execution disabled.

The desktop/phone interface uses a tighter, less oversized heading scale, smaller hero sections and an accessible `Ctrl/⌘ + K` navigation dialog for jumping directly between real routes. No new custom fonts or fake products were introduced.

## Research ownership controls — November 12, 2026

The full `/saved` page makes wallet-scoped research usable across visits: see up to 25 real public saved pools; revisit the source-checked pair page; remove a single item without depending on current provider availability; download a local CSV containing only public pair identifiers and saved timestamps; or deliberately clear the entire list after typing `CLEAR MY MARKETS`. Successful deletion is confirmed by the server. A saved research list is **not** a private holding, trader mandate, trade execution, profit opportunity or encrypted on-chain storage. These actions require configured sign-in and PostgreSQL. A disconnected wallet, mismatched session, database failure or missing live deployment does not produce pretend records.

## Independently checked confidential-venue identity — November 12, 2026

PrigenFi now has a read-only, two-RPC Sepolia check of the official registered Zama ConfidentialSwap proxy/implementation against its historical recorded bytecode and registry hash, plus strict non-executable draft review for possible future smart-account sessions. **These are engineering validation capabilities, not user-accessible trade actions.** No confidential crypto market on Sepolia, ciphertext proof, live liquidity, owner-installed ERC-7579 session, onchain token amount cap, RFQ fill or settlement has been reproduced by this milestone. The customer frontend and MCP must continue to report private execution unavailable until a full end-to-end proof and review. See `docs/CONFIDENTIAL_EXECUTION_FOUNDATION.md`.

## Smart-wallet research session safety — November 13, 2026

PrigenFi's existing wallet-authenticated research accounts now actively recheck a contract wallet's ERC-1271 signature before treating the browser or its associated hosted research MCP as authorized. Rotating the smart wallet's signer invalidates the original session and associated research bearer, even if the browser never refreshes. Contract session proofs are encrypted at rest using an operator-supplied server-only key; EOA sign-in does not retain signatures. This is **not** a smart-account trading permission and does not make Zama Sepolia or any mainnet pair executable. Provisioning requires an explicit migration that logs out older users and revokes earlier preview access keys; financial execution, accounting, and audit remain separate release gates.
