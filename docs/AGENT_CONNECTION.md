# Connecting an AI agent to PrigenFi (local MCP)

PrigenFi is building a privacy-preserving, agent-native DeFi system. **Today the connection supports live public EVM market research and strictly typed confidential-only planning**, not private autonomous trading, wallet spending, or profitable investment guarantees.

## Real local MCP check

On a computer with Node 22+, pnpm 10.34.6 and a trusted checkout of the repository:

```sh
pnpm install --frozen-lockfile
pnpm agent:connect --check
```

The checker launches the research-only stdio server through Node and the pinned local `tsx` package, negotiates a real MCP handshake, lists nine expected public research/availability tools and the `interpret_private_defi_goal` prompt, and reads the explicit execution-denied status. It **does not** connect to an already running AI host, register a wallet, authenticate a user, or persist a trading session. It strips wallet/vault environment settings before launching the server, and its success output explicitly states those limitations.

To generate absolute-path entries for the current checkout:

```sh
pnpm agent:connect --write
```

This creates two ignored, local, nonsecret files, using restrictive file permissions:

- `.local/agent-connection/codex-prigenfi.toml`
- `.local/agent-connection/claude-prigenfi.json`

It never modifies an existing host configuration. To inspect without writing:

```sh
pnpm agent:connect --print codex
pnpm agent:connect --print claude
```

## Codex CLI / desktop / IDE

Merge the generated `[mcp_servers.prigenfi]` table into `~/.codex/config.toml`, or a trusted project's `.codex/config.toml`. Do not replace unrelated server tables. Codex MCP uses `command`, `args`, `cwd` and additional host-specific options; the generator provides absolute paths and an approval prompt mode. Alternatively, after checking that no `prigenfi` entry exists, use the Codex CLI to register the absolute-path Node command shown in the generated output.

Validate the host registration using `codex mcp get prigenfi` or `codex mcp list`; in the Codex TUI use `/mcp`. If the host needs a restart, restart it. A configured server is **not** a live agent session; actually load its tools in the host and opt in to sharing a research goal.

Official reference: [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp).

## Claude Desktop

Merge the generated `mcpServers.prigenfi` JSON object into Claude Desktop's local MCP configuration using the app's MCP settings. **Merge; do not overwrite other entries.** Restart the desktop app and look under its Connectors / local MCP server controls to see whether the server and tools loaded. The generated JSON invokes a local Node process and does not contain wallet keys, RPC credentials or signing permissions.

Official reference: [Claude local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

## Capabilities an AI host can access

- `market_search`: live public source observations of selected EVM token/pair markets
- `market_pair_lookup`: source-stamped lookup of one real public DEX pair by chain/address
- `agent_market_research_check`: check a host-supplied research step against caller-declared allowed network, market, token and expiry
- `agent_plan_evaluate`: validate a research plan against supported Sepolia confidential test wrappers (never authorize a transaction)
- `confidential_assets_list`, `confidential_capabilities_get`, `confidential_route_check`: public testnet wrapper metadata and locked private execution policy
- `agent_execution_status`: explicit private execution unavailable response
- `interpret_private_defi_goal`: an MCP prompt for **the host's own AI model** to interpret a goal the user deliberately supplies

The default `services/mcp-server/src/research-stdio.ts` **cannot construct a developer vault client**, even if it inherits environment variables containing local vault identities. No wallet balances are returned, no signing or decryption tools exist, and the project cannot verify a web browser's local MCP status.

## Developer-only isolated vault

The separate `pnpm mcp:dev` command launches `services/mcp-server/src/stdio.ts`, which can expose additional public ERC-20 simulation and policy inspection tools **only when configured against Anvil chain 31337** with local test addresses. This is isolated development infrastructure, not user onboarding or an execution engine. Never expose the developer server as a public or remote endpoint, and never mistake simulated transfers for confidential trading or settled returns.

## Security and next engineering phase

A local stdio server and its AI host run in the same machine trust domain; use only trusted host software and restrict OS privileges. When the user sends a goal into an external AI host, the host can see it. Public market data providers can see queried symbols and token addresses. **Never send private wallet keys, seed phrases, decrypted balances or confidential strategy data into public tools.** MCP capability discovery does not confer any spending authority.

A hosted agent system still needs authenticated wallet and agent identities (SIWE/ERC-1271), scoped smart-account policies, session expiry/revocation, tenant-isolated persistence, independently verified Zama FHE settlement and reconciliation. Until those conditions are proven, private execution remains disabled and no return claims are made.

Source: [MCP local server security](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tutorials/security/local-server-security.mdx).
