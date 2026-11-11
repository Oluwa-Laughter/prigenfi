# Agent skills: trusted foundations and PrigenFi orchestration

PrigenFi does **not** invent a new language model, proprietary investment algorithm, artificial win-rate metric, or custom cryptographic primitive. AI hosts interpret user instructions; existing official MCP SDKs carry tool calls, OpenZeppelin secures Solidity patterns, Zama supports encrypted computation only on independently verified compatible networks/contracts, and live public DEX data supports research. A deterministic screen highlights **uncertainty and risk**, never expected returns.

## Existing project skills

The repository already contains independently sourced or workspace-specific skills under `.agents/skills/` for **Zama protocol, Solidity and TypeScript**, property-based testing, secure-workflow guidance, code entry-point and differential review, frontend design, shadcn, responsiveness and Vercel React performance. They support engineering work, not financial execution by end users. Review every skill's origin and any executable scripts before enabling it in a host.

## Official OpenZeppelin skills installed on the connected Codex workstation

The existing official OpenZeppelin skill repository was retrieved from [OpenZeppelin/openzeppelin-skills](https://github.com/OpenZeppelin/openzeppelin-skills), **pinned to upstream commit `584262af9eed516bdb1d2d897246502218e3917a`**. These three _unmodified upstream_ skills, together with their upstream AGPL-3.0 license text, were copied into the connected workstation's user-local `~/.agents/skills/` directory (not committed as part of PrigenFi):

- `develop-secure-contracts`: search installed OpenZeppelin libraries first; prefer audited access control, tokens, proxy and security primitives over custom code
- `upgrade-solidity-contracts`: UUPS/Transparent/Beacon proxy patterns, initialization, ERC-7201 storage layout and upgrade testing
- `setup-solidity-contracts`: Foundry/OpenZeppelin dependency and remapping correctness

Their installed `SKILL.md` SHA-256 checksums were compared with the pinned upstream files. To refresh or install them on another workstation, review upstream's source and licenses, pin the chosen commit and use the [official repository installation instructions](https://github.com/OpenZeppelin/openzeppelin-skills). These skills may need a Codex session restart to become discoverable. Never silently fetch and execute an unreviewed skill or ignore a license. This installation is **local developer tooling**, not an OAuth connection or an end-user investment agent feature.

## Research skill for actual product agents

`.agents/skills/prigenfi-market-diligence/SKILL.md` is a small **Agent Skills-standard instruction-only orchestration**, not a replacement for a verified data source or a new financial model. Its actual capabilities come from the existing read-only PrigenFi MCP tools:

- `market_search` / `research_market_search`: real public token/pair market discovery
- `market_pair_lookup` / `research_pair_lookup`: exact network and pair-address public observation
- `market_integrity_assess` / `research_market_integrity_check`: deterministic market data-quality and risk indicators (see [MARKET_INTEGRITY](MARKET_INTEGRITY.md))
- `agent_market_research_check` / `research_scope_get`: source/user-specified research permissions; the remote version additionally authenticates a database-backed wallet-owned profile
- `confidential_route_check` and `agent_plan_evaluate`: deny unsupported confidential execution; never grant capital authority

The Codex host can invoke `$prigenfi-market-diligence` when working in this repository; the agent's external goal is processed by its chosen AI host, not a fake on-platform model. **A skill cannot grant an agent authority to spend funds and its instructions must never override explicit owner permissions.** Remote MCP-distributed skills are treated as untrusted instruction input by the host; PrigenFi does not execute external skill scripts or provide a trading skill via a public remote endpoint.

## Changes needed before a profitable autonomous strategy claim

A real strategy must have a documented hypothesis, unbiased historical chain/venue dataset, survivorship-bias and look-ahead controls, fee/gas/MEV and slippage models, out-of-sample and walk-forward evaluation, bounded position sizing and audited risk constraints, realistic loss scenarios, reconciled realized P&L and continuing production monitoring. No safe or profitable strategy can be inferred from a single public DEX snapshot or a source-provided percent-change value. Code reviews and simulated tests do not constitute a user-facing financial result.

References: [Agent Skills open standard](https://agentskills.io/), [Codex skill locations](https://learn.chatgpt.com/docs/build-skills), [OpenZeppelin Skills](https://www.openzeppelin.com/news/introducing-openzeppelin-skills), [MCP security considerations](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills).

## Public installable research skill library — November 11, 2026

A user or developer no longer needs to clone the repository to obtain basic PrigenFi skills. Three **instruction-only** Agent Skills-standard packages are published as plain markdown in the deployed site's static assets:

- `/skills/prigenfi-market-diligence/SKILL.md` — onchain market diligence, with scope-first, real-source integrity checks. The deployed copy matches the repository-maintained skill.
- `/skills/prigenfi-defi-risk/SKILL.md` — onchain spot, lending, staking, liquidity and token contract risks, including unknowns and provenance.
- `/skills/prigenfi-confidential-readiness/SKILL.md` — separate verified encrypted-token metadata from unverified confidential trading/execution readiness.

A machine-readable catalog is provided at `/skills/index.json`. Download one SKILL.md into the host's documented skills directory or load its HTTPS URL through a compatible host. Review all instructions before use. No scripts are shipped or executed; these are not wallets, model weights, signatures, token decryption or trading operators. The hosted public MCP research endpoint is independently operator-enabled and globally rate-limited; a skill remains readable even when MCP is disabled. Research rejection from a wallet-scoped MCP profile must never be bypassed via a broader public MCP server.
