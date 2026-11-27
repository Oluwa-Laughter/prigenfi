# Claude Code CLI prompts for local work

Updated 2026-11-27. Run `claude` from the repository root on your own machine and paste one prompt per session. Every prompt assumes the guardrails below; Claude Code also loads `CLAUDE.md` and must follow `AGENTS.md`. See [LOCAL_OPERATOR_RUNBOOK.md](LOCAL_OPERATOR_RUNBOOK.md) for what you must do yourself.

Order: 1 → 2 → 3 can run now. 4 needs your Sepolia test wallet. 5–6 continue Milestone 2. 7 is a product slice. 8 only when you decide to host a preview.

## Guardrails (included in every prompt)

> Follow AGENTS.md and CLAUDE.md. Never ask for, read, print or store private keys, seed phrases, database passwords, provider API keys or `PRIGENFI_AUTH_PROOF_KEY`; do not `cat` `.env*` files — use `pnpm env:check --file apps/web/.env.local`, which prints status only. Never sign, broadcast to a public chain, install a module, approve tokens or deploy publicly unless I explicitly confirm that exact action in this session. No mock balances, fake success, screenshots or videos. Report exactly what ran, what failed and what was skipped; update docs/BUILD_STATUS.md and docs/NEXT_STEPS.md with evidence; commit focused changes to `main` and push only when all checks you ran pass.

---

### 1. Local setup and full verification

```text
<Guardrails above>
Set up this repository locally and prove it is healthy. Check Node matches .node-version and pnpm is 10.34.6; install Foundry v1.8.1 if missing. Run pnpm install --frozen-lockfile, pnpm contracts:build, then confirm git shows no changes to packages/shared/src/generated. Start `anvil --silent` in the background, run pnpm local:deploy, then run: pnpm typecheck, pnpm lint, pnpm format:check, pnpm test:contracts, forge fmt --root contracts --check, LOCAL_INTEGRATION=1 pnpm test, pnpm build, pnpm test:browser. Summarize pass/fail counts per command. Fix only genuine breakages; do not weaken or skip tests. Record the results in docs/BUILD_STATUS.md.
```

### 2. Local wallet sign-in backend with Postgres

```text
<Guardrails above>
Bring up the real local account backend exactly like CI does (.github/workflows/ci.yml). Start a disposable postgres:16-alpine container. Create apps/web/.env.local for chain 31337 and http://localhost:3000 following docs/LOCAL_OPERATOR_RUNBOOK.md section 3, generating PRIGENFI_AUTH_PROOF_KEY with openssl directly into the file without printing it. Run pnpm env:check --file apps/web/.env.local and show its output. Load the env into the shell, run pnpm db:agents:migrate, build, start the production server on 127.0.0.1:3000 with Anvil running, then, with AGENT_AUTH_TEST_URL=http://127.0.0.1:3000 and the MCP flags set exactly as in CI for this local run only, run pnpm test:agent-accounts and pnpm test:profile-mcp. Report results. Stop the server and leave the container running for me.
```

### 3. Read-only Sepolia evidence refresh

```text
<Guardrails above>
Refresh read-only Sepolia evidence; send no transactions. I have exported SEPOLIA_RPC_URL, PRIGENFI_VENUE_PRIMARY_RPC and PRIGENFI_VENUE_SECONDARY_RPC (different operators) and PRIGENFI_ASSESS_SEPOLIA_RPC in this shell; confirm with pnpm env:check (status only). Run pnpm verify:zama, pnpm verify:swap:source, pnpm verify:swap and pnpm verify:swap:quorum. If the quorum passes, ask me before running it with --write-evidence. If the Zama ConfidentialSwap implementation hash changed from docs/evidence, stop and report — do not update the baseline. Never print RPC URLs. Summarize in docs/BUILD_STATUS.md.
```

### 4. Zama Sepolia confidential-token lifecycle (I sign)

