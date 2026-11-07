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

| Tool                     | Actual capability                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| wallet_get_info          | Configured public vault/account identity                                                            |
| agent_get_permissions    | Public on-chain permission tuple                                                                    |
| portfolio_get            | Public ERC-20 vault balance in integer base units, block provenance; confidential balances withheld |
| confidential_assets_list | Official registry wrapper constants and source                                                      |
| trade_quote              | Explicit NO_VERIFIED_TRADING_VENUE availability result, no fabricated quote                         |
| trade_simulate           | Strict transfer schema, independent on-chain policy reads and eth_call                              |
| trade_propose            | Allowed simulation in bounded ephemeral session; idempotency conflict detection                     |
| trade_get_status         | Session proposal status; always simulated, never submitted                                          |
| policy_get               | Block-consistent public policy snapshot                                                             |
| agent_get_activity       | Actual configured agent's events, last 1000 blocks, observed/unfinalized                            |

All tool inputs have strict Zod schemas. Positive uint128 amounts and uint256 nonces are decimal strings. Address/chain scope cannot be changed through proposals. Idempotency keys are UUIDs. Max 100 proposals per connection; restart loses them. Errors do not contain RPC credentials, private values or raw exception messages. No signing, private decryption, arbitrary calls, raw execution or operator tools exist.

`tests/mcp.test.ts` launches an external SDK client process, discovers all ten tools, checks safe metadata and controlled missing-configuration errors. With LOCAL_INTEGRATION=1 it reads actual Anvil policy, simulates and proposes an allowed mock transfer, rejects over-budget proposals and reads status. No LLM or fabricated market data is needed.

Remote Streamable HTTP and OAuth are not implemented. Do not expose this process through an HTTP shim. Future remote work must validate issuer, audience, resource indicator, expiry and scopes; prevent token passthrough; bind user/agent/tenant on the server; and keep OAuth authorization separate from on-chain spending permissions. External metadata/tool text must be treated as untrusted data and cannot populate execution calldata or expand policy.
