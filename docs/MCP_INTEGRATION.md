# MCP integration

Official v2 packages `@modelcontextprotocol/server`, `client`, `core` are pinned to 2.4.0, implementing the 2026-07-28 specification. The server uses `serveStdio` to support the modern opening and legacy negotiation. Local stdio is the only exposed transport.

```sh
export RPC_URL=http://127.0.0.1:8545
export CHAIN_ID=31337
export VAULT_ADDRESS=YOUR_DEPLOYED_VAULT
export AGENT_ADDRESS=YOUR_AGENT
export TOKEN_ADDRESS=YOUR_PUBLIC_TOKEN
pnpm mcp:dev  # developer-only local Anvil vault; NOT the normal agent server
```

**Normal agent hosts use `pnpm mcp`**, which runs the dedicated research-only `research-stdio.ts` endpoint and cannot instantiate a development vault client, even if a host inherits vault environment variables. For Codex and Claude Desktop use the verified absolute-path config from `pnpm agent:connect --print codex` / `--print claude`, or generate ignored local files with `pnpm agent:connect --write`. The doctor `--check` performs a real isolated MCP client handshake and verifies execution is locked, but does not register a user agent, authenticate a wallet or connect to an already running host. See [agent connection](AGENT_CONNECTION.md).

`pnpm mcp:dev` is a **separate local Anvil-only** entry point; developer wallet metadata and ERC-20 simulation tools require an explicitly configured test vault on chain 31337. No host can change startup-configured scope via tool arguments.

| Default MCP tool                | Real capability                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `confidential_assets_list`      | Published Zama Sepolia test-wrapper metadata, never private balances                                                                     |
| `confidential_capabilities_get` | Supported wallet-token capabilities and explicitly disabled confidential trading                                                         |
| `confidential_route_check`      | Validate a typed private-only research draft; NEVER authorize execution                                                                  |
| `agent_plan_evaluate`           | Validate a model's structured Sepolia wrapper research plan, amounts/slippage scope and expiry without granting authority                |
| `agent_market_research_check`   | Validate a public EVM research step against caller-declared network/market/expiry and safe token query; no owner authentication          |
| `market_search`                 | Real, public DEX Screener research for allowed EVM chains; chain-scoped contract address lookup or provider-limited global symbol search |
| `market_pair_lookup`            | Exact public pool lookup on a selected chain, not an executable quote                                                                    |
| `agent_execution_status`        | Explicit `NO_VERIFIED_TRADING_VENUE` / `privateExecution:false` response; never fake a fill                                              |

The standard default MCP server advertises these **eight tools** and one prompt, `interpret_private_defi_goal`. The prompt is for a **connected AI host's own model** to interpret a voluntarily shared user goal. It does not load an LLM or a model key within PrigenFi. The host can see the user's goal, and public market requests can expose token symbols/addresses to DEX Screener. Do not transmit confidential user data to an untrusted host or public provider.

Only when explicitly configured with a **local Anvil chain-31337 vault client** does the server additionally register the following developer-only tools:

| Anvil developer tool          | Scope                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `wallet_get_info`             | Bound local public vault identity                                                       |
| `agent_get_permissions`       | Public test vault transfer permission tuple                                             |
| `policy_get`                  | Public local vault policy snapshot                                                      |
| `portfolio_get`               | Local public ERC-20 vault balance, never confidential balances                          |
| `agent_get_activity`          | Unfinalized local vault transfer logs                                                   |
| `dev_erc20_transfer_simulate` | Eth-call simulation of isolated public ERC-20 transfer, never a private trade           |
| `dev_erc20_transfer_propose`  | Ephemeral in-process local transfer proposal with idempotency guard, not a signed order |
| `dev_erc20_transfer_status`   | Ephemeral simulation status, not settled trade activity                                 |

All tool inputs have strict Zod schemas. Positive uint128 amounts and uint256 nonces are decimal strings. Address/chain scope cannot be changed through proposals. Idempotency keys are UUIDs. Max 100 proposals per connection; restart loses them. Errors do not contain RPC credentials, private values or raw exception messages. No signing, private decryption, arbitrary calls, raw execution or operator tools exist.

