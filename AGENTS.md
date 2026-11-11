# PrigenFi engineering instructions

Private finance. Powered by agents. PrigenFi serves end users and developers with user-controlled agent finance and confidential assets.

## Session boundary

Use only this session, this repository, its instructions, and official external documentation. Never inspect sibling projects or recover earlier chats without an explicit request. At session start read `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/BUILD_STATUS.md`, and `docs/NEXT_STEPS.md` as repository evidence; verify actual files and tests before relying on status claims.

## Authority and safety

- Work on `main`; commit and push coherent verified milestones. Never force push or overwrite unrelated work.
- No mainnet financial execution or real funds. Contract creation and agent transfer are restricted to chain 31337 or 11155111.
- Local Anvil deployments are allowed. Public Sepolia deployment requires a dedicated, explicitly provisioned PrigenFi test wallet funded with limited faucet ETH. Never create, read, print, export, or commit signing secrets. The local deployment script uses unlocked node accounts, never private keys.
- Agents never receive arbitrary signing, approvals, raw calls, or confidential token operator rights.
- A simulator is not authority. Enforce financial policy on-chain independently.
- No confidential balances in MCP, backend, logs, analytics, fixtures, screenshots, or LLM context. Browser decryption requires user action; keep private state scoped to wallet, chain, and token and erase on disconnect.
- Never describe mocked or untested operations as real FHE, trading, production security, audited code, or deployment.

## Architecture and commands

