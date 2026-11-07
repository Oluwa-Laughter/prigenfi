import { parseAbi, erc20Abi, type PublicClient, type Address } from "viem";
import { confidentialAssets } from "@prigenfi/shared";
import type { ZamaSDK } from "@zama-fhe/sdk";
export const wrapperReadAbi = parseAbi([
  "function underlying() view returns (address)",
  "function decimals() view returns (uint8)",
  "function rate() view returns (uint256)",
]);
export async function verifyConfidentialAsset(
  client: PublicClient,
  address: Address,
) {
  if ((await client.getChainId()) !== 11155111)
    throw new Error("Sepolia required");
  const asset = confidentialAssets.find(
    (a) => a.address.toLowerCase() === address.toLowerCase(),
  );
  if (!asset) throw new Error("Unregistered asset");
  const block = await client.getBlock();
  const [code, underlying, decimals, rate] = await Promise.all([
    client.getCode({ address, blockNumber: block.number }),
    client.readContract({
      address,
      abi: wrapperReadAbi,
      functionName: "underlying",
      blockNumber: block.number,
    }),
    client.readContract({
      address,
      abi: wrapperReadAbi,
      functionName: "decimals",
      blockNumber: block.number,
    }),
    client.readContract({
      address,
      abi: wrapperReadAbi,
      functionName: "rate",
      blockNumber: block.number,
    }),
  ]);
  if (
    !code ||
    code === "0x" ||
    underlying.toLowerCase() !== asset.underlying.toLowerCase() ||
    rate <= 0n
  )
    throw new Error("Wrapper verification failed");
  const [underlyingCode, underlyingDecimals] = await Promise.all([
    client.getCode({ address: underlying, blockNumber: block.number }),
    client.readContract({
      address: underlying,
      abi: erc20Abi,
      functionName: "decimals",
      blockNumber: block.number,
    }),
  ]);
  if (!underlyingCode || underlyingCode === "0x")
    throw new Error("Underlying has no code");
  return {
    ...asset,
    decimals,
    underlyingDecimals,
    rate: rate.toString(),
    blockNumber: block.number.toString(),
    verifiedAt: new Date().toISOString(),
  };
}
/// Wallet-scoped SDK facade. Explicit consent is required for plaintext balances; no agent/operator exposure.
export class ConfidentialWallet {
  constructor(
    private sdk: ZamaSDK,
    private readonly client: PublicClient,
  ) {}
  private async token(address: Address) {
    await verifyConfidentialAsset(this.client, address);
    return this.sdk.createWrappedToken(address);
  }
  async shield(address: Address, amount: bigint) {
    return (await this.token(address)).shield(amount, {
      approvalStrategy: "exact",
    });
  }
  async balance(address: Address, owner: Address, consent: boolean) {
    if (!consent) throw new Error("EXPLICIT_DECRYPTION_CONSENT_REQUIRED");
    return (await this.token(address)).balanceOf(owner);
  }
  async transfer(address: Address, to: Address, amount: bigint) {
    return (await this.token(address)).confidentialTransfer(to, amount);
  }
  async unshield(address: Address, amount: bigint) {
    return (await this.token(address)).unshield(amount);
  }
}
