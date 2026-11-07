# PrigenFi engineering report — 2026-11-07

## Delivery

Initial repository: empty, no remote branch history or application. Existing project-local Zama, shadcn and frontend skills were preserved and verified; eight focused security/Vercel skills were added with provenance.

Implementation commit [`0dbf583bd575405c9e95621ae117cd87ceb7bcaf`](https://github.com/Oluwa-Laughter/prigenfi/commit/0dbf583bd575405c9e95621ae117cd87ceb7bcaf) was pushed successfully to main after the founder approved GitHub workflow-scope authorization. Initial CI run: https://github.com/Oluwa-Laughter/prigenfi/actions/runs/42368330390 . Both verify and security jobs passed, including all configured checks. No remote check failed or was skipped. The run summary is saved in docs/evidence/ci-initial.json.

## Actual product features

One Next.js app provides public product messaging, developer documentation and a wallet-connected testnet workspace. `/`, `/docs` and `/dashboard` build as production routes. Dark and light themes, responsive layouts, keyboard skip focus, disconnected and unsupported-network states, empty receipts, errors and accurate disabled controls are implemented.

The dashboard connects an injected EIP-1193 wallet, creates or verifies an isolated vault, reads actual public gas/token state, sets token/recipient/amount/day/expiry limits, pauses/resumes/revokes, deposits and owner-withdraws ERC-20 capital, simulates mock transfer proposals, permits the connected authorized agent to submit a fixed transfer, and displays included receipts and actual recent agent events. No invented balances or trading history are supplied. Local fixture tokens are labeled and have no value.

This is an isolated-vault slice, not a completed ERC-4337 product or authenticated backend account system. Agent identity is its public wallet address and on-chain permission tuple; a durable named agent registry remains pending.

## Components and contracts

- `contracts/src/AgentVault.sol`: immutable owner; two supported test chains; per-agent/token permission; one recipient; uint128 operation/day caps; UTC window; at most 30-day session; persistent agent nonce; revoke/pause; owner-only ERC-20 withdrawal; SafeERC20/ReentrancyGuard; exact vault debit accounting.
- `VaultFactory.sol`: new independent vault per caller and owner/vault event.
- `MockUSD.sol`: local-chain-only public six-decimal faucet, capped per mint.
- `packages/shared`: strict runtime transfer/environment schemas, chain registry, verified-address constants, exact-unit conversion, policy evaluator and generated artifacts.
- `packages/sdk`: runtime-code verification, one-block policy/balance reads, actual eth_call, scoped event reads and max-100 ephemeral idempotent proposal session.
- `packages/zama`: read-only deployed wrapper verification and official SDK facade.
- `services/mcp-server`: official SDK v2 stdio server and ten constrained tools.
- `services/api`: loopback public metadata, health/readiness, rate limit and redacted errors/logging. No private data or signing endpoints.

Only local Anvil chain 31337 deployment occurred. Addresses are in ignored `.local/deployment.json`; no Sepolia PrigenFi deployment or mainnet transaction occurred. The public underlying Zama wrappers belong to the official registry, not PrigenFi.

## Zama evidence and limits

SDK and React SDK are pinned to 3.7.1. Official SDK AGENTS, LLM index, versioned API declarations and react-wagmi example informed integration. The frontend uses ZamaProvider plus official shield, permit, balance, confidential transfer, unshield and recovery hooks; the core facade calls Token/WrappedToken methods. No custom encryption or legacy relayer package is imported by application code.

At Sepolia block 12083183, real RPC reads verified wrapper and underlying deployed code, exact underlying addresses, six public/confidential decimals and rate 1 for cUSDCMock/cUSDTMock. `docs/evidence/zama-registry.json` records the values and verification timestamps. The UI verifies metadata before enabling operations.

No real shield/decrypt/confidential-transfer/unshield lifecycle was executed. Exact blocker: no dedicated founder-provisioned, faucet-funded PrigenFi test wallet was available. Unit guards and RPC metadata are not cryptographic/FHE integration tests. Local Foundry tests are ordinary EVM tests. The current official Hardhat template was researched but not copied because its manifest still contains a legacy relayer dependency; no custom confidential Solidity or FHEVM harness is claimed.

Decryption is opt-in, token-scoped, in separate browser memory stores/cache, remounted on account/network changes. MCP/API never return private balances. No agent receives confidential operator or delegated-decryption rights. Pending unshield recovery currently works only within the open SDK session. Durable safe recovery remains necessary.

## MCP integration

Official split packages server/client/core 2.4.0 and serveStdio support the 2026-07-28 specification. Scope is fixed by the local operator at process startup. The external SDK client discovers tools and tests permitted metadata, controlled missing-scope errors, allowed real-vault simulation/proposal/status and denied over-budget proposals.

Tools: wallet_get_info, agent_get_permissions, portfolio_get, confidential_assets_list, trade_quote, trade_simulate, trade_propose, trade_get_status, policy_get, agent_get_activity.

trade_quote explicitly returns NO_VERIFIED_TRADING_VENUE. Proposals are ephemeral and simulation-only, never signed or submitted. There is no remote HTTP/OAuth endpoint, unrestricted signing/call tool or confidential portfolio export.

## Verification performed

| Check                                                         | Actual local result                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| pnpm install and frozen-lockfile reinstall                    | Passed                                                                                      |
| Workspace plus scripts/tests TypeScript checks                | Passed                                                                                      |
| Biome lint                                                    | Passed                                                                                      |
| Prettier and forge formatting                                 | Passed                                                                                      |
| Production frontend build                                     | Passed, three application routes                                                            |
| TypeScript/API/SDK/Zama/MCP tests with LOCAL_INTEGRATION=1    | 22 passed, zero skipped                                                                     |
| Foundry                                                       | 13 passed, zero skipped                                                                     |
| Fuzz properties                                               | 512 runs each, operation cap and nonce skipping                                             |
| Stateful capital invariant                                    | 128 runs, 8192 calls                                                                        |
| Adversarial token cases                                       | Reentrancy, false-return rollback and fee-on-top rejection passed                           |
| Chromium browser, production app, CI=true / local integration | 3 passed, desktop 1440px and mobile 390px                                                   |
| Slither 0.11.6 / crytic-compile 0.4.2 / solc 0.8.30           | Direct-solc gate passed with documented low timestamp findings only                         |
| Gitleaks 8.30.1 staged content                                | No leaks; about 1.13 MB scanned                                                             |
| Sepolia registry checks                                       | Real read-only code/address/decimal/rate checks passed                                      |
| Sepolia FHE lifecycle                                         | Not run: dedicated funded signer absent                                                     |
| GitHub Actions                                                | Both verify and security jobs passed for implementation commit 0dbf583; see run 42368330390 |

Browser evidence includes seven screenshots in `docs/evidence`, keyboard/overflow/theme-color assertions and no page errors in the final run. Wallet tests use an injected provider forwarding to real unlocked Anvil accounts; they are not evidence of MetaMask/WalletConnect/hardware-wallet compatibility or a real Sepolia signature.

Intermediate failures were corrected: obsolete Foundry testFail naming, Zod transform signature, unknown error typing, CLI-generated cn imports, Tailwind lint parsing, unsupported ARIA usage, chain-time versus wall-clock proposal freshness, stale production server chunks during a rebuild, and a theme-transition assertion that sampled before animation completion. Initial Slither Foundry-export reference warnings were resolved by using direct-solc analysis, rather than suppressing analyzer failure. No failing test/security check was disabled.

## Security and incomplete scope

The security review and threat model cover compromised agents, authorization bypass, replay/cross-chain replay, wrong networks, token reentrancy/unusual behavior, exact units, duplicate proposals, stale snapshots, decryption boundaries, token passthrough, tenancy and finality assumptions. Runtime verification was added before trusting an existing vault. Slither timestamp findings correspond to necessary expiry/UTC comparisons; the gate rejects other findings and incomplete analysis.

Unaudited testnet code. Malicious/rebasing/upgradable token trust, browser/RPC compromise, receipt/reorg finality, persistence, account abstraction, backend tenancy and remote OAuth are not solved by this slice. The vault enforces token spend, not mark-to-market loss. Confidential transfers do not imply confidential trading or cross-chain privacy.

No database migrations exist because no private persistence is exposed. No durable workers, execution queues, reconciler, market-data provider, strategy runtime, price oracle or supported swap venue is shipped. Base and Arbitrum confidentiality is not asserted. Mainnet financial creation/execution is blocked.

## Founder actions and next milestones

GitHub authorization and the atomic code/CI push are complete. No GitHub credential action remains. No wallet secret is needed or should be shared.

1. Provision a dedicated limited-faucet Sepolia wallet through the app; complete the real confidential lifecycle and safe durable unshield recovery with evidence.
2. Implement SIWE/ERC-1271 sessions, tenant-scoped PostgreSQL migrations/persistence and OAuth-protected remote MCP with audience/resource validation and negative isolation tests.
3. Integrate a vetted ERC-4337/7579 account/session module over independent vault policy, then durable transaction/reorg reconciliation and a verified supported testnet execution adapter.

See BUILD_STATUS, NEXT_STEPS and DECISIONS before continuing. All project knowledge for a subsequent engineer is stored in this repository; no earlier session or sibling project is required.

## Concurrency follow-up

Final review reproduced a session-capacity race: 101 simultaneous simulations could insert 101 proposals because capacity was checked only before awaiting RPC. A second check immediately before insertion restores the documented maximum; a concurrent regression verifies exactly 100 acceptances and one SESSION_CAPACITY rejection. This affects process-local resource bounds, not vault spending or transaction execution.

Final code revision: [`24f25a6ba0d8aefbe07678c93650c67a17fec5f4`](https://github.com/Oluwa-Laughter/prigenfi/commit/24f25a6ba0d8aefbe07678c93650c67a17fec5f4). Both verify and security jobs passed in [run 42369083979](https://github.com/Oluwa-Laughter/prigenfi/actions/runs/42369083979). All 22 TypeScript/integration tests, 13 contract tests and three browser tests passed; no required check was skipped. The earlier handoff commit 420482dec32237dce924688f58c267a719d2ee8e also passed CI. The closing documentation/license checkpoint contains no application code changes.
