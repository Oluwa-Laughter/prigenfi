# CLAUDE.md — PrigenFi project instructions

This file orients future Claude sessions. **`AGENTS.md` is the authoritative rule set**; where this file and `AGENTS.md` differ, follow `AGENTS.md` and fix this file. Always verify claims here against the actual code and tests — status prose goes stale.

## Product

PrigenFi is a privacy-preserving, agent-native DeFi protocol: autonomous AI agents research markets, propose strategies, manage assets and — eventually — execute **owner-authorized, policy-bounded, confidential** financial actions across EVM networks using Zama FHE, smart accounts and MCP. It is intended to become a real, mainnet-capable product, not a vault dashboard or a hypothetical-trade UI.

Target journey: authenticate wallet → configure agent, assets, risk and privacy → agent researches source-attributed markets → typed strategy proposal with risk analysis → owner grants narrow, revocable smart-account permission → system validates account/session/policy/venue/token/chain → encrypted order through a **verified confidential venue** → backend tracks execution, settlement, refunds, finality → verified accounting/activity → owner can pause, revoke and inspect.

## What is real today (verify before relying on it)

| Area                       | State                                                                                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet auth                | Real SIWE (EIP-4361), EOA ECDSA recovery, ERC-1271 with live per-request revalidation, hashed HttpOnly sessions, PostgreSQL (`apps/web/src/app/api/auth/*`).                                                                                 |
| Research backend           | Owner-scoped research profiles, revocable hosted MCP bearer keys, public-market watchlist (`/api/agents`, `/api/watchlist`, `/api/workspace/overview`). Migrations 0001–0005 in `infra/migrations`, operator-applied.                        |
| MCP                        | Local stdio server (`services/mcp-server/src/research-stdio.ts`) with 10 tools incl. `agent_session_permission_preview`; opt-in hosted owner-scoped and public research endpoints. **Read-only; no signing or execution tools.**             |
| Market research            | DEX Screener adapter in `packages/shared/src/market-research.ts` with source/timestamp; `assessMarketIntegrity()` is risk screening only.                                                                                                    |
| Zama                       | `@zama-fhe/sdk`/`react-sdk` 3.7.1 shield/transfer/decrypt/unshield UI against official Sepolia test wrappers. **End-to-end lifecycle NOT verified** (no provisioned test wallet).                                                            |
| Confidential venue         | Read-only code-identity checks of Zama's Sepolia ConfidentialSwap proxy (`verify:swap*`). **No RFQ ABI, pair, liquidity, order or settlement verified.**                                                                                     |
| Smart accounts             | Read-only ERC-7579 assessor (`pnpm assess:account`). Anvil-only, unaudited `PrigenAccountPrototype` (OZ 5.6.1 hooked) + `SessionCallExecutor` in `contracts/src/accounts/`. **Not deployed publicly; not wired to MCP/web; no amount caps.** |
| Contracts                  | `AgentVault`/`VaultFactory`: dev-only immutable public ERC-20 transfer vault (not a smart account, not trading). `AgentSafetyPolicy`: UUPS research policy registry, execution permanently denied.                                           |
| Execution, accounting, P&L | **Not implemented.** Every gate returns `executionAllowed:false`. No durable jobs, fills, reconciliation or performance data.                                                                                                                |

Detailed records: `docs/BUILD_STATUS.md` (evidence log), `docs/NEXT_STEPS.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/SMART_ACCOUNT_COMPATIBILITY.md`, `docs/SMART_ACCOUNT_ARCHITECTURE.md`, `docs/CONFIDENTIAL_EXECUTION_FOUNDATION.md`, `docs/SECURITY_AND_UPGRADES.md`, `docs/AGENT_ACCOUNTS.md`.

## Roadmap (dependency order)

