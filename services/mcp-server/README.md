# PrigenFi local MCP server

A local stdio Model Context Protocol integration for agent-led **research and safe, typed proposals**. Users will eventually instruct their agents to explore EVM markets, manage eligible assets and follow risk-defined strategies; smart-account authorization will remain separate.

Current tools expose public scoped reads, supported confidential wrapper metadata, explicit route denial and `agent_plan_evaluate`. Model-generated plans are untrusted and may be evaluated for market scope, expiry and limits, but **are not trade orders or wallet authority**. A public ERC-20 development vault can be simulated in isolation. There is no remote production OAuth/session layer, signed private trading, decryption or automatic financial execution.

Start from the root using `pnpm mcp`. Run external-client tests through `pnpm test`. Do not forward wallet secrets, decrypted holdings or user-private instructions to untrusted agent hosts. No permission-bypassing generic swap tools or unauthenticated remote endpoint should be introduced.

## Actual EVM research tools and host reasoning

The MCP server exposes `market_search` and `market_pair_lookup` to obtain **current DEX Screener responses** on Ethereum, Base, Arbitrum, Optimism, Polygon or BNB Chain. `agent_market_research_check` validates model-selected research scope and a narrow public search term without echoing the owner's goal. `agent_execution_status`, `confidential_route_check` and `agent_plan_evaluate` keep execution disabled when private routing or owner authority is unverified.

A compatible MCP host can retrieve the `interpret_private_defi_goal` prompt. The host's own LLM interprets the user-supplied goal and may call the tools; **the PrigenFi MCP server does not contain an LLM or pretend to understand text using hardcoded keywords**. The host will see the goal, so only use a host the user trusts and deliberately shares the instruction with. Public DEX Screener requests may expose symbols/addresses to that provider, not confidential balances.

By default the MCP tool list contains only 8 ordinary read-only/research and availability tools. The local vault tools (`dev_erc20_transfer_*`, `wallet_get_info`, `policy_get`, `portfolio_get`, `agent_get_permissions`, `agent_get_activity`) are visible **only when the server has an explicitly configured Anvil chain-31337 development client**. These are never agent trades and cannot sign or decrypt anything. No local developer transfer tool is exposed on Sepolia or a remote chain by default.
