import { mkdir, writeFile } from "node:fs/promises";
import {
  createPublicClient,
  createWalletClient,
  http,
  decodeEventLog,
  type Address,
} from "viem";
import { anvil } from "viem/chains";
import {
  vaultFactoryAbi,
  vaultFactoryBytecode,
  mockUSDAbi,
  mockUSDBytecode,
  agentVaultAbi,
  publicJson,
} from "../packages/shared/src";
const url = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname))
  throw new Error("Local RPC required");
const publicClient = createPublicClient({ chain: anvil, transport: http(url) });
if ((await publicClient.getChainId()) !== 31337)
  throw new Error("Local chain 31337 required");
const wallet = createWalletClient({ chain: anvil, transport: http(url) });
const [owner, agent, recipient] = await wallet.getAddresses();
if (!owner || !agent || !recipient)
  throw new Error("Three unlocked local test accounts required");
async function receipt(hash: `0x${string}`) {
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success")
    throw new Error("Deployment transaction reverted");
  return r;
}
const factory = (
  await receipt(
    await wallet.deployContract({
      account: owner,
      abi: vaultFactoryAbi,
      bytecode: vaultFactoryBytecode,
    }),
  )
).contractAddress;
const token = (
  await receipt(
    await wallet.deployContract({
      account: owner,
      abi: mockUSDAbi,
      bytecode: mockUSDBytecode,
    }),
  )
).contractAddress;
if (!factory || !token) throw new Error("Deployment missing address");
const vaultReceipt = await receipt(
  await wallet.writeContract({
    account: owner,
    address: factory,
    abi: vaultFactoryAbi,
    functionName: "createVault",
  }),
);
const event = decodeEventLog({
  abi: vaultFactoryAbi,
  data: vaultReceipt.logs[0].data,
  topics: vaultReceipt.logs[0].topics,
});
const vault = event.args.vault as Address;
const now = (await publicClient.getBlock()).timestamp;
await receipt(
  await wallet.writeContract({
    account: owner,
    address: vault,
    abi: agentVaultAbi,
    functionName: "setTokenDailyLimit",
    args: [token, 20_000_000n],
  }),
);
await receipt(
  await wallet.writeContract({
    account: owner,
    address: vault,
    abi: agentVaultAbi,
    functionName: "setPermission",
    args: [agent, token, recipient, 10_000_000n, 20_000_000n, now + 86400n],
  }),
);
await receipt(
  await wallet.writeContract({
    account: owner,
    address: token,
    abi: mockUSDAbi,
    functionName: "mint",
    args: [vault, 100_000_000n],
  }),
);
const deployment = {
  chainId: 31337,
  rpcUrl: url,
  owner,
  agent,
  recipient,
  factory,
  token,
  vault,
};
await mkdir(".local", { recursive: true });
await writeFile(".local/deployment.json", publicJson(deployment));
console.log(publicJson(deployment));
