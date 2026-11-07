# PrigenFi

**Private finance. Powered by agents.**

PrigenFi is a financial product for people delegating restricted financial work to agents, and a developer platform for teams connecting agents through MCP and typed SDKs. Users keep ultimate control, deliberately allocate capital to isolated vaults, and can revoke or pause agent access.

The initial network is Ethereum Sepolia; local Anvil supports development. Mainnet financial execution remains disabled. Future public ERC-20 adapters may support Base and Arbitrum, but neither is assumed eligible for confidential operations.

The initial working scope is isolated ERC-20 vault ownership and permissions, mock transfer proposals, public portfolio reads, and wallet-controlled confidential token tooling. Confidential token amounts and balances use official Zama SDKs. Public transaction metadata still exists. Confidential tokens are not yet eligible for delegated agent execution or swaps.

No profitability claims, automated strategy execution, real market prices, or fabricated assets appear in the product. The public site describes the control model; the app exposes exact availability and empty states. External agents are first-class clients; no built-in LLM is required for this milestone.