- pnpm 10.34.6 workspace; use the committed lockfile. Node 22+; pinned Node version in `.node-version`.
- `packages/shared` owns schemas, chain and asset registry, and generated ABIs/bytecode. Run `pnpm contracts:build` after Solidity changes. Never hand-edit generated files.
- `packages/sdk` owns block-consistent public policy reads, simulation and ephemeral proposal sessions. ETH, ERC-20 and ERC-7984 paths stay distinct.
- `packages/zama` verifies official wrapper metadata and uses only `@zama-fhe/sdk`. The frontend uses `@zama-fhe/react-sdk`. Do not use the legacy relayer SDK or implement cryptography.
- `services/mcp-server` is local stdio only, with startup-bound scope. Remote HTTP must wait for tested OAuth audience/resource validation. MCP identity is never wallet authority.
- `services/api` exposes public metadata only. No user authentication, tenancy, persistence, or private API is implemented. Add PostgreSQL migrations, verified wallet authentication and authorization before private endpoints.
- `apps/web` contains marketing, docs and wallet-connected dashboard. A connected wallet is not an authenticated backend session.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:contracts`, `pnpm build`, `pnpm test:browser`.
- For local integration: start `anvil --silent`, run `pnpm local:deploy`, then `LOCAL_INTEGRATION=1 pnpm test`.
- Use reviewed project-local skills in `.agents/skills`; record sources in `docs/ENGINEERING_SKILLS.md`. No need for delegation to implement this repository.
- All visible controls must work or be disabled with accurate explanatory text. No invented balances, history, market prices, PnL, yield, TVL or swap quotes.

## Verification and handoff

Update BUILD_STATUS and NEXT_STEPS with evidence, failures and skipped checks. Run meaningful negative tests for every permission boundary. Test actual browser wallet flows against Anvil; mocked wallet transport is not evidence of a real Sepolia wallet or FHE operation. Preserve SDK version-specific APIs and verify official registry code/metadata before enabling confidential assets. No public deployment without the authorized wallet.

## Product UX direction — 2026-11-08

PrigenFi is a consumer financial product **and** an agent MCP protocol. The primary journey must be **choose market → tell an agent what to research → set wallet-controlled capital permissions → inspect private assets → review proposals and activity**. Lead with the user's financial objective, not deploying a contract, technical guides, or developer tools. Preserve the existing PrigenFi mark and use a wide, responsive, accessible interface. Do not feature GitHub in the customer-facing site footer.

In the application, show confidential test asset labels **cUSDC, cUSDT, cZAMA, cWETH, cBRON, cXAUt and ctGBP** without the suffix `Mock`. Internally and in integration/developer documentation preserve the correct official `cUSDCMock`/`cUSDTMock` contract identifiers; prominently disclose the assets are unbacked Sepolia test tokens, not redeemable real stablecoins. Never relabel a real chain token or pretend testnet wallets contain funds.

Market mandates are user-defined instructions, **not** on-chain permissions. Do not show an instruction composer as an operational trading agent until authenticated MCP dispatch, policy-aware trade execution, confidential venue integration, and durable activity states exist. No fake gains, market data, trade history, or implied active trades.

## Ethereum-market expansion and design contract — 2026-11-08

PrigenFi is **not** restricted to ETH as an asset: the Ethereum ecosystem includes permissionless ERC-20/DEX spot markets, meme tokens, lending, DeFi, liquidity pools, liquid staking, stablecoins, and derivatives where appropriate. Build research and eventual execution adapters per market, not a misleading universal swap API. External public trade paths cannot claim FHE privacy by association.

Use separate public marketing and customer workspace navigation. Keep app routes distinct: `/dashboard`, `/markets`, `/agents`, `/strategies`, `/portfolio`, `/activity`, `/vault`, `/settings`; `/docs` is developer-oriented. Do not revert to a single-page contract-dApp experience. Keep PrigenFi logo, the editorial indigo/lavender/coral/blue design palette, responsive wide layouts, intentional/reduced-motion-aware interaction, and real data-derived charts.

Market research APIs are public, untrusted and may leak query terms to upstream market providers. Never use external price/volume data as proof of a safe execution or guaranteed profit. Agent win rates and P&L must derive exclusively from verified finalized closed positions and cost-basis accounting; display unavailable metrics until that system exists. The current `AgentPerformanceCharts` receives an empty verified trade dataset intentionally; do not fill the app with fake outcomes.

## Confidential-first trading rule — November 8, 2026

Product scope is **all-round Ethereum and supported DeFi trading directed by natural-language instructions**, not primarily meme markets or one token. Execution MUST be confidential for supported markets. If no verified Zama/FHE-compatible venue can route that market privately, remain in research-only state. **Never** downgrade to a public trade, silently reveal user market intentions to third-party agents, claim private mempool transactions, or call a standard ERC-20 transfer a confidential trade. Existing public vault test transfers are legacy development-only functionality, separate from the future trading execution engine.

The shared confidential policy and MCP route-check functions are fail-closed. Preserve strict validation, negative tests and status honesty as these evolve. A draft instruction is not understood by a production LLM yet; the UI is intentionally local-only and copyable. Any future AI/runtime must be authenticated, isolate tenant data, minimize prompt disclosure and enforce wallet approvals independently. Do not send raw private user instructions to market-data providers or analytics.

Use Zama's official current Sepolia contract registry, not guessed addresses. The test asset behind **cZAMA is not the real ZAMA token**. Wrapper and underlying decimals differ for some assets; use verified `rate()` and exact bigint units. Confirm actual SDK contract ABI and permissions. Any claim of confidential agent execution requires a cryptographically verified testnet end-to-end trace. Document failures and keep the feature disabled until then.

Run the responsive browser suite at 320, 360, 390, 430, 768, 1024 and 1440px when changing layouts. Keep touch targets, readable headings, horizontal token rails and honest empty/error states.

## Typed agent planning boundary — November 8, 2026

The agent-planning module provides a read-only structured plan validator through a local MCP tool. It accepts no plaintext token amount, calldata, arbitrary venue, wallet key or confidential balance. Never interpret agent instructions as spending permissions. Preserve negative tests for invalid chains, scope, expiry, unregistered assets, missing slippage, budget overflow and privacy downgrade. It MUST report execution disabled until a verified confidential venue and separate owner/account authorization exist.

## Zama ConfidentialSwap read-only integration — November 8, 2026

Use `pnpm verify:swap:source` to verify the official byte-identical registry snapshot with its upstream SHA-256 manifest. `pnpm verify:swap` checks the live Sepolia registered UUPS proxy/implementation without wallet credentials. `GET /api/confidential-venue` is a four-minute-cached public code/status endpoint with **no signing ability**. Do not infer RFQ interface, supported pairs, quote availability, liquidity, ciphertext correctness or private transaction readiness from proxy bytecode alone. Maintain strictly `executionAllowed:false` in the plan/route gates. The deployed proxy's UUPS upgradeability means the implementation code hash may change; recheck on future integration and do not pin a stale ABI to the proxy. Never permit user-specified RPC endpoints on the public status API.

## Upstream registry scanner review

The full byte-identical Zama protocol-registry testnet snapshot intentionally preserves public `underlying_token` addresses, which trigger Gitleaks generic-api-key heuristics. Historical, individually reviewed false positives have exact commit/path/rule/line fingerprints in `.gitleaksignore`. Never add a broad file/rule exemption or suppress future scanner failures. Preserve the SHA-256 reproducibility guarantee.

## User-facing product correction — November 8, 2026

PrigenFi's product definition: **"PrigenFi is a privacy-preserving, agent-native DeFi protocol enabling autonomous AI agents to trade, manage assets, and execute financial strategies across EVM chains using Zama FHE, smart accounts, and MCP."** This is our direction, not a blanket claim of existing chain compatibility or returns. Prioritize a user goal, agent instruction, owner permissions and verified activity. Do NOT put RFQ, UUPS/proxy details, contract deployment buttons, test artifacts or engineering diagnostics in the consumer workspace. Existing vault tooling is developer-only and must not be marketed as an agent-managed trading smart account.

Never fabricate user holdings, win rate, P&L, market prices, quotes, liquidity or successful actions. Live market data must show a source and loading/error state; product presets are category instructions only. On unsupported networks or assets, keep execution blocked; no public fallback may masquerade as FHE confidentiality.

**Resource policy:** Do not take Playwright screenshots, generate videos/traces, store screenshots in `docs/` or commit visual test captures. Use DOM/accessibility/layout assertions and test result logs. Previous screenshots were intentionally deleted from the current tree. Never reintroduce screenshot file outputs in tests or agent workflows unless the user explicitly requests them. Keep the UI mark and the favicon identical in shape and palette.

## Cross-EVM research without fictitious trades — November 9, 2026

All live public prices, pool volume and liquidity in web and MCP must come through `packages/shared/src/market-research.ts` from a real source response. Do not add synthetic fallback data. An exact token contract address is searched on the selected chain; symbol searches only see a global limited result set, and an empty result MUST remain empty. Only the explicit network allowlist is queried. Treat remote token symbols, URLs and prices as untrusted; every datum needs source and timestamp and does not prove an executable or safe token. Never submit personal user goals to public market-data providers.

`interpret_private_defi_goal` is an MCP prompt **for a connected agent host's LLM**. It is not a magic built-in AI engine, does not automatically authorize spending and the external host can see the user goal. `agent_market_research_check` is caller-scope validation for **public research only** and not cryptographic owner authentication. The separate Sepolia private-wrapper schema and real execution barriers must never be bypassed by a prompt, simulated quote or unverified venue. All generic public ERC-20 dev transfer tools are visible only to explicitly configured Anvil chain 31337; they are not production trades. Keep new agent UX user-authored without prefilled capital numbers and with no demo gains, screenshot captures or fake histories.

## MCP integration and real host setup — November 9, 2026

Normal agent hosts and `pnpm mcp` MUST use `services/mcp-server/src/research-stdio.ts`, never the vault-capable developer server. The default entry exposes nine research and availability tools plus one host-facing interpretation prompt, with no wallet secrets, signing, confidential decryption or transaction tools. Only `pnpm mcp:dev` with Anvil chain-31337 client scope enables developer-only public transfer simulations. `pnpm agent:connect --check` verifies a real local child-process handshake but **not** a host/session or user approval. `--print codex|claude` and `--write` generate portable, source-local, nonsecret host config; do not overwrite third-party config without deliberate user action. The UI `/agents/connect` must never fake live device connectivity. Keep official Zama test wrapper technical symbols in internal registry only; use display symbols cUSDC, cUSDT and cZAMA for user-facing MCP metadata, with `testOnly:true`. Never capture browser screenshots.

## Wallet-authenticated agent research accounts — November 11, 2026

Only the web backend in `apps/web/src/app/api/auth/*` and `/api/agents` may manage research-profile authentication. **Never treat SIWE login, MCP connectivity, or a saved research profile as wallet spending authorization.** Keep EIP-4361 nonce one-time, exact origin/chain/message bound and short-lived, with viem EOA/ERC-1271 verification. Do not trust forwarded Host headers, cross-origin writes, caller-supplied owners, unsigned profile updates or model-generated spending grants. All sensitive operations require a true owner-scoped server session; tokens are random, hashed in DB and HttpOnly cookies. Real Postgres is mandatory (no mock users/fake balances/in-memory production storage); migrations are explicit. The developer can test an EIP-1271 fixture on disposable Anvil only. Never broadcast test fixtures on public chains or log database URLs, wallet secrets, complete signed messages or personal instructions. `docs/AGENT_ACCOUNTS.md` defines configuration and limitations. Browser tests must not create screenshots.

## Remote research MCP hard boundary — November 11, 2026

The optional `POST /api/mcp` endpoint exposes only `research_scope_get`, `research_market_search`, `research_pair_lookup` and `agent_execution_status` plus a host-facing interpretation prompt; never register vault-transfer, signing, decrypting or transaction tools there. Each HTTP exchange checks a hashed one-time bearer key against live Postgres profile revocation/expiry, configured chain, and atomic 30-call/minute quota **before** executing the official Streamable HTTP handler. All market reads require server-owned allowed research `chain` **and** `market` category; reject unauthorized input before contacting external providers. Only the wallet owner may issue/rotate/revoke keys, protected by SIWE session and same-origin checks. The default is OFF unless `PRIGENFI_MCP_HTTP_ENABLED=true`. This is not OAuth 2.1 yet, must not be publicly enabled without operator review, and never grants money-moving authority. Keep local Codex stdio MCP unchanged; new remote hosts use the separate `prigenfi-profile` identity. Tests use disposable Anvil/Postgres only, no screenshots.

## Market integrity and upgrade boundary — November 11, 2026

Use the existing official OpenZeppelin `develop-secure-contracts`, `upgrade-solidity-contracts`, `setup-solidity-contracts` skills for all Solidity changes; use existing property-based-testing and Zama protocol skills for security/privacy review, and the repository's `prigenfi-market-diligence` workflow for read-only market research. All external market provider text is untrusted. The shared `assessMarketIntegrity()` only reports conservative public-data quality and risk signals and ALWAYS has `executionAllowed:false`; never convert a favorable screen into transaction authorization or claim it predicts profits. Local MCP `market_integrity_assess` is not authenticated consent; remote `research_market_integrity_check` MUST check both owner-stored research chain and category BEFORE any public provider call. Never request/store private balances, prompts, keys, signed transactions or private market strategy in third-party provider calls.

`AgentSafetyPolicy.sol` is a new NON-CUSTODIAL OpenZeppelin UUPS research policy registry with ERC-7201 namespaced state, delayed codehash-pinned upgrades, two-step owner transfer and explicit immutable execution denial. It is NOT attached to `AgentVault`, `VaultFactory`, hosted MCP trading or Zama settlement. `AgentVault` itself is NOT upgradeable; do not represent it as such or silently migrate user custody into a proxy. No public-chain upgrade/deployment without owner and separate security verification. See `docs/MARKET_INTEGRITY.md`, `docs/SECURITY_AND_UPGRADES.md` and `docs/AGENT_SKILLS.md`.

## Aggregate development vault budget — November 11, 2026

`AgentVault.setTokenDailyLimit` is an owner-only per-token aggregate cap for **all** development agents and starts at zero. Preserve same-day spent amounts across cap adjustments, revoke/regrant and multi-agent activity; do not use an agent's own daily cap as a substitute. SDK and UI must read actual on-chain tokenBudgets at the same block as agent scope; no prefilled capital figures. This is public ERC-20 testnet-only transfer isolation, not confidential execution, not ERC-4337, and not an upgrade to existing immutable vaults. Never enable mainnet or connect these permissions to a real money-moving agent until an independently audited private execution module exists. Browser tests may use explicit local fixtures, never present them as real user balances.

## Hosted no-clone research MCP and crypto-only assets — November 11, 2026

Public hosted MCP (`POST /api/mcp/public`) is an **operator-opt-in, no-login, read-only research** surface, strictly limited to market reads, integrity checks, four crypto test-wrapper labels and execution-disabled status. Its atomic global 60/minute Postgres quota is NOT authentication or a per-tenant limit. Never give it signing, approval, vault, private balances, user profiles, arbitrary RPC or execution tools; never enable it in production without explicit operator provision/review, metrics and abuse protection. The separate wallet-owned bearer MCP retains saved scope and revocation; an agent denied by that profile must not bypass it through public endpoints. `/api/mcp/connect` discloses only configured available research URLs. User onboarding must not require repository cloning; use hosted URL and public SKILL.md files, while keeping local stdio for maintainers. Static skill files under `apps/web/public/skills/` must never include executable scripts or financial approvals.

The active confidential catalog is crypto-only cUSDC, cUSDT, cZAMA and cWETH on Sepolia, all unbacked test wrappers. Keep historical Zama seven-wrapper evidence accurately labeled as provenance, but do not reintroduce cBRON, cXAUt or ctGBP in user-facing token selection, MCP capability responses or accepted research plans without a new product decision. Never claim the source evidence verifies a private execution venue or EVM-wide encrypted swaps.