```text
<Guardrails above>
Guide me through the first real Zama Sepolia confidential lifecycle with my dedicated PrigenFi test wallet; I will sign every transaction myself in my browser wallet and you must never request my key. Start pnpm dev. Walk me step by step through the app: switch to Sepolia, verify wrappers, mint test underlying, shield a small amount with exact approval, authorize decryption, decrypt locally, confidential transfer to my second test address, then unshield and finalize. After each step, ask me for the transaction hash only, then independently fetch its receipt read-only (status, block, contract, events) via SEPOLIA_RPC_URL. Never record balances or decrypted values. If any step fails, capture the sanitized error and stop. Write the evidence (hashes, blocks, SDK versions, outcomes) to docs/ZAMA_INTEGRATION.md and docs/BUILD_STATUS.md, and update NEXT_STEPS.
```

### 5. Milestone 2: real ERC-4337 UserOperation flow on Anvil

```text
<Guardrails above>
Continue Milestone 2 per docs/SMART_ACCOUNT_ARCHITECTURE.md. Replace EntryPoint impersonation with a real ERC-4337 v0.8 flow on local Anvil only. Obtain EntryPoint v0.8 from the official eth-infinitism/account-abstraction release; pin the exact version, record source and bytecode hash, and verify the deployed runtime code hash. Deploy it on Anvil at the canonical address via anvil_setCode or its deterministic deployer. Build PackedUserOperations for PrigenAccountPrototype (install SessionCallExecutor, grant, revoke) and execute them through handleOps. For owner signing in tests, use only Foundry vm.sign with ephemeral test keys, or Anvil's unlocked eth_sign; never add a key to files. Add negative tests: wrong signer, replayed nonce, expired session, delegatecall mode, forbidden selector. Keep everything Anvil-only. Run the full contract and LOCAL_INTEGRATION suites and Slither via scripts/security-scan.py.
```

### 6. Milestone 2: OpenZeppelin 5.6.0 → 5.6.1 account diff review

```text
<Guardrails above>
Review the OpenZeppelin Contracts changes between v5.6.0 (audited, commit 68e4095) and the pinned 5.6.1 for every file our account prototype inherits: account/Account.sol, account/extensions/draft-AccountERC7579.sol, draft-AccountERC7579Hooked.sol, account/utils/draft-ERC7579Utils.sol, utils/cryptography/signers/SignerECDSA.sol, AbstractSigner.sol and their imports. Use the official GitHub repository and the npm tarball; record SHA-256 of the files you compared. Summarize every behavioural change and whether it affects PrigenAccountPrototype or SessionCallExecutor. Do not change dependency versions. Write the findings to docs/SMART_ACCOUNT_ARCHITECTURE.md and docs/DECISIONS.md.
```

### 7. Product: owner-facing session permission preview in the workspace

```text
<Guardrails above>
Add an owner-facing "Agent permission preview" to the /agents workspace using @prigenfi/shared/session-permission (the same rules as the MCP tool agent_session_permission_preview). The owner enters agent address, target contract, function selector, duration and call limit; the page shows the plain-language summary, rejection reasons and the fixed blockers. No signing, transaction, calldata or "grant" button — show a clearly disabled "Grant on-chain (unavailable)" control with accurate explanatory text. Keep the existing design language, touch targets, keyboard access and reduced-motion support. Add DOM/accessibility browser tests at 320, 360, 390, 430, 768, 1024 and 1440px with no screenshots, plus negative tests for forbidden selectors and invalid windows. Run pnpm build and pnpm test:browser.
```

### 8. Hosted testnet preview (only after you choose a host)

```text
<Guardrails above>
Prepare (do not perform) a hosted Sepolia preview of apps/web. Produce a checklist for my chosen host: build command for this pnpm workspace, root directory, Node version, the exact list of server-only env variable NAMES and which must be secrets, PRIGENFI_APP_ORIGIN for the preview domain, PRIGENFI_AUTH_CHAIN_ID=11155111, hosted MCP flags left unset, database migration order with a backup step. After I confirm I have set the variables and deployed, run pnpm env:check with the same values exported, and run the browser suite against the preview URL. Do not enable hosted MCP and do not add any mainnet configuration.
```
