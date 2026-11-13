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

## After wallet-authenticated agent research profiles — November 11, 2026

The app now has real SIWE/EIP-1271 wallet sign-in and durable owner-scoped **research-only profiles** when a dedicated Postgres instance and exact host origin have been configured. Next integrate agent host identity attestation and **OAuth-protected Streamable HTTP MCP with wallet session association**, using delegated public-research rights only. Then implement audited smart-account session authorization with transaction targets/selectors, token budgets, expiry, replay protection and immediate revocation. Confirm ERC-1271 signer-change invalidation before any valuable action. Support Zama private execution only after an independently reproduced encrypted order→settlement lifecycle; never select an unverified public route as a confidential fallback. Add a real private job journal and finalized receipts before reporting realized performance.

## After authenticated research-only Streamable HTTP — November 11, 2026

The remote MCP transport now uses owner-scoped, independently revocable research tokens and verified network/market restrictions. **Before broad external availability**, replace preview bearer provisioning with standards-compliant OAuth 2.1 protected-resource/server discovery, consent and audience-validated access/refresh credentials. Add documented client re-registration and signed session association, distributed abuse monitoring, credential leak alerting, account/session invalidation on ERC-1271 signer changes and independent security review. Separate trading authorization remains an audited smart-account delegation with per-token/venue limits and explicit revocation, and actual confidential settlement depends on a proven FHE-compatible venue. Do not conflate public research with encrypted execution.

## Risk research and verified upgrade governance — November 11, 2026

The next financial-engineering gates are independent on-chain token bytecode/owner/tax verification, a second trusted liquidity/finality source (DEX Screener alone is not independently attested), supported-chain-specific encrypted venue reproduction, time-series and survivorship-bias-safe strategy evaluation, and auditable trade journal/execution reconciler. None is replaced by a simple current-pool risk class. Before a truly upgradeable custody contract exists, specify who can upgrade user assets, multisig/timelock/exit policy, storage layout validation and authorization tests, and acquire independent audit. The new upgradeable policy registry is noncustodial and not wired into spending. Existing immutable AgentVault deployments must not be silently converted.

## After the research emergency guardian — November 11, 2026

Before any financial authority, validate actual V1-to-V2 ERC-7201 storage layouts with independent upgrade tooling, provision audited multisig/timelock and incident monitoring, and enforce on-chain smart-account transaction policy separately from research screening. Add OAuth 2.1 audience-bound remote MCP tokens and ERC-1271 signer-change invalidation before opening hosted access. Private trades remain blocked pending an independently reproduced FHE-compatible venue lifecycle.

## After aggregate token-budget enforcement — November 11, 2026

1. Replace the development public-transfer vault with a separately reviewed account-abstraction and ERC-7579 policy module that enforces signed, owner-acknowledged venue/selector/token limits on chain and cannot be weakened by model prompts or off-chain approvals. Do not silently change immutable existing vaults.
2. Verify a real Sepolia encrypted trade and confidential settlement with independent source/interface/ACL/quote/finality evidence before enabling any private agent execution. The public vault transfer is **not** a confidential swap.
3. Introduce multi-asset fiat-equivalent risk budgets only after independently trusted, stale/reorg-aware price/oracle sources, token decimals, manipulation controls and loss accounting exist; never treat the shared base-unit cap as cross-asset exposure.
4. Complete ERC-1271 signer-change session invalidation, OAuth 2.1 remote MCP consent/audience validation, durable privacy-safe job records and independent protocol review.

## After hosted public research and portable skills — November 11, 2026

1. Before enabling public MCP on the deployed domain: confirm configured HTTPS origin, dedicated Postgres, applied migration, untrusted network/Host/Origin handling, upstream quotas, WAF and request monitoring, load-testing, and an independent review of public tool schemas. Keep both public and scoped remote gates off until operations are ready. Anonymous shared global rate control does not provide per-user fairness.
2. Complete OAuth 2.1 protected-resource and authorization-server discovery for the wallet-owned remote MCP. The currently revocable bearer preview is not a long-term account authorization system; never let public MCP bypass a denied profile.
3. Independently reproduce one encrypted Zama Sepolia crypto pair's order-to-finality lifecycle before enabling financial execution, and separately audit smart-account session permissions and on-chain loss/exposure limits. Do not claim any crypto wrapper makes a DeFi pool confidential.
4. Maintain the crypto-only cUSDC/cUSDT/cZAMA/cWETH product allowlist and test rejection of excluded reference/FX wrappers at SDK, MCP and wallet boundaries. Historical verification records remain archived as evidence only.
5. Add a signed, operator-maintained skill manifest with digest/version pinning and a dedicated deployment/host handshake smoke. Do not auto-run downloaded scripts or silently install arbitrary external skills.

## After persisted research workspace UX — November 11, 2026

