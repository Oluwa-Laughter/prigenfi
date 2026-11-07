# Security

This is unaudited, testnet-only software. No real funds, mainnet execution, unrestricted signing, confidential operator delegation, remote MCP or private backend endpoints are enabled. Passing tests does not make the protocol production-ready.

The immutable vault owner can set/revoke permissions, pause agent execution and withdraw ERC-20 capital even while paused. An agent can only transfer a selected token to the owner-approved recipient, within per-operation and UTC-day caps and before expiry, using its own current nonce. The vault independently enforces this regardless of simulation. Users deliberately fund isolated vaults; no principal-wallet allowance is granted to an agent.

Only approved standard mock tokens should be used. SafeERC20 handles false/no-return behavior; before/after balance accounting rejects fee-on-top vault debits. Malicious/rebasing/upgradable tokens may lie about balances or recipient delivery. This is not a general arbitrary-token safety guarantee.

The frontend verifies loaded vault runtime against the generated artifact (immutable ranges masked), but users must verify network, addresses and transaction details in their wallet. A read-only RPC can still lie or be stale. One receipt inclusion is not finality. Public event reads cover only the latest 1000 blocks.

Confidential assets are controlled separately by the user's wallet. Decryption requires an explicit click and scoped permit. Private values are kept in browser memory, removed on account/network change and never sent to MCP, API, analytics or logs. Browser compromise can access plaintext and permits. SDK memory recovery is not durable across reloads.

The metadata API has rate limits and structured error/redacted logs but no session authentication or private endpoints. MCP stdio relies on local operating-system access, startup-bound scope and per-connection ephemeral proposals. Do not expose it remotely. OAuth, SIWE/ERC-1271, tenant-scoped PostgreSQL and security review must precede private hosted services.

See [threat model](security/THREAT_MODEL.md), [security review](security/REVIEW.md), [build evidence](BUILD_STATUS.md), and [deployment boundary](TESTNET_DEPLOYMENT.md).

Report suspected issues privately to the repository owner through GitHub's supported security reporting if enabled. Do not publish signing material or private portfolio data in issues.
