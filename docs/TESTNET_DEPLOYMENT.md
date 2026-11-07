# Testnet deployment

## Actually deployed

Only local Anvil, chain ID 31337. `pnpm local:deploy` deploys VaultFactory and MockUSD, creates a vault owned by the first unlocked account, authorizes the second account to send to the third, and mints 100 local mock tokens to the vault. Permission caps are 10 tokens per operation and 20 per UTC day, expiring after 24 hours. Addresses in `.local/deployment.json` are environment-specific and not public deployments.

The browser can deploy another AgentVault directly from the generated artifact. Factory events and runtime verification demonstrate ownership; ERC-4337 is not integrated.

## Local restrictions

The script requires loopback RPC hostname, actual chain ID 31337 and unlocked public test accounts. It never loads a private key. Anvil must run with `--silent` so its standard startup output does not print development keys. Do not expose Anvil RPC publicly.

## Public Sepolia status

No PrigenFi contract has been deployed on Sepolia. No dedicated PrigenFi testnet signer was provisioned. Existing official Zama wrappers were inspected using read-only RPC calls; these are not PrigenFi deployments.

A public deployment requires a dedicated founder-provisioned test-only wallet with limited faucet ETH, owner review, freshly passing tests/security review, a repeatable deployment/verification procedure and saved chain/transaction/block provenance. Use wallet-mediated signing; never paste a private key or seed phrase into this repository, an agent or a chat. Mainnet execution stays disabled.

## Confidential lifecycle verification still required

Connect the dedicated wallet on Sepolia, verify wrappers, obtain 100 mock underlying tokens, shield a small amount with exact approval, explicitly authorize decryption, decrypt locally, transfer confidential tokens to a second authorized test address, and verify receipts plus receiver balance. Test unshield/finalization and interrupted recovery separately. Do not record plaintext balances in shared logs or screenshots. Save transaction hashes, blocks, contract metadata, SDK versions and outcome only.
