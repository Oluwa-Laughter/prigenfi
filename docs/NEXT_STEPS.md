# Next engineering milestones

## 1. Verify the real Sepolia confidential lifecycle

Founder provisions a dedicated PrigenFi test-only injected wallet with limited faucet ETH; do not share/export its key. Use current verified wrapper registry, mint a small mock amount, shield with exact approval, authorize a scoped decryption permit, decrypt locally, confidentially transfer to a second test address, and verify SDK receipts plus receiver access. Exercise unshield proof/finalization, service failure, unauthorized decryption and wallet/network switching. Add a reviewed nonsecret pending-unshield recovery journal across reloads. Preserve transaction/block/version evidence without plaintext balances or credentials. No public PrigenFi contract deployment is necessary to test existing official wrappers.

## 2. Add authenticated durable developer sessions

Implement SIWE with single-use challenge, domain/URI/chain/expiry checks and ERC-1271 support; wallet association and tenant authorization before any private endpoint. Add PostgreSQL migrations, typed queries and tests using two users for isolation. Persist agent registry, permissions, idempotent proposals and public audit metadata without private balances. Add OAuth-protected Streamable HTTP MCP with issuer/audience/resource/scopes validation and explicit tests for token passthrough and cross-tenant access. OAuth must never imply spending authority.

## 3. Integrate a vetted smart account and durable execution boundary

Select an established ERC-4337 account and audited ERC-7579-compatible session module from verified current upstream documentation. Keep isolated vault policy as a second boundary; test target/selector/caps/nonce/expiry/revoke across account and vault. Add actual bundler simulation, local/testnet operations, typed domain-bound intent signatures if needed, durable queue/idempotency, reorg/finality reconciliation and supported mock adapter only. A real confidential swap/vault adapter follows only after a venue and interfaces are fully verified and safely exercised. Do not relabel token transfers as trading.

## Before continuing

Read AGENTS, PRODUCT, ARCHITECTURE, DECISIONS and BUILD_STATUS. Check GitHub main/CI and local git state. Implementation commit 0dbf583 passed run 42368330390; capacity-hardening commit 24f25a6 passed both verify and security in run 42369083979. Do not assume later commits passed without checking their own status. Verify installed versions and official SDK docs rather than importing old session assumptions. Run the local deployment/integration tests from a fresh Anvil state. Do not disable security checks, introduce fake metrics, or expose local services remotely.

## Product milestones following the November 8 UX refresh

1. Make the mandate a durable owner-authorized workflow: authenticated user session, agent registration, per-user scoped market selection and policy mapping. The current copy-only mandate is a UI draft, not a working trading agent.
2. Integrate a vetted ERC-4337/7579 session model and policy-enforced adapter that separates research/proposals from executable orders. Build negative tests for unsafe agent calls, cross-chain execution and revocation.
3. Verify a supported Sepolia confidential trading venue and integrate Zama cUSDC/cUSDT/cZAMA/cWETH test assets with real FHE proof flows, without exposing decrypted values to MCP. If no compatible venue exists, report the blocker and keep swap execution disabled.
4. Add a trustworthy market-data source, risk accounting, audited execution state machine and real receipts to support ETH/ERC-20 markets across approved EVM chains without claiming confidentiality where unavailable.
5. Replace copy-only agent brief with authenticated MCP submission once authorization and execution safety exist; deliver monitoring, reporting and self-service permissions in the dashboard.

## Priorities after market/product expansion

1. **Real user agent lifecycle:** SIWE-backed tenancy, agent identity registry, durable mandates and a secure MCP authorization boundary between natural-language intent and on-chain wallet policies.
2. **Market venue integrations:** validate Ethereum DEX aggregators, token risk checks, liquidity/price-oracle sources and quote freshness; start with one **verified confidential** testnet route only; never execute a public-market fallback. Research meme markets and DeFi protocols without claiming all assets are supported for execution.
3. **Real confidential trade proof:** independently verify a Zama-compatible confidential swap/venue on Sepolia, FHE integration, token approval/operator risks, slippage/finality and permissions. If no venue exists, retain disabled execution and document the blocker.
4. **Verified performance and history:** persist signed intents, receipts, fills, cost basis, gas/fees, position closes and agent identity under an indexer; backfill/reorg reconciliation and feed the chart interface only with finalized records.
5. **Wallet experience:** audited modular smart-account/session keys, constrained financial risk policies and safe revocation independent of agent text; integrate the account workflow into the new app navigation.
6. **Product hardening:** persistent onboarding, user accounts, signed wallet connection, exact live market source handling, accessibility review, external testnet wallet acceptance, security review and user research before enabling real funds.

