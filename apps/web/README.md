# PrigenFi web app

PrigenFi is building **privacy-preserving, agent-native DeFi**. Users should instruct agents in plain language, select eligible EVM markets, set independent wallet/smart-account permissions and inspect verified performance. They should **not** have to deploy contracts or understand RFQs.

## Customer experience

The marketing site and workspace are separate. The workspace routes are Overview (`/dashboard`), Markets, My Agents, Strategies, Portfolio, Privacy, Activity and Safety & Settings. A desktop sidebar can collapse to icons and reopen, while mobile navigation uses a dismissible drawer. The three-bar brand mark is reused in `src/app/icon.svg`.

The UI currently supports public-market research with a disclosed source, user-created local research drafts, testnet wallet tools and honest unavailable results. It does **not** run an unattended trading agent, guarantee profit, place a confidential swap or show simulated user P&L. Price or liquidity quotes from public markets are not a confidential execution path.

## Development

From the repository root: `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:browser`.

Only engineers use `/docs` and the unlisted `/vault` local ERC-20 sandbox. No customer-facing page requests smart-contract deployment. API and RPC errors must fail closed; balances must come from a connected wallet, and performance must come from settled verified positions.

**Resource policy:** Browser tests make DOM, accessibility and responsive-layout assertions. Screenshots, recordings and trace generation are disabled; never write test images to `docs/evidence`.
