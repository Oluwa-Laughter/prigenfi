import { createHash } from "node:crypto";
import {
  createPublicClient,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  EIP1967_IMPLEMENTATION_SLOT,
  inspectZamaSwapVenue,
  ZAMA_SWAP_SEPOLIA,
} from "../packages/shared/src/swap-venue";
import {
  assessVenueQuorum,
  type VenueRead,
  type VenueBaseline,
} from "../packages/shared/src/venue-quorum";

// Two separately operated public observer services. This is NOT a signer,
// fallback trade router, onchain permit or substitute for audited settlement.
const primaryRpc =
  process.env.PRIGENFI_VENUE_PRIMARY_RPC ??
  "https://sepolia.gateway.tenderly.co";
const secondaryRpc =
  process.env.PRIGENFI_VENUE_SECONDARY_RPC ??
  "https://rpc.sepolia.ethpandaops.io";

function rpcHost(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.hash)
      throw new Error("INVALID_RPC_CONFIGURATION");
    return url.hostname.toLowerCase();
  } catch {
    // URLs may embed privileged operator credentials; don't echo input.
    throw new Error("INVALID_RPC_CONFIGURATION");
  }
}

// Hostnames only for uniqueness; URLs are never displayed or persisted.
if (rpcHost(primaryRpc) === rpcHost(secondaryRpc))
  throw new Error("INDEPENDENT_RPC_OPERATORS_REQUIRED");

const [snapshotRaw, manifestRaw, historicRaw] = await Promise.all([
  readFile("infra/zama-registry/testnet.json"),
  readFile("infra/zama-registry/manifest.json", "utf8"),
  readFile("docs/evidence/confidential-swap-sepolia.json", "utf8"),
]);
const manifest = JSON.parse(manifestRaw) as {
  git_source_commit: string;
  files_sha256sum: Record<string, string>;
};
const sha256 = createHash("sha256").update(snapshotRaw).digest("hex");
if (sha256 !== manifest.files_sha256sum["testnet.json"])
  throw new Error("OFFICIAL_SNAPSHOT_HASH_MISMATCH");
const registry = JSON.parse(snapshotRaw.toString("utf8")) as {
  schema_version: number;
  chains: Record<string, { chain_id: number }>;
  contracts: Record<
    string,
    { address: string; chain: string; type: string; deployment_block: number }
  >;
};
const swapEntry = registry.contracts[ZAMA_SWAP_SEPOLIA.registryKey];
if (
  registry.schema_version !== 1 ||
  registry.chains.ethereum_sepolia?.chain_id !== ZAMA_SWAP_SEPOLIA.chainId ||
  swapEntry?.address.toLowerCase() !==
    ZAMA_SWAP_SEPOLIA.address.toLowerCase() ||
  swapEntry?.type !== ZAMA_SWAP_SEPOLIA.type ||
  swapEntry?.chain !== "ethereum_sepolia" ||
  swapEntry?.deployment_block !== Number(ZAMA_SWAP_SEPOLIA.deploymentBlock)
)
  throw new Error("OFFICIAL_REGISTRY_ENTRY_MISMATCH");
const old = JSON.parse(historicRaw) as {
  measuredAt: string;
  observation: VenueBaseline;
  officialSnapshot: { sourceSHA256: string; sourceCommit: string };
};
if (
  old.officialSnapshot.sourceSHA256 !== sha256 ||
  old.officialSnapshot.sourceCommit !== manifest.git_source_commit ||
  old.observation.proxyAddress.toLowerCase() !==
    ZAMA_SWAP_SEPOLIA.address.toLowerCase() ||
  !/^0x[0-9a-fA-F]{64}$/.test(old.observation.proxyCodeHash) ||
  !/^0x[0-9a-fA-F]{64}$/.test(old.observation.implementationCodeHash) ||
  !/^0x[0-9a-fA-F]{40}$/.test(old.observation.implementationAddress)
)
  throw new Error("UNTRUSTED_HISTORICAL_BASELINE");
const abi = parseAbi(["function proxiableUUID() view returns (bytes32)"]);

async function observe(
  endpoint: string,
  provider: VenueRead["provider"],
): Promise<VenueRead> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(endpoint, { timeout: 12000, retryCount: 1 }),
  });
  try {
    const observation = await inspectZamaSwapVenue({
      chainId: () => client.getChainId(),
      blockNumber: () => client.getBlockNumber(),
      codeAt: (address: Address, blockNumber: bigint) =>
        client.getBytecode({ address, blockNumber }),
      storageAt: (address: Address, slot: Hex, blockNumber: bigint) =>
        client.getStorageAt({ address, slot, blockNumber }),
      proxiableUUID: (address: Address, blockNumber: bigint) =>
        client.readContract({
          address,
          abi,
          functionName: "proxiableUUID",
          blockNumber,
        }),
    });
    return { provider, observation, failure: null };
  } catch (error) {
    // Never expose the raw error: provider URLs may contain operator secrets.
    const name = error instanceof Error ? error.name.toLowerCase() : "";
    const timeout = name.includes("timeout") || name.includes("abort");
    return {
      provider,
      observation: null,
      failure: timeout ? "RPC_TIMEOUT" : "RPC_ERROR",
    };
  }
}

const [primary, secondary] = await Promise.all([
  observe(primaryRpc, "primary"),
  observe(secondaryRpc, "secondary"),
]);
const report = assessVenueQuorum(primary, secondary, old.observation);
const evidence = {
  checkedAt: new Date().toISOString(),
  source: "Independent read-only Sepolia RPC code observations",
  pinnedRegistrySource: {
    commit: manifest.git_source_commit,
    sha256,
  },
  baselineCheckedAt: old.measuredAt,
  referenceSlot: EIP1967_IMPLEMENTATION_SLOT,
  providers: [
    {
      role: primary.provider,
      outcome: primary.failure ?? primary.observation?.status ?? "unverified",
    },
    {
      role: secondary.provider,
      outcome:
        secondary.failure ?? secondary.observation?.status ?? "unverified",
    },
  ],
  report,
  meaning:
    "Only independent UUPS bytecode identity. No RFQ source/ABI, pair liquidity, ciphertext ACL, smart-account rights, encrypted order or finalized settlement is verified.",
};
const output = JSON.stringify(evidence, null, 2) + "\n";
process.stdout.write(output);
if (
  process.argv.includes("--write-evidence") &&
  report.status === "consistent-code-evidence"
) {
  await mkdir("docs/evidence", { recursive: true });
  await writeFile("docs/evidence/confidential-swap-quorum.json", output);
}
if (report.status !== "consistent-code-evidence") process.exitCode = 1;
