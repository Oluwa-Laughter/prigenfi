import { getAddress, isAddress, keccak256, type Address, type Hex } from "viem";

/** Official Zama protocol-registry (Ethereum Sepolia); never a route permit. */
export const ZAMA_SWAP_SEPOLIA = {
  chainId: 11155111,
  address: getAddress("0xab86445f72A64A99C8d248dcE004915B45C88e20"),
  deploymentBlock: 11687343n,
  registryKey: "CONFIDENTIAL_SWAP",
  type: "confidential_swap",
  source: "https://github.com/zama-ai/protocol-registry/blob/main/testnet.json",
} as const;

/** EIP-1967 implementation storage slot. Standard interface, not an assumed RFQ ABI. */
export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

export type SwapReadClient = {
  chainId: () => Promise<number>;
  blockNumber: () => Promise<bigint>;
  codeAt: (address: Address, blockNumber: bigint) => Promise<Hex | undefined>;
  storageAt: (
    address: Address,
    slot: Hex,
    blockNumber: bigint,
  ) => Promise<Hex | undefined>;
  proxiableUUID: (address: Address, blockNumber: bigint) => Promise<Hex>;
};

export type SwapVenueObservation = {
  source: "Sepolia JSON-RPC";
  chainId: number;
  blockNumber: string | null;
  proxyAddress: Address;
  proxyCodeHash: Hex | null;
  implementationAddress: Address | null;
  implementationCodeHash: Hex | null;
  uupsConfirmed: boolean;
  status: "deployed-proxy" | "unverified";
  privateTradingEnabled: false;
  executionAllowed: false;
  permissionedTradingEnabled: false;
  blockers: readonly string[];
};

/**
 * A read-only, single-block snapshot of the official registered proxy.
 * It proves presence of bytecode and UUPS implementation but NOT a usable RFQ
 * interface, liquidity, cipher permissions, or approval to spend user funds.
 */
export async function inspectZamaSwapVenue(
  reader: SwapReadClient,
): Promise<SwapVenueObservation> {
  const chainId = await reader.chainId();
  const observation: SwapVenueObservation = {
    source: "Sepolia JSON-RPC",
    chainId,
    blockNumber: null,
    proxyAddress: ZAMA_SWAP_SEPOLIA.address,
    proxyCodeHash: null,
    implementationAddress: null,
    implementationCodeHash: null,
    uupsConfirmed: false,
    status: "unverified",
    privateTradingEnabled: false,
    executionAllowed: false,
    permissionedTradingEnabled: false,
    blockers: [
      "RFQ_INTERFACE_UNVERIFIED",
      "PAIR_LIQUIDITY_UNVERIFIED",
      "AGENT_WALLET_PERMISSION_MISSING",
      "ENCRYPTED_SETTLEMENT_NOT_TESTED",
      "PUBLIC_FALLBACK_FORBIDDEN",
    ],
  };
  if (chainId !== ZAMA_SWAP_SEPOLIA.chainId) {
    return {
      ...observation,
      blockers: ["WRONG_CHAIN", ...observation.blockers],
    };
  }

  const blockNumber = await reader.blockNumber();
  observation.blockNumber = blockNumber.toString();
  if (blockNumber < ZAMA_SWAP_SEPOLIA.deploymentBlock) {
    return {
      ...observation,
      blockers: ["BLOCK_PRECEDES_DEPLOYMENT", ...observation.blockers],
    };
  }
  const proxyCode = await reader.codeAt(ZAMA_SWAP_SEPOLIA.address, blockNumber);
  if (!proxyCode || proxyCode === "0x") {
    return {
      ...observation,
      blockers: ["PROXY_CODE_MISSING", ...observation.blockers],
    };
  }
  observation.proxyCodeHash = keccak256(proxyCode);

  const slot = await reader.storageAt(
    ZAMA_SWAP_SEPOLIA.address,
    EIP1967_IMPLEMENTATION_SLOT,
    blockNumber,
  );
  if (!slot || !/^0x[0-9a-fA-F]{64}$/.test(slot)) {
    return {
      ...observation,
      blockers: ["IMPLEMENTATION_SLOT_UNAVAILABLE", ...observation.blockers],
    };
  }
  const implRaw = "0x" + slot.slice(-40);
  if (
    !isAddress(implRaw) ||
    /^0x0{40}$/i.test(implRaw) ||
    implRaw.toLowerCase() === ZAMA_SWAP_SEPOLIA.address.toLowerCase()
  ) {
    return {
      ...observation,
      blockers: ["IMPLEMENTATION_INVALID", ...observation.blockers],
    };
  }
  const implementationAddress = getAddress(implRaw);
  observation.implementationAddress = implementationAddress;
  const code = await reader.codeAt(implementationAddress, blockNumber);
  if (!code || code === "0x") {
    return {
      ...observation,
      blockers: ["IMPLEMENTATION_CODE_MISSING", ...observation.blockers],
    };
  }
  observation.implementationCodeHash = keccak256(code);

  try {
    const uuid = await reader.proxiableUUID(implementationAddress, blockNumber);
    if (uuid.toLowerCase() !== EIP1967_IMPLEMENTATION_SLOT) {
      return {
        ...observation,
        blockers: ["UUPS_UUID_MISMATCH", ...observation.blockers],
      };
    }
  } catch {
    return {
      ...observation,
      blockers: ["UUPS_UUID_UNAVAILABLE", ...observation.blockers],
    };
  }
  observation.uupsConfirmed = true;
  observation.status = "deployed-proxy";
  return observation;
}
