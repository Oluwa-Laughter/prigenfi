# PrigenFi — Product direction

**Private finance. Powered by agents.**

PrigenFi is building a user-facing, agent-native DeFi platform and MCP execution protocol. The end-user story starts with a financial instruction, not with deploying a contract.

## The product journey

1. **Tell the agent what to do.** A user chooses a market (stablecoins, ETH/other ERC-20 assets or a supported DeFi venue), an asset pair and an objective. This is a market mandate, not an execution authorization.
2. **Define a limited capital budget.** The user creates or connects a wallet-controlled isolated vault and allocates only the assets they intend the agent to use.
3. **Grant restricted authority.** A separate on-chain permission controls who the agent is, permitted token/recipient, operation cap, daily spend, expiry and pause/revocation. No prompts override on-chain policy.
4. **Let the agent work.** Compatible external agents eventually use authenticated MCP tools to research, propose and simulate trades against supported venues. Actual trading connectors, policy-aware confidential execution and autonomous scheduling remain to be built.
5. **Review, monitor and intervene.** The user receives honest transaction status, permission state and confidential wallet asset access without fabricated PnL or balances. They can pause and revoke access.

The landing page and dashboard must prioritize these user jobs; protocol and developer documentation exists to support the MCP/SDK integrations but should not dominate the consumer experience.

## Asset naming and testnet honesty

- Consumer-facing labels are **cUSD** (USDC-based) and **cUSDT** (USDT-based).
- Sepolia contracts are Zama's **unbacked test wrappers**, with technical symbols cUSDCMock/cUSDTMock. Preserve those identifiers in internal registries and developer documentation when required to be precise.
- Never imply cUSD or cUSDT test tokens are redeemable stablecoins. Display the testnet/unbacked status prominently in wallet tools.
- Zama protects eligible confidential values, not all transaction metadata or public swap paths.

## Visual and interaction direction

Full-width premium financial experience, existing PrigenFi mark, refined dark/light theme, distinct market mandate and wallet-authority journeys, real connected state, helpful empty states and accessible responsive design. No fake balances, strategy profits, pricing, trades or enabled-market indicators.

## Verified development boundary (November 2026)

The current repo supports isolated ERC-20 vaults with scoped transfer permissions; local testnet transfer and proposal simulation; stdio MCP read/proposal tools; wallet-controlled Zama confidential token workflows wired through official SDKs. This does **not** constitute an autonomous trading platform, private swaps or real-fund settlement. ERC-4337, strategy runtime, real execution venues, secure remote MCP authorization and live confidential trading are pending. Mainnet execution stays disabled.