## Confidential agent execution milestone after seven-wrapper verification

1. **Confidential venue feasibility:** select one genuine ERC-7984/FHE-compatible swap or DeFi protocol, verify deployment/version/invariants, permission flow, liquidity and slippage; write a reproducible on-chain test including encrypted inputs, proof handling and receipt finalization. If no suitable venue exists, prototype a separately audited FHE strategy adapter in an isolated test harness, but do not deploy as a service.
2. **Actual agent comprehension:** provision a real LLM/agent runtime through an authenticated MCP session with wallet-linked identity and scoped private strategy instructions; validate output against a typed schema and independent risk policy. Instructions and decrypted balances must never enter public quote endpoints or logs.
3. **Enforce private-only execution:** integrate user wallet session permissions and an on-chain/FHE-bound venue gate. No plaintext fallback, unreviewed arbitrary calls or leaked amounts; negative test unsupported tokens, missing ciphertext permissions, stale quotes, market manipulation, revoked agent, wrong signer/chain and expiry.
4. **Evidence and reconciliation:** execute strictly funded testnet lifecycle after owner approval, persist only privacy-safe audit metadata, track finality and reorgs, then unlock genuine P&L/win-rate charts based on finalized settlements. No guarantee of profits.
5. **Progressive UX:** expand portfolio and activity from read-only registry to wallet-confirmed confidential balances, private-order statuses, personal risk controls and explainable agent decisions, tested on 320px through desktop.

## From typed research proposals to actual confidential trading

1. Implement authenticated wallet-linked agent sessions and a real LLM runtime without logging or exporting confidential instructions; validate all model output with agentPlanSubmissionSchema.
2. Independently reproduce one FHE-compatible confidential swap or DeFi venue on Sepolia, including proofs, gas, liquidity and receipt finality; no public fallback.
3. Implement session-limited smart accounts with enforced spend caps and owner revocation; the planning tool is not an authorization step.
4. Reconcile finalized encrypted transactions into privacy-safe user records before enabling any realized-PnL or win-rate analytics.

## From deployed swap proxy to an actual confidential trade

The official Sepolia ConfidentialSwap RFQ proxy now has a reproducible on-chain evidence snapshot and UUPS implementation check. Next: (1) obtain official verified implementation source and pinned RFQ ABI, (2) identify and independently query any public supported-token and whitelist views, (3) reproduce confidential order input encryption and RFQ settlement with signed testnet consent, (4) integrate restricted smart-account/session authority that separately enforces target, selector, pair, token spend, expiration and revocation, (5) persist only privacy-safe settlement records and test refunds, failed fills and reorgs. Do not assume the mainnet pair list applies to Sepolia. The live proxy inspector MUST remain read-only and the execution feature MUST remain disabled through these steps.

## Priority after live multichain market research — November 9, 2026

1. Implement real user authentication (EIP-4361 SIWE, ERC-1271 smart-account verification), session persistence, tenant-scoped agent identities, revocation and safe private-instruction storage. A connected wallet or MCP host alone is not authenticated authorization.
2. Select and independently verify an actual Zama-compatible confidential execution adapter on its documented chain and supported asset pairs. Reproduce an encrypted order, consented session policy, final settlement and recovery on a funded Sepolia test wallet. **No public DEX fallback** and no universal cross-chain FHE claims.
3. Build a durable agent workflow: user goal → host-model structured research → source-stamped market evidence → validated private route → explicit wallet policy approval → scoped execution → verified receipts. Use actual data and idempotency boundaries; never advertise guaranteed profit.
4. Add a privacy-aware journal and cost-basis reconciliation before win rate, P&L, or portfolio performance is displayed. Resist manipulated market metadata, chain forks and cancelled fills.

## From local agent tools to an authenticated user agent — November 9, 2026

The dedicated default local MCP research connection and independent handshake doctor now exist, with Codex and Claude configuration generator and workspace onboarding page. **Next**: (1) SIWE/ERC-1271 owner sessions and cryptographic agent registration; (2) scoped smart-account policies that distinguish explicit approval from AI text; (3) OAuth-protected multi-tenant remote MCP with resource/audience/scope validation, rate limits and isolated secrets; (4) independently verified FHE private execution per supported chain and token pair, plus durable jobs, expiry/revoke and real settlements; (5) only then attach authenticated fills to realized P&L. No remote or on-chain execution should be activated just because a local MCP host successfully connects.