1. **Smart-account compatibility (read-only)** — ERC-7579 assessor, canonical interface cross-checks, local Anvil fixtures, negative cases. _Done 2026-11-27; see `docs/SMART_ACCOUNT_COMPATIBILITY.md`._
2. **Smart-account and session architecture** — _in progress; first slice in `docs/SMART_ACCOUNT_ARCHITECTURE.md`._ select one maintained, audited stack; owner-controlled permissions, on-chain spend limits, selector/target restrictions, expiry, revocation, recovery. Anvil first; no module install or permission grant without explicit owner authorization.
3. **Real confidential execution** — prove a Zama Sepolia order→settlement lifecycle for one supported pair on a verified venue, including encryption, ACL, liquidity, settlement, failure/refund. Never fabricate missing functionality.
4. **Agent orchestration** — research → proposal → policy evaluation → explicit owner approval → execution, with research and execution permissions kept separate.
5. **Durable execution and accounting** — jobs, orders/fills, event reconciliation, finality, refunds, positions, verified analytics.
6. **Product and launch readiness** — UX, monitoring, security review, deployment, release process. Mainnet needs separate evidence and approval.

## Non-negotiable rules (summary — full text in AGENTS.md)

- Confidential execution is mandatory; **never** fall back to a public swap.
- No mock balances, fabricated liquidity, synthetic history, invented P&L or fake success states. Unavailable data shows as unavailable.
- No unapproved signing, UserOperations, approvals, module installs, public deployments or mainnet transactions. Contract creation/agent transfer only on chains 31337/11155111.
- Never create, read, print or commit private keys or secrets. Local scripts use unlocked Anvil accounts or `anvil_*` RPC methods, never keys.
- SIWE login, MCP connectivity, research profiles and ERC-7579 self-reports are **never** spending authority.
- Never call anything audited, secure, verified or production-ready without evidence.
- No screenshots, videos or traces in tests or docs.
- Keep docs aligned with code; update `BUILD_STATUS.md`/`NEXT_STEPS.md` with evidence, failures and skipped checks.

## Layout

- `apps/web` — Next.js marketing, docs, customer workspace and the real auth/research backend.
- `packages/shared` — schemas, registries, policy gates, market research, assessors, generated ABIs (`pnpm contracts:build`; never hand-edit `generated/`).
- `packages/sdk` — block-consistent vault reads/simulation. `packages/zama` — official wrapper verification/SDK facade.
- `services/mcp-server` — stdio MCP. `services/api` — public metadata only.
- `contracts` — Foundry; `contracts/src/accounts/` is the Anvil-only account prototype (no forge-std; tests use a minimal cheatcode interface). `contracts/test/helpers` holds Anvil-only fixtures.
- `infra/migrations` — explicit PostgreSQL migrations. `infra/zama-registry` — byte-identical upstream snapshot (do not reformat).

## Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test                         # unit tests
pnpm test:contracts               # Foundry (forge fmt --root contracts --check too)
anvil --silent & pnpm local:deploy && LOCAL_INTEGRATION=1 pnpm test
pnpm build && pnpm test:browser   # after UI changes; viewports 320–1440px
pnpm assess:account --chain 31337 --account 0x...
pnpm env:check --file apps/web/.env.local   # status only, never values
```

Operator setup, `.env` locations and owner-only actions: `docs/LOCAL_OPERATOR_RUNBOOK.md`. Ready-made local CLI prompts: `docs/CLAUDE_CLI_PROMPTS.md`.

Postgres-backed auth/MCP integration: see `.github/workflows/ci.yml` (`db:agents:migrate`, `test:agent-accounts`, `test:profile-mcp`).

### Cloud-session environment notes

Foundry may be missing. Fetch the pinned release `v1.8.1` from `github.com/foundry-rs/foundry/releases` into the scratchpad. `binaries.soliditylang.org` may be blocked by the network policy: place the official `solc-static-linux` v0.8.30 from `github.com/argotorg/solidity/releases` at `~/.svm/0.8.30/solc-0.8.30` and run Forge with `FOUNDRY_OFFLINE=true`. `eips.ethereum.org` may be blocked; canonical ERC text is at `raw.githubusercontent.com/ethereum/ERCs/master/ERCS/`.

## Workflow

Focused, reviewable commits with verified tests. The owner has directed work to be committed and pushed to `main` (consistent with `AGENTS.md`). Never force-push. Record what was actually run, what failed and what was skipped.
