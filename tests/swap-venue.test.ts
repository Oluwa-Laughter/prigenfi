import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getAddress, type Address, type Hex } from "viem";
import {
  EIP1967_IMPLEMENTATION_SLOT,
  ZAMA_SWAP_SEPOLIA,
  inspectZamaSwapVenue,
  type SwapReadClient,
} from "../packages/shared/src/swap-venue";

const impl = getAddress("0x93fa553afd73952105450264620ea08aba7b52d5");
const slot = ("0x" + "0".repeat(24) + impl.slice(2).toLowerCase()) as Hex;
const b = 12091125n;
const reader = (patch: Partial<SwapReadClient> = {}): SwapReadClient => ({
  chainId: async () => 11155111,
  blockNumber: async () => b,
  codeAt: async (_addr: Address, _block: bigint) => "0x6001600055",
  storageAt: async (_addr: Address, _slot: Hex, _block: bigint) => slot,
  proxiableUUID: async () => EIP1967_IMPLEMENTATION_SLOT,
  ...patch,
});

describe("official Sepolia ConfidentialSwap read-only inspection", () => {
  it("pins official registry bytes against the upstream manifest", () => {
    const raw = readFileSync("infra/zama-registry/testnet.json");
    const manifest = JSON.parse(
      readFileSync("infra/zama-registry/manifest.json", "utf8"),
    );
    const data = JSON.parse(raw.toString("utf8"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      manifest.files_sha256sum["testnet.json"],
    );
    expect(data.chains.ethereum_sepolia.chain_id).toBe(11155111);
    expect(data.contracts.CONFIDENTIAL_SWAP).toMatchObject({
      address: ZAMA_SWAP_SEPOLIA.address,
      chain: "ethereum_sepolia",
      type: "confidential_swap",
      deployment_block: Number(ZAMA_SWAP_SEPOLIA.deploymentBlock),
    });
  });
  it("confirms a UUPS proxy but never grants agent trading authority", async () => {
    const read = reader();
    const observed = await inspectZamaSwapVenue(read);
    expect(observed).toMatchObject({
      chainId: 11155111,
      blockNumber: b.toString(),
      proxyAddress: ZAMA_SWAP_SEPOLIA.address,
      implementationAddress: impl,
      uupsConfirmed: true,
      status: "deployed-proxy",
      privateTradingEnabled: false,
      executionAllowed: false,
      permissionedTradingEnabled: false,
    });
    expect(observed.proxyCodeHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(observed.implementationCodeHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(observed.blockers).toContain("ENCRYPTED_SETTLEMENT_NOT_TESTED");
    expect(observed.blockers).toContain("PUBLIC_FALLBACK_FORBIDDEN");
  });
  it("rejects wrong chain before inspecting any contract", async () => {
    let called = false;
    const res = await inspectZamaSwapVenue(
      reader({
        chainId: async () => 1,
        codeAt: async () => {
          called = true;
          return "0x6001";
        },
      }),
    );
    expect(called).toBe(false);
    expect(res.status).toBe("unverified");
    expect(res.blockers).toContain("WRONG_CHAIN");
    expect(res.executionAllowed).toBe(false);
  });
  it("rejects snapshots before deployment and contracts without bytecode", async () => {
    const early = await inspectZamaSwapVenue(
      reader({
        blockNumber: async () => 10000000n,
      }),
    );
    expect(early.blockers).toContain("BLOCK_PRECEDES_DEPLOYMENT");

    const noCode = await inspectZamaSwapVenue(
      reader({
        codeAt: async () => "0x",
      }),
    );
    expect(noCode.blockers).toContain("PROXY_CODE_MISSING");
  });
  it("rejects missing, zero or malformed implementation slots", async () => {
    for (const storage of [undefined, "0x", ("0x" + "0".repeat(64)) as Hex]) {
      const res = await inspectZamaSwapVenue(
        reader({
          storageAt: async () => storage as Hex | undefined,
        }),
      );
      expect(res.status).toBe("unverified");
      expect(res.executionAllowed).toBe(false);
    }
  });
  it("rejects missing implementation bytecode", async () => {
    const res = await inspectZamaSwapVenue(
      reader({
        codeAt: async (address) =>
          address.toLowerCase() === impl.toLowerCase() ? "0x" : "0x6001",
      }),
    );
    expect(res.blockers).toContain("IMPLEMENTATION_CODE_MISSING");
  });
  it("rejects wrong UUPS UUID and failed UUID probes", async () => {
    const mismatch = await inspectZamaSwapVenue(
      reader({
        proxiableUUID: async () => ("0x" + "1".repeat(64)) as Hex,
      }),
    );
    expect(mismatch.blockers).toContain("UUPS_UUID_MISMATCH");
    const failed = await inspectZamaSwapVenue(
      reader({
        proxiableUUID: async () => {
          throw new Error("call failed");
        },
      }),
    );
    expect(failed.blockers).toContain("UUPS_UUID_UNAVAILABLE");
  });
});
