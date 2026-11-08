# MCP integration

Official v2 packages `@modelcontextprotocol/server`, `client`, `core` are pinned to 2.4.0, implementing the 2026-07-28 specification. The server uses `serveStdio` to support the modern opening and legacy negotiation. Local stdio is the only exposed transport.

```sh
export RPC_URL=http://127.0.0.1:8545
export CHAIN_ID=31337
export VAULT_ADDRESS=YOUR_DEPLOYED_VAULT
export AGENT_ADDRESS=YOUR_AGENT
export TOKEN_ADDRESS=YOUR_PUBLIC_TOKEN
pnpm mcp
```

A developer host can launch `pnpm exec tsx services/mcp-server/src/stdio.ts` from the repo root. Startup environment is operator-controlled scope, not a client-supplied authorization token. Without configured scope, asset discovery and availability tools work; private/configured reads return NOT_CONFIGURED.

| Tool                          | Actual capability                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| wallet_get_info               | Configured public vault/account identity                                                                                                            |
| agent_get_permissions         | Public on-chain permission tuple                                                                                                                    |
| portfolio_get                 | Public ERC-20 vault balance in integer base units, block provenance; confidential balances withheld                                                 |
| confidential_assets_list      | Official registry wrapper constants and source                                                                                                      |
| confidential_capabilities_get | Supported Sepolia test wrappers, capabilities and private-trading readiness; no private balances                                                    |
| confidential_route_check      | Validates typed **confidential-only** research mandate; always refuses execution without a verified private venue; never falls back to public swaps |
| agent_plan_evaluate | Validate a bounded, typed agent research plan against confidential-only asset, chain, expiry, allocation and market policy; never execute |
| trade_quote                   | Explicit NO_VERIFIED_TRADING_VENUE availability result, no fabricated quote                                                                         |
| trade_simulate                | Strict transfer schema, independent on-chain policy reads and eth_call                                                                              |
| trade_propose                 | Allowed simulation in bounded ephemeral session; idempotency conflict detection                                                                     |
| trade_get_status              | Session proposal status; always simulated, never submitted                                                                                          |
| policy_get                    | Block-consistent public policy snapshot                                                                                                             |
| agent_get_activity            | Actual configured agent's events, last 1000 blocks, observed/unfinalized                                                                            |

All tool inputs have strict Zod schemas. Positive uint128 amounts and uint256 nonces are decimal strings. Address/chain scope cannot be changed through proposals. Idempotency keys are UUIDs. Max 100 proposals per connection; restart loses them. Errors do not contain RPC credentials, private values or raw exception messages. No signing, private decryption, arbitrary calls, raw execution or operator tools exist.

`tests/mcp.test.ts` launches an external SDK client process, discovers all thirteen tools, checks safe metadata, confidential-only route denial, and controlled missing-configuration errors. With LOCAL_INTEGRATION=1 it reads actual Anvil policy, simulates and proposes an allowed mock transfer, rejects over-budget proposals and reads status. No LLM or fabricated market data is needed.

Remote Streamable HTTP and OAuth are not implemented. Do not expose this process through an HTTP shim. Future remote work must validate issuer, audience, resource indicator, expiry and scopes; prevent token passthrough; bind user/agent/tenant on the server; and keep OAuth authorization separate from on-chain spending permissions. External metadata/tool text must be treated as untrusted data and cannot populate execution calldata or expand policy.

## Confidential-agent boundary — November 8, 2026

The `confidential_route_check` tool checks the shared `confidentialMandateSchema` with literal privacy mode `confidential-only`, a market domain, an objective, asset watch list and a suggested test capital ceiling. It accepts a valid research draft but always reports `executionAllowed: false` until a supported private venue and authenticated agent executor are proven. No raw signature, wallet key, balance decryption, ciphertext or trade transaction is passed through these tools. There is **no fallback** to an ordinary Ethereum DEX swap. MCP inputs should still be treated as potentially observable by the caller: do not transmit sensitive user instructions to an untrusted external agent or server.

The original `trade_quote`, `trade_simulate` and `trade_propose` tools remain demonstration-only: they offer no quote and at most evaluate public test ERC-20 vault transfers; they are not a private trading pathway. Implement actual authentication, cross-tenant isolation, capability checks, on-chain FHE permissions and settlement verification before shipping unattended agent trading.

## Structured agent research planning

The local stdio tool agent_plan_evaluate accepts an owner-authored confidential-only mandate and a typed plan from an untrusted agent. It checks strategy scope, known Sepolia confidential wrapper addresses, request expiry, bounded capital allocation, swap token-pair validity and maximum slippage. A valid research proposal cannot spend or decrypt tokens and is never execution permission. See the detailed agent planning protocol in docs/AGENT_PLANNING_PROTOCOL.md.
