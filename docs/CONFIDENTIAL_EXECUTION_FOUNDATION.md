# Confidential execution foundation: verified code, no spend authority

Updated 2026-11-12. **This is an engineering control boundary, not a live private swap product.** No real-money or autonomous confidential transactions are enabled by this milestone, and no signer, ciphertext, wallet seed, decryption key, approved order or spend token is held or exported by the verifier.

## Read-only Zama ConfidentialSwap evidence

Zama's pinned protocol registry identifies `CONFIDENTIAL_SWAP` at **Ethereum Sepolia (chain 11155111)**, UUPS proxy `0xab86445f72A64A99C8d248dcE004915B45C88e20`, originally listed at block 11,687,343. Its source is `infra/zama-registry/testnet.json`, pinned against an SHA-256 manifest from source revision `93283992cc39442fa9019c1474ef69331429e71a`. Do not infer mainnet RFQ pair support on testnet.

On **November 12, 2026**, two separate public Sepolia RPC hosts (Tenderly and ethPandaOps) were independently queried for the same proxy and its EIP-1967 implementation in single-block snapshots. Both returned the same UUPS code and identity at Sepolia block **12,120,685**, matching an earlier November 8 baseline:

- proxy bytecode Keccak-256: `0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6`
- implementation: `0x93FA553AFd73952105450264620eA08aBa7B52d5`
- implementation bytecode Keccak-256: `0x9814915edd2e296962367eeeba9d9d798dc45bbd13988040713e15fa7a0f003e`

The evidence is committed as [`docs/evidence/confidential-swap-quorum.json`](evidence/confidential-swap-quorum.json). Each observer separately checked chain ID, block number, proxy bytecode, EIP-1967 implementation storage, implementation code, and ERC-1822/UUPS UUID. The verifier compares all identities against each other and a source-checked historical baseline. **An upgrade or observer disagreement fails closed**; a successful code check _never_ sets `executionAllowed` to true. Different hostnames are necessary but not cryptographic proof of operator independence, canonical chain finality or absence of correlated RPC bugs.

### Reproduce the read-only check

```bash
pnpm verify:swap:source
pnpm verify:swap:quorum
# Only intentionally record a successful newly observed snapshot:
pnpm verify:swap:quorum --write-evidence
```

The live command uses two different public HTTPS hosts by default (`sepolia.gateway.tenderly.co` and `rpc.sepolia.ethpandaops.io`) with a bounded 32-block spread. Operators may set `PRIGENFI_VENUE_PRIMARY_RPC` and `PRIGENFI_VENUE_SECONDARY_RPC` to separate trusted HTTPS providers. The verifier never prints their full URLs or transport exceptions (which may contain secret keys), never accepts browser-supplied RPC URLs, never signs anything, and never writes evidence on an incomplete check. It exits nonzero on mismatched code, wrong chain, unexpected execution claims, missing UUPS/ABI-level deployment evidence, an invalid pinned manifest, block drift or RPC errors. Unit tests simulate diverging observers and unavailable RPCs without any external dependencies.

One public RPC initially answered with a valid recent block but later rejected a code lookup at that same height (`block not found`). A second provider advertised Sepolia access that was unavailable on its free plan. **These are actual observed outages, not reasons to relax matching or silently fail over to public trading.** The successful two-host check was Tenderly + ethPandaOps, not the unreliable providers above.

### This is still missing

The independently repeated **deployment code identity is not the venue contract's full verified Solidity source, ABI or executable permission model**. No testnet RFQ pair/whitelist, liquidity, fair quote, encrypted order proof, handle ACL, maker eligibility, wallet/operator consent, fill, refund, reorg, or onchain settlement finality has been verified by this check. Zama's announced public **Ethereum mainnet** Confidential Swap pairs are **not evidence of available Sepolia pairs**. Testnet confidential wrappers cUSDC, cUSDT, cZAMA and cWETH are unbacked and _do not inherently create a confidential swap market_.

Upstream research references:

- https://www.zama.org/confidential-swap
- https://docs.zama.org/protocol
- https://docs.openzeppelin.com/confidential-contracts/token
- https://ercs.ethereum.org/ERCS/erc-7579
- https://docs.openzeppelin.com/community-contracts/account-modules

## Proposed smart-account session: strict, non-authorizing review

`@prigenfi/shared/confidential-session-review` introduces a minimal **local review schema** for proposed execution scope. It is **not** an EIP-712 signature, ERC-4337 UserOperation, ERC-7579 hook, account installation, Zama FHE ciphertext, binding wallet delegation, or deployed permission manager. It strictly accepts only:

- `purpose: "confidential-only"`, `mode: "review-only"`, `chainId: 11155111`
- `smartAccount`, `delegate`, and `venue` EVM addresses
- four-byte selector (explicitly denying public ERC-20 transfer/transferFrom/approve and UUPS upgrade selectors), bounded max actions (1–10)
- bounded validity (at most 24 hours, not stale, limited start-time skew) and opaque nonzero review nonce (below 2^128)

It refuses client-supplied signing assertions, calldata, private amount, token pair, keys, plaintext balance, FHE handle and public trade fallbacks. This is deliberate: **even a publicly persisted token-in/token-out permission can disclose the hidden trade direction**. A valid locally inspectable draft only means the user/team can review its public, time-bounded structure. It never implies the account exists onchain, the signer is its owner, the selector belongs to the verified venue ABI, the venue accepts a swap, token spend can be enforced privately, or a nonce is consumed onchain.

The result **always** contains `executionAllowed:false`, `canSign:false`, `canInstallModule:false`, `canApproveTokens:false`, `signedByOwner:false`, and permanent blockers for account support, independently verified ERC-7579 enforcement, venue selector proof, onchain nonce/spend constraints, FHE finality, and public fallback. Its API result deliberately excludes the user's addresses and private input fields to limit data exposure. It is not exposed as a public order endpoint or added to MCP tools.

## Acceptance gates for the next actual implementation

1. **Authoritative venue source/ABI:** independently obtain the exact verified Sepolia implementation source or audit artifact, hash and selector mapping. Query supported pairs and RFQ/maker views at a pinned Sepolia block using only verified ABI. Reject an upgrade until re-reviewed.
2. **Confidential order lifecycle:** reproduce a known **supported testnet** crypto pair through real encrypted input, proof-bound Zama SDK call, correct contract and sender ACL, deposited/escrowed amounts, maker quote, settlement/refund and finality. No plaintext swap fallback, fake position or transaction, and do not claim ciphertext handle values represent decrypted token quantities.
3. **Vetted smart-account permissions:** choose an actively maintained, independently reviewed ERC-4337/7579 account plus its compatible scoped session module; verify its installed validation/hook API from pinned upstream code. Apply onchain owner authorization, exact target/selector, encrypted asset and budget controls, expiry, replay/nonce, spend accounting and immediate revoke. **PrigenFi's current immutable `AgentVault` and public `AgentSafetyPolicy` are not this module.** AI text or MCP identity is never wallet authorization.
4. **Privacy-safe receipt journal:** only after a verified encrypted transaction, record minimal finalized receipt metadata with explicit wallet ownership, reorg/finality reconciliation, no decrypted balance or plaintext private strategy. Derive user P&L only when independently validated accounting and cost basis exist.
5. **Production security:** independent protocol and smart-account review, event/upgrade monitoring, secure governance, incident halt, recovery tests and separate explicit approval for any public Sepolia-funded execution or mainnet enablement.

**Go/no-go decision:** code identity observed by multiple RPCs is **GO for more read-only research**; session draft validation is **GO for design review only**; real agent spending and confidential settlement remain **NO-GO**.
