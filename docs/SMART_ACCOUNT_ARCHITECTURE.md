# Smart-account and session architecture — Milestone 2 (first slice)

Updated 2026-11-27. **Anvil-only, unaudited prototype.** Nothing here has been deployed to Sepolia or mainnet, holds value, or is reachable from MCP, the web app or any agent host. It establishes the permission model and its on-chain negative tests; it does not enable trading.

## Stack decision

**Base: OpenZeppelin Contracts 5.6.1 `AccountERC7579Hooked` + `SignerECDSA`** (already lockfile-pinned).

Evidence reviewed in this session:

| Evidence                                                 | Finding                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `OpenZeppelin/openzeppelin-contracts` `audits/README.md` | Audits for v5.4.0 (July 2025, commit `f6fea85`) and v5.6.0 (Feb 2026, commit `68e4095`).                                              |
| `2025-07-v5.4.pdf` (SHA-256 `7bd915d7…6c289`)            | Scope tree lists `draft-AccountERC7579.sol`, `draft-AccountERC7579Hooked.sol`, `draft-ERC7579Utils.sol`. Findings: Low and Note only. |
| `2026-02-v5.6.pdf` (SHA-256 `15249a54…f8e80b`)           | Same account files in scope. Two Medium findings, neither in the ERC-7579 account files (memory aliasing; ERC-7786 receiveId).        |
| Milestone 1 assessor on stock `AccountERC7579`           | No hook support; delegatecall execution supported.                                                                                    |

Caveats, stated plainly: the auditor is OpenZeppelin's own security team (first-party, not independent); the reports cover v5.6.0 while the repository pins **5.6.1** (diff not reviewed here); the files are `draft-` because ERC-7579 itself is a Draft. Alternatives (Safe7579, Kernel, Nexus) were **not** evaluated in this session; they would add new dependencies and require the same evidence review. Choosing OZ minimizes new code and keeps one dependency, but this is a provisional selection pending independent review.

## Components

### `contracts/src/accounts/PrigenAccountPrototype.sol`

OZ `AccountERC7579Hooked` + `SignerECDSA` with exactly two PrigenFi deltas:

1. A single ECDSA owner is the native UserOperation signer (used when no validator module is selected by the nonce key).
2. **Delegatecall is refused**: `supportsExecutionMode` reports it unsupported and `_execute` reverts `PrigenDelegatecallForbidden`, so no executor or owner batch can run foreign code in account storage.

Hooks are supported (one hook slot). Owner actions go through EntryPoint → `execute` (or account self-calls); the owner EOA cannot call `execute` directly. `accountId` is `prigenfi.account-prototype.0.1.0`, so assessors never mistake it for stock OZ code.

### `contracts/src/accounts/SessionCallExecutor.sol`

ERC-7579 executor module. Per account (keyed by `msg.sender`, so only an owner-authorized account execution can configure it):

- `grantSession(agent, target, selector, validAfter, validUntil, maxCalls)` → session ID bound to chain, module, account, epoch and nonce.
- `executeSession(account, sessionId, callData)` — callable only by the session's agent; requires the active window, the current epoch, not revoked, `selector` match and remaining calls. It makes exactly one **single-mode, zero-value** call `account → target` via `executeFromExecutor`. Usage is incremented before the external call; `nonReentrant`.
- `revokeSession`, `revokeAllSessions` (epoch bump), and `onUninstall` → epoch bump, so reinstalling never resurrects sessions.
- Grant rejects: zero/self agent; target that is the account, the module, the agent or codeless; windows that are empty, past, longer than 7 days, or starting more than 7 days away; `maxCalls` 0 or >100; and **forbidden selectors**: ERC-20/721/1155/2612 transfer and approval, ERC-7984 `setOperator`/`confidentialTransfer*`/`wrap`/`unwrap` (selectors derived from the pinned `@zama-fhe/sdk` 3.7.1 ABI), module install/uninstall, `execute`, `executeFromExecutor`, and UUPS upgrades.

