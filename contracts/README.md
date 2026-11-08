# PrigenFi smart-contract development sandbox

This Solidity workspace currently contains **development-only isolated ERC-20 vault controls** and tests. It demonstrates owner authority, approved agent address/token/recipient, transfer caps, expiry, nonce controls, pause and revoke. It is **not** an ERC-4337 smart account, a confidential trading engine, a deployed user agent or a cross-chain DeFi execution protocol.

Users instruct agents in the PrigenFi product. **Ordinary users should not deploy a contract when requesting a trade.** Contract deployment is an operator/developer concern, and any future audited protocol or smart-account modules must be deployed and governed through a separate, reviewed operational process.

This workspace is local Anvil first. Only use `pnpm local:deploy` for local chain ID 31337 and unlocked test accounts. Run `pnpm test:contracts` for Foundry unit, adversarial, fuzz and invariant tests. No mainnet deployments or real assets are permitted. Confidential Zama assets are handled separately in verified SDK/contract integrations; this public ERC-20 vault must never be marketed as private trading.
