# Smart-account compatibility assessment (ERC-7579) — Milestone 1

Updated 2026-11-27. **Read-only engineering capability, not an account integration.** Nothing in this milestone signs, sends a UserOperation or transaction, installs a module, grants a session, approves a token or moves value. A positive assessment is not authority, not a security review and not an audit.

## Why this exists

PrigenFi's execution path requires an owner-controlled smart account that enforces narrow, revocable agent permissions on-chain. Before selecting a stack (Milestone 2) we need a trustworthy way to inspect what a deployed account actually exposes. ERC-7579 answers are **self-reported contract output**: any contract can return `true` from `supportsModule`. The assessor therefore separates:

1. **What the account claims** (`accountId`, module types, execution modes, ERC-1271 behaviour).
2. **Whether those claims are internally consistent with the spec** (negative probes).
3. **Whether its code identity matches an independently reviewed implementation** — the reviewed registry is **empty by decision** until a stack is chosen, reproduced from source and its audit evidence reviewed.

## Canonical sources

| Source                                                                        | How it was checked                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ethereum/ERCs` `ERCS/erc-7579.md` (status **Draft**)                         | Retrieved 2026-11-27 from raw.githubusercontent.com, SHA-256 `df9f94dd…776b3c2` recorded in `ERC7579_SPEC`. (`eips.ethereum.org` is not reachable from the build environment.)                                                   |
| `@openzeppelin/contracts@5.6.1` `interfaces/draft-IERC7579.sol`               | Lockfile-pinned. `contracts/test/Erc7579Fixtures.t.sol` asserts every interface selector equals the hard-coded `ERC7579_SELECTORS`; `tests/erc7579-assessment.test.ts` asserts viem-computed selectors match the same constants. |
| `@openzeppelin/contracts@5.6.1` `account/extensions/draft-AccountERC7579.sol` | Used unmodified as the honest local fixture. Its own NatSpec states supported module types (validator, executor, fallback — **no hooks**) and call types (single, batch, delegatecall — **no staticcall**).                      |

Spec points the assessor relies on: `supportsModule`/`supportsExecutionMode` **MUST** return false when unsupported; accounts **MUST** implement ERC-1271; ERC-165 is only **MAY**. Module types 1–4 are validator/executor/fallback/hook; ERC-7780 assigns 5–7, so negative probes use type `0` and `2^256-1`. Execution mode is `callType(1) | execType(1) | unused(4) | selector(4) | payload(22)`; call types `0x00` single, `0x01` batch, `0xfe` staticcall, `0xff` delegatecall; exec types `0x00` revert, `0x01` try.

## Implementation

- `packages/shared/src/erc7579-assessment.ts` (`@prigenfi/shared/erc7579-assessment`)
  - `assessErc7579Account(reader, request, reviewed?)` pins **one block** for every read (chain ID, code, ERC-1967 slot, every `eth_call`).
  - Accepts only `{chainId, account, modules[≤8]}` via a strict Zod schema; chains limited to **31337 and 11155111**; extra fields such as `signer` or `privateKey` are rejected.
  - Raw `eth_call` with **strict ABI decoding**: a bool must be exactly one word equal to 0 or 1; `bytes4` must have zero padding; `accountId` must be bounded printable ASCII.
  - Detects code kind: none (EOA/undeployed), plain contract, ERC-1967 proxy (identity = implementation code hash), EIP-7702 delegated EOA (identity = delegate code hash).
  - Negative probes: undefined module types and call/exec types; a deterministic **codeless phantom module** reported as installed; ERC-1271 acceptance of an **empty signature** for a fixed probe digest; requested modules whose `isModuleType` disagrees with reported installation.
  - Transport failures abort as `assessment-failed`; only genuine execution reverts are recorded as `reverted`. A dead RPC can never look like "unsupported".
  - Output always has `executionAllowed:false`, `canSign:false`, `canInstallModule:false`, `canGrantSession:false` and the blockers list below.
- `scripts/assess-smart-account.ts` → `pnpm assess:account --chain 31337 --account 0x… [--module validator:0x…[:0xcontext]]`. Loopback RPC for 31337; Sepolia requires operator-set `PRIGENFI_ASSESS_SEPOLIA_RPC` (HTTPS, never printed). Not exposed over MCP or HTTP.
- `contracts/test/helpers/Erc7579Fixtures.sol` — **test-only, Anvil-only**: `LocalOzErc7579Account` (OZ `AccountERC7579`, raw signatures disabled) with a `LocalDenyAllValidator` that fails every UserOp and ERC-1271 request; adversarial `LocalOverclaimingAccount`, `LocalMalformedAccount`; `LocalPlainContract`. None are PrigenFi accounts and none may be deployed publicly. They are not in the generated production ABIs.

## Classifications

| Classification             | Meaning                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `assessment-failed`        | Wrong chain or RPC failure. Fail closed.                                                                               |
| `no-contract-code`         | EOA or undeployed counterfactual account at that block.                                                                |
| `not-erc7579`              | No/malformed `accountId`, or missing validator support or single-call execution.                                       |
| `self-reported-unreliable` | Any spec-inconsistent or dangerous answer (overclaims, non-boolean, reverts, phantom module, accepts empty signature). |
| `self-reported-erc7579`    | Consistent self-report; code hash **not** in the reviewed registry. This is the best result any account gets today.    |
| `reviewed-implementation`  | Exact chain + identity code hash + `accountId` match a reviewed registry entry. Registry is empty; still no authority. |

Risk flags (informational, never permissive): `DELEGATECALL_EXECUTION_SUPPORTED`, `EXECUTOR_MODULES_CAN_BYPASS_USEROP_VALIDATION`, `FALLBACK_HANDLERS_EXTEND_ACCOUNT_SURFACE`, `NO_HOOK_SUPPORT_FOR_EXECUTION_POLICY`, `UPGRADEABLE_PROXY_IMPLEMENTATION_MAY_CHANGE`, `EIP7702_EOA_KEY_RETAINS_FULL_CONTROL`.

Permanent blockers in every result: `AUDITED_SMART_ACCOUNT_STACK_NOT_SELECTED`, `SESSION_VALIDATOR_NOT_INSTALLED_OR_REVIEWED`, `OWNER_SIGNED_SESSION_GRANT_MISSING`, `ONCHAIN_SPEND_LIMIT_AND_REVOCATION_UNPROVEN`, `CONFIDENTIAL_VENUE_UNVERIFIED`, `PUBLIC_FALLBACK_FORBIDDEN`.

## Observed results on live local Anvil (2026-11-27)

| Fixture                                                | Result                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OZ `AccountERC7579` + deny-all validator               | `self-reported-erc7579`; id `@openzeppelin/contracts.AccountERC7579.v1.0.0`; validator/executor/fallback true, hook false; single/batch/delegatecall true, staticcall false; ERC-1271 rejects probe; validator installed, wrong-type executor query false; flags delegatecall, executor bypass, no hooks. |
| Overclaiming account                                   | `self-reported-unreliable`: undefined capabilities, phantom module, empty-signature acceptance.                                                                                                                                                                                                           |
| Malformed account                                      | `self-reported-unreliable`: non-boolean config return and reverting mode query.                                                                                                                                                                                                                           |
| Plain contract / EOA                                   | `not-erc7579` / `no-contract-code`.                                                                                                                                                                                                                                                                       |
| EIP-7702 designator (via `anvil_setCode`) → OZ account | `eip7702-delegated-eoa`, identity hash equals the OZ account code hash, `EIP7702_EOA_KEY_RETAINS_FULL_CONTROL`.                                                                                                                                                                                           |
| Dead RPC                                               | `assessment-failed`.                                                                                                                                                                                                                                                                                      |

The deployer nonce is identical before and after all assessments: the assessor sent no transaction.

## What this does NOT establish

- That any production account (Safe7579, Kernel, Nexus, OZ-based, etc.) is safe, audited or suitable. **No public-chain account was assessed in this milestone.**
- That a validator/hook/session module enforces any spending limit. ERC-7579 has no standard query for policy contents.
- That module installation is owner-authorized, recoverable or revocable. Those are Milestone 2 properties that need on-chain tests, not self-report reads.
- Anything about confidential execution. A compatible account is necessary, not sufficient.

Important observation for Milestone 2: the OZ reference account **does not support hook modules** and **does support delegatecall execution**. A spending-policy design must therefore either use a stack with hook support, or enforce policy in a validator/session module, and must explicitly forbid delegatecall modes in its session scope.

## Milestone 2 selection gates (proposed)

A stack may enter `REVIEWED_ERC7579_IMPLEMENTATIONS` only after: (1) a recorded decision in `docs/DECISIONS.md`; (2) source reproduced to the deployed runtime code hash on Sepolia; (3) public audit reports read and their scope matched to the exact version; (4) a session/permission module (target, selector, value, per-period limit, expiry, revocation) with its own audit; (5) Anvil and Sepolia negative tests proving an unauthorized module install, expired/revoked session, out-of-scope selector, delegatecall mode and over-limit call all revert on-chain; (6) owner recovery and module-uninstall behaviour tested.