1. Provision and migrate the **actual production** owner-authenticated database (including `0004_owner_market_watchlist.sql`) only after backups/approval; verify deployed HTTPS origin, configured chain RPC, session policies, production preview isolation and telemetry with no secrets. Code and local Anvil/Postgres integration alone do not prove hosted user readiness.
2. Add a durable, privacy-minimized research audit trail for user-initiated market checks before promising strategy operations; avoid storing plaintext personal goals or encrypted wallet balances. A bookmarked public pool isn't a trade or a position.
3. Finish independently verified Zama-compatible confidential execution, owner-signed smart-account permissions and finality reconciliation before enabling real spending, private swaps or financial performance reports.
4. Implement owner-initiated export/delete for stored public watchlists, account data retention policy, cross-device UX and independent accessibility review. Watchlist privacy depends on controlling who can see owner-linked research preferences in the backend.
5. Keep the Fastify service narrow unless a concrete source-backed, explicitly authorized backend capability justifies expanding it; do not duplicate SIWE/session or issuer authority across services.

## After self-service public watchlist ownership — November 12, 2026

1. Implement full user-directed export/deletion and retention for all **research account** records (profiles, hashed connection keys, sessions), with verified owner scope and active-agent revocation. Today's `CLEAR MY MARKETS` affects only public market bookmarks, not the entire account or blockchain.
2. Verify a real external HTTPS deployment with migrations and wallet sign-in; local Anvil/Postgres and GitHub CI cannot certify deployment readiness or security.
3. Implement owner-controlled audited smart-account sessions and independently reproduced confidential Zama market execution before enabling any private autonomous trade; no public DEX fallback.
4. Add a minimal, privacy-safe durable research journal only with explicit consent. Do not store plaintext private goals, confidential balances, agent prompts or speculative P&L to fill a dashboard.
5. Harden ERC-1271 signer-change invalidation, OAuth 2.1 audience-bound hosted agent connections, finality/indexer reconciliation and independent security review before real funds.

## After two-observer Zama venue verification and non-executable session review — November 12, 2026

1. The verified Sepolia proxy has identical code identity across two separately operated RPC services at a common recent block, but source/ABI, supported Sepolia RFQ pairs and encrypted order lifecycle remain **unverified**. Obtain audited, pinned implementation source and method selectors and separately verify live supported token and maker/liquidity views. Never substitute mainnet pair announcements for testnet evidence.
2. Review an actively maintained ERC-4337/7579 account and its compatible session validator/hook from pinned official repositories. Current `confidential-session-review` accepts strict public metadata but cannot sign, install a module, enforce encrypted exposure, verify replay onchain or authorize funds. Do not deploy a custom pseudo-session module as a wallet guardian.
3. Reproduce one explicit unbacked **Sepolia** confidential crypto pair's input proof → correct ACL/operator permissions → RFQ quote → finalized fill OR refund and reorg handling with a dedicated approved funded test wallet. If the venue lacks a testnet pair, report the blocker and do not broadcast generic public transfers as substitutes.
4. Only once onchain account authority and real FHE execution work independently, add privacy-safe receipt reconciliation and a tightly constrained agent job engine. Mainnet remains disabled and every client/MCP capability remains research-only.
5. Re-run `pnpm verify:swap:quorum` after proxy upgrades or provider incidents; it never enables execution and only records a new snapshot with explicit `--write-evidence` after both observers and reviewed baseline match. See `docs/CONFIDENTIAL_EXECUTION_FOUNDATION.md`.

## After dynamic ERC-1271 authority hardening — November 13, 2026

1. Wallet research sessions now re-check original ERC-1271 signature validity against current contract state, with at-rest AES-GCM proof encryption, session-bound remote research MCP credentials and automatic owner/chain revocation after signer rotation. **This protects research access only.** Test real external Sepolia smart accounts and nonstandard ERC-1271 implementations before allowing broad hosted customer access; RPC outages cause a fail-closed unavailable state.
2. Provision the operator-held `PRIGENFI_AUTH_PROOF_KEY` and deliberately apply `0005_erc1271_session_authority.sql` after a backup and reauthentication notice. It invalidates previous sessions and hosted credentials by design; do not run it automatically against the production DB. Verify live HTTPS origin, recovery/rotation handling, monitoring, and audited key management.
3. Acquire independently verified implementation source, RFQ ABI and supported confidential pairs for Zama's Sepolia venue. Reproduce ciphertext-proof, owner ACL, quote, fill/refund, and finality against a dedicated explicit-authorized testnet wallet before enabling even Sepolia agent finance; public-source/bytecode checks alone do not suffice.
4. Vet and integrate an externally reviewed ERC-4337/7579 smart-account/session validator that enforces **onchain** owner authorization, target/selector/asset-bound hidden budgets, replay protection and immediate revoke. Do not convert EIP-4361 login or an ERC-1271 research bearer into a UserOperation signature or tradable spend token.
5. Only after encrypted testnet execution and independently audited permissions, build privacy-safe finality/reorg accounting and authorize an explicitly gated mainnet release. OAuth 2.1 host consent and external security review remain required before financial execution.