### Deliberately absent

- **Amount caps.** Confidential (ERC-7984) amounts are encrypted handles. A plaintext cap would be meaningless or a privacy leak. An FHE-aware encrypted budget belongs to Milestone 3 and is why token-movement selectors are refused outright here.
- **Target registry.** The owner chooses the target. The deny-list is not exhaustive (a non-standard token function could move value), so production sessions must be restricted to a reviewed, verified confidential venue registry — none exists yet.
- **Recovery and owner rotation**, a factory/counterfactual deployment, a real EntryPoint/bundler flow, ERC-1271 owner signing through the account, and a hook-based global policy.

## Evidence (2026-11-27)

- `contracts/test/SessionCallExecutor.t.sol`: **20 tests** — delegatecall refusal; outsider and owner-EOA cannot `execute`; only the owner signature validates a UserOp (Foundry ephemeral test key; the outsider cannot call `validateUserOp`); outsider cannot install; the executor cannot be installed as a validator; agent call lands with `msg.sender == account`; grant requires an installed module; 11 unsafe-grant rejections; non-agent/owner-EOA execution denied; cross-account replay denied; selector scope; call limit; expiry; not-yet-valid; revoke is immediate and namespace-isolated; revoke-all; uninstall/reinstall does not resurrect; deny-list coverage; fuzz: only the granted selector executes (512 runs); fuzz: calls never exceed the limit (512 runs).
- `tests/session-executor-local.test.ts` (live Anvil): deploy → Milestone 1 assessor reports `self-reported-erc7579`, hook support, no delegatecall → outsider install rejected → owner install and grant (EntryPoint address impersonated via `anvil_impersonateAccount`; no key) → agent call from the account → wrong caller, wrong selector, forbidden `approve` grant, and over-limit all rejected on-chain → revoke-all immediately deactivates.
- Slither 0.11.6, all detectors: the account has only a dead-code false positive on `_rawSignatureValidation` (reached through OZ virtual dispatch, proven by the signature test); the executor has only Low timestamp findings for its session windows. Both are added to `scripts/security-scan.py` with file- and function-exact triage.

## Owner-facing permission preview (2026-11-27)

`packages/shared/src/session-permission.ts` mirrors `grantSession` exactly (same limits, same deny-list, same check order) and returns a plain-language summary, rejection reasons and the fixed blockers, with `canSign/canGrantSession/canInstallModule/executionAllowed: false`. It is exposed read-only as the local MCP tool `agent_session_permission_preview`: an agent can propose a session and the owner reviews what it would allow. It accepts no calldata, amount, key or signature fields and returns no transaction payload.

Parity is enforced three ways: `tests/session-permission.test.ts` parses the Solidity source for the selector list and limits; `tests/session-permission-local.test.ts` sends 90 seeded grants (≈⅓ valid, ≈½ single-dimension invalid, rest random) to the deployed executor at exact block timestamps and requires identical accept/reject verdicts **and** identical first revert reasons; a deliberate mutation (call limit 100→99) was confirmed to fail both tests. Two checks need chain state and are always reported as remaining: target has code, executor installed.

## Next steps in Milestone 2

1. Review the OZ 5.6.0→5.6.1 diff for account files; seek an independent review of this composition and module before any Sepolia deployment.
2. Real ERC-4337 flow on Anvil: deploy EntryPoint v0.8 from a verified artifact, build and sign UserOperations, and replace EntryPoint impersonation in tests.
3. Owner recovery/rotation design (e.g. a reviewed multi-signer or guardian module) and a factory with deterministic addresses.
4. A hook enforcing account-wide invariants (e.g. deny forbidden selectors for every executor, not only this one).
5. Connect to the Milestone 3 venue: session target and selector restricted to a verified confidential venue, plus an encrypted budget.
6. Backend: persist owner-approved session grants as audit records (never as authority), and show them on `/agents` only after on-chain confirmation.
