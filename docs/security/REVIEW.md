# Initial security and specification review

Scope: new repository foundation, focusing on AgentVault, factory, local mock, SDK policy, MCP authorization boundary, wallet controls and private browser state. There was no preexisting commit/history to diff or blame. This is an implementation review, not an independent audit. First-party code and one-hop dependency surfaces were reviewed; dependency internals and FHE cryptography were not audited.

## Entry points

| Contract / function                       | Access                          | Effects / constraints                                                            |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| VaultFactory.createVault                  | Public                          | Deploys new vault owned by caller; chain guard in vault constructor              |
| AgentVault.setPermission                  | Owner                           | Sets one agent/token/recipient, resets budget; 30-day maximum expiry             |
| AgentVault.revoke                         | Owner                           | Deactivates that tuple; nonce retained                                           |
| AgentVault.setPaused                      | Owner                           | Pauses agent execution; does not block owner recovery                            |
| AgentVault.withdraw                       | Owner + reentrancy guard        | ERC-20 transfer to selected recipient                                            |
| AgentVault.executeTransfer                | Scoped agent + reentrancy guard | Fixed selector; token, recipient, amount, budget, expiry, nonce and chain checks |
| MockUSD.mint                              | Public, local-only deployment   | Faucet with per-call cap, no monetary value                                      |
| MockUSD.transfer / approve / transferFrom | Standard ERC-20                 | Inherited OpenZeppelin behavior, ordinary public token semantics                 |

No proxy, delegatecall, upgrade entry point, payable receive/fallback, oracle, signature verifier, random number generation or trading venue exists in custom production contracts. Slither function-summary, vars-and-auth and inheritance-graph printers were run; direct solc detector runs are authoritative because the Foundry export initially produced parser/reference warnings.

## Static analysis

Slither 0.11.6 / crytic-compile 0.4.2 with native solc 0.8.30. The direct solc path analyzes all three production entry files with all 102 detectors and no incomplete-reference warnings. Two low-severity timestamp findings apply to AgentVault (also reachable through the factory import): expiry and UTC-day comparisons. They are required policy time boundaries, not randomness or sub-block trading deadlines. Validators have limited timestamp influence; budgets can change at UTC boundaries. This limitation is documented and accepted for testnet policy.

`scripts/security-scan.py` fails on parser failure or any finding outside that precise timestamp category/source; findings are not globally disabled. Local reports live in `.local/security`. No clean-audit claim is made.

## Review fixes

- Runtime identity checks were added before existing vault ownership is trusted; ABI conformance alone was insufficient.
- Private FHE caches use separate memory stores and keyed provider remounts, rather than persisting plaintext/permits or sharing a global query cache.
- SDK event reads were narrowed to the configured agent.
- Exact amount parsing rejects excess fractional precision rather than silently rounding.
- Direct transfer actual debit is checked to reject fee-on-top behavior.
- Concurrent proposal insertion performs second idempotency and capacity checks after the awaited simulation. A 101-request regression reproduces the former overflow and verifies exactly 100 acceptances after the fix.
- The light-theme button link contrast was corrected after visual review.

## Specification compliance

| Requirement                                                 | Evidence / status                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Isolated capital and owner authority                        | Contracts + Foundry negative/fuzz/invariant tests + Anvil browser controls             |
| Scoped target/selector/token/cap/expiry/nonces/revoke/pause | Fixed transfer path; no arbitrary execution; tests                                     |
| Shared typed SDK and MCP tools                              | Runtime schemas, block-consistent reads, external client integration                   |
| Official confidential token tooling                         | SDK/React SDK 3.7.1, real registry/code/decimal/rate reads; write lifecycle unverified |
| Wallet connect and responsive product routes                | Production build; Playwright desktop/mobile and actual Anvil owner transactions        |
| Real confidential trading                                   | Not implemented; no verified venue                                                     |
| ERC-4337/7579 smart accounts                                | Not implemented; isolated-vault milestone only                                         |
| Remote OAuth / backend sessions / tenancy / PostgreSQL      | Not implemented; no private hosted APIs                                                |
| Agent framework / prices / strategies / durable execution   | Not implemented; external structured MCP simulation only                               |
| Mainnet                                                     | Disabled in financial creation/execution paths                                         |

## Remaining high-priority validation

Real dedicated-wallet Sepolia lifecycle including ACL failures, pending-unshield recovery across reload, production browser security headers/CSP, audited account/session module integration, backend authentication/tenant isolation, remote MCP OAuth validation, token allowlisting/code-upgrade risk and reorg-safe durable reconciliation. Current tests are not evidence of these future properties.
