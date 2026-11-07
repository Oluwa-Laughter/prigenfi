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
