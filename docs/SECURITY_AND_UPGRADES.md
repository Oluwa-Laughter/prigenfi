# Safe upgrades and capital isolation

## Current vault: deliberately not upgradeable

`contracts/src/AgentVault.sol` uses a constructor, `immutable owner` and an explicitly restricted ERC-20 transfer permission mechanism. `VaultFactory.createVault()` deploys `new AgentVault(msg.sender)` directly. There is **no EIP-1967 proxy** around this vault and no UUPS upgrade function. Describing it as upgradeable would be incorrect. The vault is a local/testnet transfer-isolation prototype, **not** a confidential smart account or a live trading vault. Never silently wrap or convert deployed capital contracts into proxies: doing so would change trust, storage and recovery assumptions.

## Separate upgradeable public research-policy reference

The new `contracts/src/AgentSafetyPolicy.sol` uses the **installed pinned OpenZeppelin 5.6.1 libraries** `UUPSUpgradeable`, `Ownable2StepUpgradeable`, and `Initializable` with an EIP-1967 proxy in the Foundry tests. It keeps its own ERC-7201 namespaced storage, locks its implementation initializer, and uses two-step ownership transfer.

Its protocol-level **public research** settings include max slippage basis points, max model-research allocation basis points and minimum public pool liquidity. They do not grant execution and are not individual users' private strategies. `assessResearch()` returns two booleans: whether the public research parameters are within the configured screen, and **`executionAllowed=false` always**. The contract **does not hold tokens, move funds, approve a wallet, manage ciphertext, mint assets, or replace AgentVault**. The web, SDK and MCP interfaces have not been told to trust it as an on-chain authorization oracle.

## Governance and upgrade design

Only its current owner can schedule an implementation upgrade; the new implementation must have deployed code and its exact `codehash` is pinned to the schedule. The schedule must wait **at least 48 hours**; execution is invalid after a further **7-day expiry window**. The owner can cancel, and completed upgrades consume the schedule. Pending upgrades are automatically **invalidated when ownership changes**, so a new owner does not inherit an unseen queued implementation. Direct implementation UUPS upgrades are rejected; incompatible new implementations are rejected by OpenZeppelin's UUPS/ERC-1822 compatibility checks; the implementation is locked against initializer takeover. `renounceOwnership` is disabled to avoid accidental permanent loss of the policy-management account.

These are useful controls, but they **do not make any administrator-operated upgrade trustless**. A future upgrade might add unsafe behavior if approved by an authorized key. A production deployment requires an externally reviewed and appropriately configured **multisig / timelock governance**, off-chain upgrade proposal review, verified source code and storage layout checks, incident rollback/response playbooks and user-facing disclosures. No upgrade or deployment was broadcast to a public chain in this milestone.

`contracts/test/AgentSafetyPolicy.t.sol` exercises proxy initialization, owner-only settings, the nonexecuting research screen, delay/cancellation/expiry, wrong implementation, UUPS incompatibility, successful post-delay upgrade with storage preserved, and two-step owner transfer invalidating queued upgrades. The test-only V2 implementation is not intended for production deployment.

## Hard requirements before live agent finance

Financial safety cannot be reduced to UI styling or a single DEX market score. Before actual confidential autonomous trading: independently verify Zama FHE ciphertext lifecycle and ACL grants; implement consented smart-account session policies with approved targets/selectors, token budgets, expiry, nonce replay protection, transfer loss caps and immediate revocation; prove swaps through independently verified encrypted venues; keep job and transaction journals with chain finality reconciliation; test upgrade and emergency-pause governance; commission independent security review. On-chain and off-chain risk controls must reconcile rather than trusting model-generated assertions.

References: [OpenZeppelin Upgradeable contracts](https://docs.openzeppelin.com/contracts/5.x/upgradeable), [OpenZeppelin UUPS](https://docs.openzeppelin.com/contracts/5.x/api/proxy), [Writing upgradeable contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable), [Zama ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl).
