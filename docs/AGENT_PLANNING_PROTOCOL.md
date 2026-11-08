# Agent research-plan protocol

PrigenFi now supports a **typed, read-only research proposal boundary** for external AI agents. Users can direct agents to investigate spot, lending, staking, liquidity, stablecoin, derivative, emerging-token and broader Ethereum strategies. The product remains **confidential-only** for any eventual trade.

## What the new tool does

The local stdio MCP tool **agent_plan_evaluate** accepts an owner-authored research mandate and an untrusted agent's structured plan. The runtime validates:

- The mandatory confidential-only mode and Ethereum Sepolia chain 11155111.
- A plan expiry no more than one hour into the future.
- One to eight steps with unique identifiers.
- Matching step markets within the user's chosen scope.
- Official Zama Sepolia confidential-wrapper token addresses where specified.
- Aggregated allocation at or below 10,000 basis points.
- No allocation for monitoring-only actions.
- Explicit nonidentical input/output tokens and slippage bounds for swap/rebalance proposals.

Each step receives an eligibility verdict and bounded reason codes. Valid research plans still return executionAllowed false, walletAuthorization none and onChainSimulation false. The validator NEVER produces wallet transactions, fake quotes or public execution routes. It does not perform AI reasoning itself: an external agent/model must generate the proposal, and its output is always untrusted.

## Example inputs

An owner mandate with market portfolio, privacy confidential-only and a research instruction can accompany a plan describing a Sepolia cUSDC-to-cUSDT **research-only** swap step. A valid research step uses the official test wrapper input and output addresses, a 1000-basis-point suggested portfolio allocation, a 100-basis-point maximum-slippage constraint and a unique step ID. The tool verifies the structure but still denies real execution without an FHE-compatible venue, authenticated owner and permissioned agent.

The accepted schema and a full, executable fixture live in tests/agent-planning.test.ts and tests/mcp.test.ts. These tests cover malicious extra fields such as raw calldata, unknown venues, unsupported chains/assets, privacy downgrades, identical swap assets, duplicated steps, stale expiration and capital overflow.

## Security and confidentiality

MCP is not an encrypted-private transport. The caller and local host can observe whatever they submit. Never pass decrypted amounts, personal balances, real keys or confidential user intent to untrusted external hosts. The plan schema accepts no transaction calldata or plaintext trade amount; results intentionally exclude the user's instruction and token addresses.

There is **no** authenticated multi-user MCP server, SIWE identity, transaction relay, FHE venue, session-key authority or signed settlement workflow today. The tool is not a production automated trading agent. Market research through an external public API is visible to that provider.

When building an execution route, require real FHE-compatible on-chain code, independent verification and signed wallet-scoped permissions. A model response is never financial authorization. Do not launch a live service until those controls and security review are complete.

## Commercialization

Official Zama Protocol Apps documentation states that commercial use of the source and underlying patented technology can require a commercial patent license. Confirm applicable licensing directly with Zama and qualified counsel before launching a commercial finance business.
