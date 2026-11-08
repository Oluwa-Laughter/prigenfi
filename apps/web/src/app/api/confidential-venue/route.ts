import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { inspectZamaSwapVenue } from "@prigenfi/shared/swap-venue";

export const runtime = "nodejs";

const queryOnchainVenue = unstable_cache(
  async () => {
    // Fixed endpoint or operator-supplied RPC only. Never accept user-input URLs.
    const client = createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.SEPOLIA_RPC_URL ??
          "https://ethereum-sepolia-rpc.publicnode.com",
        { timeout: 8000, retryCount: 1 },
      ),
    });
    const abi = parseAbi(["function proxiableUUID() view returns (bytes32)"]);
    const report = await inspectZamaSwapVenue({
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
    return { ...report, checkedAt: new Date().toISOString() };
  },
  ["prigenfi-sepolia-swap-proxy-v1"],
  { revalidate: 240 },
);

export async function GET() {
  try {
    const report = await queryOnchainVenue();
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=240, stale-while-revalidate=60",
      },
    });
  } catch {
    // Do not disclose private RPC endpoints or exceptions to public clients.
    return NextResponse.json(
      {
        status: "unverified",
        source: "Sepolia JSON-RPC",
        chainId: 11155111,
        blockNumber: null,
        proxyAddress: "0xab86445f72A64A99C8d248dcE004915B45C88e20",
        implementationAddress: null,
        proxyCodeHash: null,
        implementationCodeHash: null,
        uupsConfirmed: false,
        privateTradingEnabled: false,
        executionAllowed: false,
        permissionedTradingEnabled: false,
        blockers: ["RPC_UNAVAILABLE", "PUBLIC_FALLBACK_FORBIDDEN"],
        checkedAt: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
