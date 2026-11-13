# Engineering decisions

## 2026-11-07: isolated vault before account abstraction

Use a purpose-built testnet vault around OpenZeppelin SafeERC20 and ReentrancyGuard, with immutable ownership and one execution selector. This is not a custom ERC-4337 core. ERC-4337/7579 integration is deferred until a vetted session module and bundler can be integrated and independently tested. Separate account authority from financial policy when added.

## One frontend and shared authoritative contracts

Next.js hosts marketing, documentation, and wallet dashboard. pnpm workspaces define shared schemas and ABIs, the SDK, Zama integration, local MCP, and a public metadata API. Turborepo orders typechecks and caches the frontend build. Services without justified working functionality are not scaffolded.

## No private backend until authentication and tenancy exist

The metadata API binds loopback and exposes no private user routes. No database is needed for its public constants. MCP proposals are explicitly bounded, ephemeral, simulation-only records in one process, not durable transaction state. PostgreSQL, SIWE/ERC-1271 authentication, tenant scoping and migrations must precede durable private records and remote MCP.

## Narrow ERC-20 policy

Agent permissions are per vault, caller and token, with one recipient, per-operation and UTC-day budget, 24-hour UI expiry (contract maximum 30 days), persistent nonce and pause/revoke controls. Owner reauthorization intentionally resets the token budget. No approvals, arbitrary calldata, native transfers, signatures or swaps. Fee-on-top debit is rejected; fee-on-transfer receipt is not guaranteed. Arbitrary malicious token accounting remains untrusted.

## Current SDKs over legacy examples

Official Zama SDK 3.7.1 and React SDK 3.7.1 use Token/WrappedToken orchestration. Current Hardhat template still contains a deprecated relayer dependency, so it is researched but not copied. No custom FHE Solidity contract is required for wrapper integration. Real FHEVM integration testing remains distinct from ordinary Foundry tests.

MCP uses split official v2.4.0 packages and `serveStdio`, which supports the 2026-07-28 opening. No remote transport is exposed until OAuth validation is implemented.

## Privacy in browser memory

Confidential tools load on demand, use a separate query cache and SDK memory stores, and remount on wallet/chain changes. No analytics or decrypted values in errors. No delegated decryption or operator approval is exposed. Interrupted unshield recovery currently lasts only for the open SDK session; persistent recovery needs a reviewed nonsecret journal.

## Design direction

Midnight #09151e, slate #10212b, mint #8dddbd, pale text #edf4f5 and muted #a9bac3. Refined light mode uses #f5f8f8, white and deep green #176247. Neutral system sans typography, large compact headlines and an explicit wallet → permission → vault diagram describe the product without invented financial statistics. Marketing stays server-rendered; wallet and heavy FHE tools load only where used.

## November 11, 2026: server-side research workspace, not fictitious portfolio balances

Choose a narrow public-market watchlist as the next durable consumer feature. Store only owner-scoped EVM chain/pair addresses (25 max) in a new explicitly migrated Postgres table; derive the dashboard's profile counts, expiring profiles and watched-market records from the existing wallet-authenticated backend. Do not invent agent profits, price candles, synthetic trades or positions to make the dashboard appear active. A research watchlist is not a confidential holdings journal. Retain Fastify as a separate public metadata service; never create a second unsafe identity system for it. A valid connected wallet must match the authenticated cookie before the browser shows private saved account records.

Design uses existing DM Sans/Space Grotesk and the established indigo/lavender/coral palette with a lower, consistent display scale. The hero is shorter; use real records to carry the page instead of oversized typography and placeholder financial stat cards. Navigation uses a fixed destination list in a native dialog, not a new search backend or a fabricated agent assistant.

## 2026-11-12: Give owners control over saved public research

Choose an authenticated, full-list customer experience and self-service research metadata deletion before any automatic investment feature. The existing pair watchlist contains only public identifiers; CSV export stays entirely client-side, requires a matching wallet session and adds no account address or private values. Server-side clear-all requires strict typed confirmation, exact Origin, live SIWE cookie and the same advisory lock used for insert. This avoids CSRF and multi-user deletion; deleting research bookmarks cannot change agent permissions or any wallet or on-chain vault. Distinguish feature-level data portability from full account deletion, which remains future work. Do not activate off-by-default hosted MCP or financial execution as a side effect.

## November 12, 2026: require independent bytecode identity before any confidential route review

Do not infer FHE trade availability from an official protocol-registry address or one public JSON-RPC response. Two separately configured HTTPS RPC providers must agree on current proxy and implementation addresses, bytecode hashes and UUPS UUID within a bounded block spread, and match a separately reviewed historical observation of the SHA-256-pinned official Sepolia registry. Fail closed on disagreements, upgrades or missing RPC data, and never turn a positive code identity into trading permission.

Introduce only a **review-only** smart-account session scope schema until the exact verified venue ABI and audited ERC-4337/7579 account/session module are selected. Explicitly reject untrusted calldata, plaintext FHE amounts, token pairs, or signed-permission claims; a public scope record that exposes `tokenIn/tokenOut` could leak confidential direction. No custom smart account, signer, token custody or no-audit session authority was deployed. See `CONFIDENTIAL_EXECUTION_FOUNDATION.md`.

## November 13, 2026: dynamic ERC-1271 authorization, not static login claims

Treat smart-account signature validity as mutable. An originally valid ERC-1271 SIWE signature must be reverified against the account's current onchain contract state before protected application or hosted MCP research access. To avoid persisting raw reusable authentication credentials, store only per-session AES-256-GCM encrypted SIWE proof under a dedicated secret-manager key, bound to owner, chain and hashed cookie. Preserve ordinary EOA login without retaining signatures but require positive ECDSA address recovery before classifying it as an EOA. On observed invalid contract authorization, atomically revoke stale contract cookies and all associated owner/chain research keys, and bind any new contract-owned MCP key to its issuing live session. Since older tokens lacked lineage, migration 0005 deliberately invalidates all pre-upgrade sessions and hosted keys rather than pretending they were safe. Browser/MCP outage failures deny, never approve. This is an identity and research control, **not** an ERC-7579 financial session policy; verified encrypted settlement, owner-enforced onchain budgets and third-party audit remain mainnet blockers.
