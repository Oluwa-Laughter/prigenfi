import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import {
  ZAMA_SWAP_SEPOLIA,
  inspectZamaSwapVenue,
} from "../packages/shared/src/swap-venue";

const path = "infra/zama-registry";
const [raw, manifestText] = await Promise.all([
  readFile(path + "/testnet.json"),
  readFile(path + "/manifest.json", "utf8"),
]);
const manifest = JSON.parse(manifestText) as {
  files_sha256sum: Record<string, string>;
  generated_at: string;
  git_source_commit: string;
};
const sha256 = createHash("sha256").update(raw).digest("hex");
if (manifest.files_sha256sum["testnet.json"] !== sha256) {
  throw new Error(
    "REGISTRY_HASH_MISMATCH: official snapshot or manifest changed",
  );
}
const registry = JSON.parse(raw.toString("utf8")) as {
  schema_version: number;
  chains: Record<string, { chain_id: number }>;
  contracts: Record<
    string,
    {
      address: string;
      chain: string;
      type: string;
      deployment_block?: number;
    }
  >;
};
const entry = registry.contracts[ZAMA_SWAP_SEPOLIA.registryKey];
if (
  registry.schema_version !== 1 ||
  registry.chains.ethereum_sepolia?.chain_id !== ZAMA_SWAP_SEPOLIA.chainId ||
  entry?.address.toLowerCase() !== ZAMA_SWAP_SEPOLIA.address.toLowerCase() ||
  entry.chain !== "ethereum_sepolia" ||
  entry.type !== ZAMA_SWAP_SEPOLIA.type ||
  entry.deployment_block !== Number(ZAMA_SWAP_SEPOLIA.deploymentBlock)
)
  throw new Error(
    "REGISTRY_ENTRY_MISMATCH: Sepolia swap identity is not pinned",
  );

if (process.argv.includes("--source-only")) {
  console.log(
    JSON.stringify(
      {
        status: "registry-sha256-verified",
        chainId: ZAMA_SWAP_SEPOLIA.chainId,
        sourceCommit: manifest.git_source_commit,
        sourceSHA256: sha256,
        swapProxy: ZAMA_SWAP_SEPOLIA.address,
        tradingEnabled: false,
      },
      null,
      2,
    ),
  );
} else {
  const rpc =
    process.env.SEPOLIA_RPC_URL ??
    "https://ethereum-sepolia-rpc.publicnode.com";
  // Only an operator-configured RPC. No user URL or request input is accepted.
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpc, { timeout: 14000, retryCount: 1 }),
  });
  const abi = parseAbi(["function proxiableUUID() view returns (bytes32)"]);
  const result = await inspectZamaSwapVenue({
    chainId: () => client.getChainId(),
    blockNumber: () => client.getBlockNumber(),
    codeAt: (address, blockNumber) =>
      client.getBytecode({ address, blockNumber }),
    storageAt: (address, slot, blockNumber) =>
      client.getStorageAt({ address, slot, blockNumber }),
    proxiableUUID: (address, blockNumber) =>
      client.readContract({
        address,
        abi,
        functionName: "proxiableUUID",
        blockNumber,
      }),
  });
  const evidence = {
    measuredAt: new Date().toISOString(),
    chainId: ZAMA_SWAP_SEPOLIA.chainId,
    source: "zama-ai/protocol-registry / testnet.json",
    officialSnapshot: {
      sourceSHA256: sha256,
      sourceCommit: manifest.git_source_commit,
      manifestGeneratedAt: manifest.generated_at,
      registryEntry: entry,
    },
    observation: result,
    qualification:
      "Read-only proxy/UUPS proof only. No supported pair, RFQ ABI, liquidity, ciphertext, user authority, or confidential execution has been verified.",
  };
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/confidential-swap-sepolia.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
  if (result.status !== "deployed-proxy") {
    process.exitCode = 1;
  }
}
