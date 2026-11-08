# PrigenFi — product direction

**Private finance. Powered by agents.**

PrigenFi is an agent-native Ethereum finance platform: users choose markets and express trading objectives; agents research and propose actions; user-owned wallets grant narrowly restricted financial authority. The eventual product must execute strategies through verified venues and maintain an auditable portfolio and outcome history, with privacy when the underlying supported protocol actually provides it.

## Core user journey

1. **Discover:** explore Ethereum market structure and pairs: ETH/ERC-20 spot markets, meme coins, lending, liquidity, liquid staking, stablecoin exposure and riskier derivatives where integrations can be verified.
2. **Direct:** select a research mandate, token universe, capital ceiling and natural-language instructions. Mandates do not grant signing or spending privileges.
3. **Authorize:** isolate funds and approve specific account/agent permissions with on-chain limits, allowed destinations and expiry.
4. **Execute when safe:** authenticated MCP proposes trade intents; the execution engine independently verifies policy, liquidity/quote freshness, venue support and finality. Public trading is never mislabeled as confidential.
5. **Monitor:** display authenticated positions, reconciled fills, verified settled profits/losses and true win-rate statistics. Allow pause and revocation throughout.

The current app is an evolving **testnet preview** of this journey. It must not be described as a working autonomous confidential trading platform until actual end-to-end private venue execution is proven.

## Separation of surfaces

The public website (`/`) explains the product and links to exploration. The platform (`/dashboard`) has its own navigation across Markets, My Agents, Strategies, Portfolio, Activity, Capital & Permissions and Safety. Documentation (`/docs`) primarily serves external agent developers and MCP integrations, not ordinary customers.

The frontend style is a distinctive editorial finance language using ink indigo, lavender, coral and blue, not an interchangeable green crypto dashboard. Keep the existing PrigenFi logo, responsive full-width design, interactive market-mode illustration and purposeful motion that respects reduced-motion preferences.

## Data truth and analytics

- Research feeds are sourced from public DEX APIs, tagged with network/source/timestamp. Querying public feeds may reveal search terms to upstream providers. Provider listings are not security, liquidity or execution assurances.
- Market volume and liquidity graphs reflect external returned pairs; a test fixture is used only inside browser tests.
- Agent win rate is wins divided by wins plus losses from **verified finalized closed positions**; flat outcomes are excluded from its denominator. P&L requires normalized cost basis and settlement events. An ERC-20 transfer, simulation or open position is **not** a winning trade.
- No hard-coded user balances, trades, yield, TVL or profit figures belong in production UI.

## Confidentiality limits

Product-facing Sepolia labels **cUSD** and **cUSDT** correspond to official unbacked Zama test wrappers with technical identifiers `cUSDCMock` and `cUSDTMock`. Preserve real chain contract identities internally and label test assets honestly. They are not redeemable dollar-backed assets.

Zama can encrypt supported confidential token balances and amounts. Public shielding/unshielding deposits, transaction metadata, addresses, and ordinary Ethereum market transactions remain observable. Real confidential agent-directed swaps are pending a verified compatible venue and policy model. Never infer multi-chain privacy from the Ethereum implementation.

## Current engineering reality

- Restricted ERC-20 transfer vault + wallet permissions: implemented on local Anvil / eligible testnet, with tests.
- Public market discovery feed and live data visualization: implemented using DEX Screener; not an execution route.
- User mandates and research templates: interactive draft and copy tools; not authenticated agent orchestration.
- Local stdio MCP + policy simulation: implemented; production remote OAuth, active agent registry, durable intents and execution not implemented.
- Zama SDK wallet tools: integrated, but actual Sepolia FHE write lifecycle not independently verified with a founder-approved funded wallet.
- Verified agent trade analytics: calculator and conditional UI exist; no closed-trade data source or realized P&L records yet.
- No mainnet deployment or autonomous financial execution is authorized.
