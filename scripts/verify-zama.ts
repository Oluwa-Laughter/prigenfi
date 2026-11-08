import { mkdir, writeFile } from "node:fs/promises";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { confidentialAssets, publicJson } from "../packages/shared/src";
import { verifyConfidentialAsset } from "../packages/zama/src";
const client = createPublicClient({
  chain: sepolia,
  transport: http(
    process.env.SEPOLIA_RPC_URL ??
      "https://ethereum-sepolia-rpc.publicnode.com",
    { timeout: 15000, retryCount: 1 },
  ),
});
const results = await Promise.all(
  confidentialAssets.map((asset) =>
    verifyConfidentialAsset(client, asset.address),
  ),
);
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/zama-registry.json",
  JSON.stringify(
    JSON.parse(
      publicJson({
        source:
          "https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md",
        chainId: 11155111,
        results,
      }),
    ),
    null,
    2,
  ) + "\n",
);
console.log(publicJson(results));
