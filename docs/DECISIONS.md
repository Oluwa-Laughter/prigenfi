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
