import { z } from "zod";
import { getAddress, isAddress, parseUnits, type Address } from "viem";
export * from "./generated/AgentVault";
export * from "./generated/VaultFactory";
export * from "./generated/MockUSD";
export const addressSchema = z
  .string()
  .refine(isAddress, "Invalid EVM address")
  .transform((value) => getAddress(value));
export const chainIdSchema = z.union([z.literal(31337), z.literal(11155111)]);
export const amountSchema = z
  .string()
  .regex(/^[1-9]\d{0,38}$/, "Use positive integer base units")
  .refine((v) => BigInt(v) <= (1n << 128n) - 1n, "Amount exceeds uint128");
export const transferSchema = z
  .object({
    kind: z.literal("erc20-transfer"),
    chainId: chainIdSchema,
    vault: addressSchema,
    agent: addressSchema,
    token: addressSchema,
    recipient: addressSchema,
    amount: amountSchema,
    nonce: z
      .string()
      .regex(/^(0|[1-9]\d{0,77})$/)
      .refine((v) => BigInt(v) < 1n << 256n),
    deadline: z.number().int().positive(),
  })
  .strict();
export type TransferIntent = z.infer<typeof transferSchema>;
export type Permission = {
  recipient: Address;
  perOperation: bigint;
  dailyLimit: bigint;
  spent: bigint;
  day: bigint;
  expiresAt: bigint;
  active: boolean;
};
export type PolicySnapshot = {
  chainId: number;
  vault: Address;
  agent: Address;
  token: Address;
  paused: boolean;
  nonce: bigint;
  permission: Permission;
  timestamp: bigint;
  blockNumber: bigint;
  balance: bigint;
};
export const chains = {
  11155111: {
    id: 11155111,
    name: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    confidential: "registry-supported" as const,
    smartAccount: "not-integrated",
    capabilities: ["erc20-transfer", "erc7984-wallet"],
  },
  31337: {
    id: 31337,
    name: "Local Anvil",
    explorer: null,
    nativeSymbol: "ETH",
    confidential: "unavailable" as const,
    smartAccount: "not-integrated",
    capabilities: ["erc20-transfer"],
  },
} as const;
/** Official Zama Sepolia wrapper registry, unbacked test assets only.
 * Public addresses are not a claim that an encrypted swap venue exists.
 * Source: https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md
 */
export const confidentialAssets = [
  {
    symbol: "cUSDCMock",
    displaySymbol: "cUSDC",
    category: "Stablecoin",
    address: getAddress("0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639"),
    underlying: getAddress("0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "cUSDTMock",
    displaySymbol: "cUSDT",
    category: "Stablecoin",
    address: getAddress("0x4E7B06D78965594eB5EF5414c357ca21E1554491"),
    underlying: getAddress("0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "cZAMAMock",
    displaySymbol: "cZAMA",
    category: "Protocol token",
    address: getAddress("0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB"),
    underlying: getAddress("0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "cWETHMock",
    displaySymbol: "cWETH",
    category: "Wrapped ETH",
    address: getAddress("0x46208622DA27d91db4f0393733C8BA082ed83158"),
    underlying: getAddress("0xff54739b16576FA5402F211D0b938469Ab9A5f3F"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "cBRONMock",
    displaySymbol: "cBRON",
    category: "Token",
    address: getAddress("0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891"),
    underlying: getAddress("0xFf021fB13cA64e5354c62c954b949a88cfDEb25E"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "cXAUtMock",
    displaySymbol: "cXAUt",
    category: "Gold-linked test token",
    address: getAddress("0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7"),
    underlying: getAddress("0x24377AE4AA0C45ecEe71225007f17c5D423dd940"),
    chainId: 11155111,
    isTestAsset: true,
  },
  {
    symbol: "ctGBPMock",
    displaySymbol: "ctGBP",
    category: "FX-linked test token",
    address: getAddress("0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC"),
    underlying: getAddress("0x93c931278A2aad1916783F952f94276eA5111442"),
    chainId: 11155111,
    isTestAsset: true,
  },
] as const;
export const serverEnvSchema = z.object({
  RPC_URL: z.url().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().pipe(chainIdSchema).default(31337),
  VAULT_ADDRESS: addressSchema.optional(),
  AGENT_ADDRESS: addressSchema.optional(),
  TOKEN_ADDRESS: addressSchema.optional(),
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
});
export function exactUnits(value: string, decimals: number): bigint {
  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36 ||
    !/^\d+(\.\d+)?$/.test(value)
  )
    throw new Error("Invalid amount");
  if ((value.split(".")[1]?.length ?? 0) > decimals)
    throw new Error("Amount has too many decimal places");
  const units = parseUnits(value, decimals);
  if (units <= 0n || units >= 1n << 128n)
    throw new Error("Amount outside supported range");
  return units;
}
export function evaluateTransfer(
  intent: TransferIntent,
  s: PolicySnapshot,
): { allowed: boolean; reasons: string[]; execution: "simulation-only" } {
  const reasons: string[] = [];
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const p = s.permission;
  const amount = BigInt(intent.amount);
  if (intent.chainId !== s.chainId || ![31337, 11155111].includes(s.chainId))
    reasons.push("CHAIN_DENIED");
  if (
    !same(intent.vault, s.vault) ||
    !same(intent.agent, s.agent) ||
    !same(intent.token, s.token)
  )
    reasons.push("SCOPE_DENIED");
  if (!p.active || s.paused || p.expiresAt <= s.timestamp)
    reasons.push("SESSION_INACTIVE");
  if (!same(intent.recipient, p.recipient)) reasons.push("RECIPIENT_DENIED");
  if (BigInt(intent.nonce) !== s.nonce) reasons.push("NONCE_MISMATCH");
  const spent = p.day === s.timestamp / 86400n ? p.spent : 0n;
  if (amount > p.perOperation || spent + amount > p.dailyLimit)
    reasons.push("SPENDING_LIMIT");
  if (amount > s.balance) reasons.push("INSUFFICIENT_BALANCE");
  if (
    BigInt(intent.deadline) <= s.timestamp ||
    BigInt(intent.deadline) > s.timestamp + 300n
  )
    reasons.push("DEADLINE_INVALID");
  return {
    allowed: reasons.length === 0,
    reasons,
    execution: "simulation-only",
  };
}
export const publicJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));
