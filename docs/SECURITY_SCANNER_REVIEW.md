# Security scanner finding review — November 8, 2026

## Review scope

GitHub Actions Gitleaks v8.30.1 reported exactly two findings under the
generic-api-key heuristic in historical commit
`1ff347d5f36dee604eb1bb7326a7ff582b10628a`,
file `tests/mcp.test.ts`, lines 86–87.

Both lines contain publicly published **Zama Sepolia test-wrapper contract
addresses** (cUSDC/cUSDT) used as nonsecret test inputs for the MCP route
validator. They are not a credential, bearer token, wallet private key,
secret phrase or API key. Their underlying meaning was cross-checked
against the official Zama Sepolia wrapper registry and
`packages/shared/src/index.ts`.

To avoid repeating literal contract addresses and reduce the chance of
similar warnings, the current test now references `confidentialAssets[0]`
and `confidentialAssets[1]` from the central official registry.

The two historical findings are individually documented in
`.gitleaksignore` using full commit/path/rule/line fingerprints.
This is **not** a broad rule exception; new secret findings elsewhere,
including future tests, still fail CI.

## If new findings appear

Review the specific file/commit/rule context privately. Never log matched
values, private credentials or raw reports. Rotate and revoke any real
credential, then coordinate safe history rewriting with the owner if
necessary; do not force-push without explicit approval.

The GitHub Actions workflow uses a version-pinned, SHA-256-verified
Gitleaks release and an independently checksum-verified source fallback
when its release download is temporarily unavailable. Both variants
must actually run the scan.

Reference: https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md
