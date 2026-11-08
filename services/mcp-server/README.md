# PrigenFi local MCP server

A local stdio Model Context Protocol integration for agent-led **research and safe, typed proposals**. Users will eventually instruct their agents to explore EVM markets, manage eligible assets and follow risk-defined strategies; smart-account authorization will remain separate.

Current tools expose public scoped reads, supported confidential wrapper metadata, explicit route denial and `agent_plan_evaluate`. Model-generated plans are untrusted and may be evaluated for market scope, expiry and limits, but **are not trade orders or wallet authority**. A public ERC-20 development vault can be simulated in isolation. There is no remote production OAuth/session layer, signed private trading, decryption or automatic financial execution.

Start from the root using `pnpm mcp`. Run external-client tests through `pnpm test`. Do not forward wallet secrets, decrypted holdings or user-private instructions to untrusted agent hosts. No permission-bypassing generic swap tools or unauthenticated remote endpoint should be introduced.
