# Next engineering milestones

## 1. Verify the real Sepolia confidential lifecycle

Founder provisions a dedicated PrigenFi test-only injected wallet with limited faucet ETH; do not share/export its key. Use current verified wrapper registry, mint a small mock amount, shield with exact approval, authorize a scoped decryption permit, decrypt locally, confidentially transfer to a second test address, and verify SDK receipts plus receiver access. Exercise unshield proof/finalization, service failure, unauthorized decryption and wallet/network switching. Add a reviewed nonsecret pending-unshield recovery journal across reloads. Preserve transaction/block/version evidence without plaintext balances or credentials. No public PrigenFi contract deployment is necessary to test existing official wrappers.

## 2. Add authenticated durable developer sessions

Implement SIWE with single-use challenge, domain/URI/chain/expiry checks and ERC-1271 support; wallet association and tenant authorization before any private endpoint. Add PostgreSQL migrations, typed queries and tests using two users for isolation. Persist agent registry, permissions, idempotent proposals and public audit metadata without private balances. Add OAuth-protected Streamable HTTP MCP with issuer/audience/resource/scopes validation and explicit tests for token passthrough and cross-tenant access. OAuth must never imply spending authority.

## 3. Integrate a vetted smart account and durable execution boundary

Select an established ERC-4337 account and audited ERC-7579-compatible session module from verified current upstream documentation. Keep isolated vault policy as a second boundary; test target/selector/caps/nonce/expiry/revoke across account and vault. Add actual bundler simulation, local/testnet operations, typed domain-bound intent signatures if needed, durable queue/idempotency, reorg/finality reconciliation and supported mock adapter only. A real confidential swap/vault adapter follows only after a venue and interfaces are fully verified and safely exercised. Do not relabel token transfers as trading.

## Before continuing

Read AGENTS, PRODUCT, ARCHITECTURE, DECISIONS and BUILD_STATUS. Check GitHub main/CI and local git state. Verify installed versions and official SDK docs rather than importing old session assumptions. Run the local deployment/integration tests from a fresh Anvil state. Do not disable security checks, introduce fake metrics, or expose local services remotely.
