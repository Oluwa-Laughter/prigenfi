# Zama integration

## Verified discovery

Official registry: https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md

Read-only verification is recorded in `docs/evidence/zama-registry.json`. At Ethereum Sepolia block **12089561**, all seven official test wrappers and their underlying contracts had deployed bytecode, matching `underlying()`, `decimals()` and `rate()`. They are **unbacked, test-only assets**, not production or redeemable tokens.

| Product name | Official test wrapper symbol | Wrapper address                              | Underlying decimals / wrapper decimals | Rate          |
| ------------ | ---------------------------- | -------------------------------------------- | -------------------------------------- | ------------- |
| cUSDC        | `cUSDCMock`                  | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | 6 / 6                                  | 1             |
| cUSDT        | `cUSDTMock`                  | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` | 6 / 6                                  | 1             |
| cZAMA        | `cZAMAMock`                  | `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB` | 18 / 6                                 | 1000000000000 |
| cWETH        | `cWETHMock`                  | `0x46208622DA27d91db4f0393733C8BA082ed83158` | 18 / 6                                 | 1000000000000 |
| cBRON        | `cBRONMock`                  | `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891` | 18 / 6                                 | 1000000000000 |
| cXAUt        | `cXAUtMock`                  | `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7` | 6 / 6                                  | 1             |
| ctGBP        | `ctGBPMock`                  | `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC` | 18 / 6                                 | 1000000000000 |

The test wrapper `cZAMAMock` uses a publicly mintable test underlying **distinct** from the real Sepolia ZAMA token. The verified rates matter: cZAMA, cWETH and several others use 18-decimal underlying tokens and 6-decimal confidential wrappers. Never reinterpret a decimal value as wallet units without reading both `decimals()` and `rate()`.

The UI repeats verification before enabling operations. This proves deployed metadata compatibility, not real FHE execution, implementation audit, availability SLA or token value.

## Installed API

`@zama-fhe/sdk` and `@zama-fhe/react-sdk` are exactly 3.7.1. The official SDK `AGENTS.md`, LLM map, release source, declarations and react-wagmi example were inspected. `ConfidentialWallet` uses `ZamaSDK.createWrappedToken`, `WrappedToken.shield(amount, {approvalStrategy:'exact'})`, `Token.balanceOf(owner)`, `Token.confidentialTransfer(to, amount)` and `WrappedToken.unshield(amount)`. The frontend uses their official hooks through `ZamaProvider` and the wagmi adapter. It does not manually compose wrapping or encryption.

Testnet mock token `mint(address,uint256)` is a public faucet limited by the official mock implementation; the UI requests 100 tokens and waits for the receipt. No unlimited underlying approval is requested. Human amounts are validated before bigint conversion; public and confidential decimal units are separate.

## Four separate permissions

- ERC-20 allowance: shield's exact public-token approval to its wrapper, where needed.
- Off-chain decryption permit: explicit user click, one token scope, one-day configured lifetime, in-memory storage.
- On-chain decryption delegation: not exposed; granting it would change who can decrypt, and requires separate authorization/revocation design.
- Confidential token operator: not exposed to agents or this vault; an operator may spend without the ERC-20 vault limits.

A permit does not add ACL rights. No arbitrary owner address decryption is exposed to MCP or API. The UI's direct wallet hooks bind signing to the connected user. Decrypted balances are held only in an isolated in-memory query/SDK cache, removed on unmount/account/chain changes. No error or lifecycle event payload is logged.

Addresses, timing, contract calls, public amounts shielded/unshielded, and transaction receipts are publicly observable. FHE receipt inclusion does not mean the ciphertext computation/decryption is ready. Transfer/unshield controls require the user-authorized balance permit; errors are controlled and contain no private values.

## Unshield recovery

The SDK orchestrates unwrap → proof wait → finalization. The UI uses `usePendingUnshield` / `useResumeUnshield` for in-session recovery. Persistence across reload is not implemented because private stores are intentionally ephemeral. Keep the unwrap transaction hash; a reviewed durable nonsecret recovery journal is needed before this is a robust product flow.

## Swap and vault investigation

The official SDK 3.7.1 provides `createVault(sdk, {depositBatcher, redeemBatcher, vault?})` in `@zama-fhe/sdk/vaults`, with `deposit`, `redeem`, and batcher `join`, `dispatchBatch`, `claim`, `quit`, `recover`, `batchState`. It grants scoped token operators to batchers; use requires a separately verified financial policy and asynchronous state/finality handling.

The reviewed Sepolia registry lists wrapper infrastructure and csteakcUSDC but does not establish a supported PrigenFi confidential trading venue; these have NOT been fully interface-verified, simulated or exercised by PrigenFi. No venue adapter is shipped. Availability of a transfer method or a documented SDK vault class is not evidence of a confidential swap integration.

## External blocker and tooling limits

No dedicated PrigenFi Sepolia test wallet has been provisioned in this session. There is no funded, user-approved signer with which to run the mint → shield → permit → decrypt → encrypted transfer → unshield lifecycle. No signing secret was requested or read. A founder-provisioned wallet through the app is required; no key should be shared with an engineer or LLM.

Foundry tests exercise ordinary EVM vaults, not FHE cryptography. The official Hardhat template at ec84e1aa1b0a3ef61d9795ef8bf367115b79272f was inspected and still lists the legacy relayer dependency. It was not copied into PrigenFi. No custom confidential contract or local FHEVM integration harness is claimed. SDK declarations compile; discovery reads were real; confidential write flows remain unverified on Sepolia.

## Product crypto-only allowlist — November 11, 2026

The table above is **historical verification evidence** of the broader official Sepolia registry, not the active PrigenFi token menu. The active product, SDK allowlist, research planning and MCP capability list now expose only **cUSDC, cUSDT, cZAMA and cWETH** as unbacked crypto-focused test wrappers. The historical cBRON, cXAUt and ctGBP reference entries remain here for provenance; they are not selectable in the wallet product or accepted as confidential plan assets. No private swap venue or financial execution is enabled.