`tests/mcp.test.ts` launches an external SDK client, discovers eight default tools and the host-interpretation prompt, checks validated public scope, metadata and denied execution. In explicit Anvil mode it verifies the developer tools and on-chain vault simulation without claiming trading. With LOCAL_INTEGRATION=1 it reads actual Anvil policy, simulates and proposes an allowed mock transfer, rejects over-budget proposals and reads status. No LLM or fabricated market data is needed.

Remote Streamable HTTP and OAuth are not implemented. Do not expose this process through an HTTP shim. Future remote work must validate issuer, audience, resource indicator, expiry and scopes; prevent token passthrough; bind user/agent/tenant on the server; and keep OAuth authorization separate from on-chain spending permissions. External metadata/tool text must be treated as untrusted data and cannot populate execution calldata or expand policy.

## Confidential-agent boundary — November 8, 2026

The `confidential_route_check` tool checks the shared `confidentialMandateSchema` with literal privacy mode `confidential-only`, a market domain, an objective, asset watch list and a suggested test capital ceiling. It accepts a valid research draft but always reports `executionAllowed: false` until a supported private venue and authenticated agent executor are proven. No raw signature, wallet key, balance decryption, ciphertext or trade transaction is passed through these tools. There is **no fallback** to an ordinary Ethereum DEX swap. MCP inputs should still be treated as potentially observable by the caller: do not transmit sensitive user instructions to an untrusted external agent or server.

The old `trade_quote`, `trade_simulate` and `trade_propose` names were removed to prevent misleading agents. They were replaced by an explicit execution-availability tool and conditional `dev_erc20_transfer_*` tools that are **only registered when a local Anvil client exists**. Public research feeds do not pretend to be private trade quotes. Implement actual authentication, cross-tenant isolation, capability checks, on-chain FHE permissions and settlement verification before shipping unattended agent trading.

## Structured agent research planning

The local stdio tool agent_plan_evaluate accepts an owner-authored confidential-only mandate and a typed plan from an untrusted agent. It checks strategy scope, known Sepolia confidential wrapper addresses, request expiry, bounded capital allocation, swap token-pair validity and maximum slippage. A valid research proposal cannot spend or decrypt tokens and is never execution permission. See the detailed agent planning protocol in docs/AGENT_PLANNING_PROTOCOL.md.

## Public market research over EVM networks — November 9, 2026

The local MCP now exposes the same live adapter used by the web app. `market_search` accepts a required `chain` (`ethereum`, `base`, `arbitrum`, `optimism`, `polygon` or `bsc`) and a short public token symbol, pair or EVM contract address. Unknown networks and arbitrary instructions/URLs are rejected; sensitive owner instructions MUST NOT be passed as token queries. Exact addresses use DEX Screener's chain-specific token-pairs route; a symbol query uses the provider's bounded global search and may return no pools for a chosen chain. Only actual returned pairs have prices, source timestamps and liquidity; malformed or wrong-network records are removed.

`market_pair_lookup` accepts an exact chain and pool address and returns a real source observation or a null pair. `agent_market_research_check` validates a host model's proposed chain, market, token query and expiry against caller-declared constraints. This does not cryptographically authenticate the owner or authorize investments. `interpret_private_defi_goal` is an MCP prompt to be consumed by the **host's AI model** and is never a server-side substitute for a real LLM. Use owner-approved wallet sessions, on-chain smart-account policy and independently verified FHE-compatible settlement for any later live execution.

## Host configuration and developer UX — November 9, 2026

Use [AGENT_CONNECTION.md](AGENT_CONNECTION.md) for installation in Codex / Claude, actual MCP handshake checks, and separation of research-only and Anvil developer transports. The MCP initialization message includes a concise privacy/financial restriction notice. Default consumer tools never reveal unbacked Sepolia test wrapper internal contract suffixes as user-facing token names, but they preserve `testOnly:true` and source provenance. No hosted MCP OAuth, autonomous agent-session registration or smart-account permission grant exists yet.
