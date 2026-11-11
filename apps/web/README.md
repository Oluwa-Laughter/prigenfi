# PrigenFi web app

PrigenFi is building **privacy-preserving, agent-native DeFi**. Users should instruct agents in plain language, select eligible EVM markets, set independent wallet/smart-account permissions and inspect verified performance. They should **not** have to deploy contracts or understand RFQs.

## Customer experience

The marketing site and workspace are separate. The workspace routes are Overview (`/dashboard`), Markets, My Agents, Strategies, Portfolio, Privacy, Activity and Safety & Settings. A desktop sidebar can collapse to icons and reopen, while mobile navigation uses a dismissible drawer. The three-bar brand mark is reused in `src/app/icon.svg`.

The UI currently supports public-market research with a disclosed source, user-created local research drafts, testnet wallet tools and honest unavailable results. It does **not** run an unattended trading agent, guarantee profit, place a confidential swap or show simulated user P&L. Price or liquidity quotes from public markets are not a confidential execution path.

## Development

From the repository root: `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:browser`.

Only engineers use `/docs` and the unlisted `/vault` local ERC-20 sandbox. No customer-facing page requests smart-contract deployment. API and RPC errors must fail closed; balances must come from a connected wallet, and performance must come from settled verified positions.

**Resource policy:** Browser tests make DOM, accessibility and responsive-layout assertions. Screenshots, recordings and trace generation are disabled; never write test images to `docs/evidence`.

## Actual multi-chain public-data research (November 9, 2026)

The `/markets` selector supports Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain through a single source-validated, fail-closed `@prigenfi/shared/market-research` adapter. Symbols use the provider's limited global result slice; an exact 42-character token address uses the provider's chain-scoped `token-pairs` API. No hardcoded production prices, trading wins, balances, liquidity or synthetic quote fallbacks exist. These are public observations, not supported confidential execution venues.

`/agents` starts with an **empty**, user-authored goal, token list and research capital ceiling. It can select public research scope and copy a confidential-only draft. A connected external MCP AI host may interpret that explicitly shared goal; this web page has no LLM session, trade capability or private-instruction upload.

## Agent connection UX — November 9, 2026

The multi-page workspace now includes `/agents/connect`, reachable from `/agents`, with working copy controls and Codex / Claude Desktop host selection. It provides a local handshake command, generated configuration paths and explicit host-verification instructions; it **does not** claim to know whether the browser user has a running local MCP server. Developer documentation at `/docs` uses the same real commands. Desktop and mobile layout tests cover the new page without saving any screenshots.

## Wallet sign-in and owner-scoped research-agent profiles — November 11, 2026

`/agents` now has a functioning **EIP-4361 sign-in** flow, user-managed agent research profiles, exact wallet/chain matching, and owner-only server-side revocation. Persistence requires a separately configured Postgres database, `PRIGENFI_APP_ORIGIN`, a trusted configured RPC and `pnpm db:agents:migrate`. Without this, the web page shows a clear unavailable state and invents no users or agent connections. Profiles do not authorize transactions, smart-account execution or any real trade. A local disposable Anvil/Postgres integration script exercises real EOA and ERC-1271 signatures. See [AGENT_ACCOUNTS](../../docs/AGENT_ACCOUNTS.md).
