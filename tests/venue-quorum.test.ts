import { describe, expect, it } from "vitest";
import { getAddress, type Address, type Hex } from "viem";
import {
  EIP1967_IMPLEMENTATION_SLOT,
  inspectZamaSwapVenue,
  ZAMA_SWAP_SEPOLIA,
  type SwapReadClient,
} from "../packages/shared/src/swap-venue";
import {
  assessVenueQuorum,
  MAX_RPC_BLOCK_SPREAD,
  type VenueBaseline,
  type VenueRead,
} from "../packages/shared/src/venue-quorum";

const implementation = getAddress("0x93FA553AFd73952105450264620eA08aBa7B52d5");
const slot = ("0x" +
  "0".repeat(24) +
  implementation.slice(2).toLowerCase()) as Hex;
const baseBlock = 12_120_670n;
function reader(
  blockNumber = baseBlock,
  implementationCode: Hex = "0x6001600055",
): SwapReadClient {
  return {
    chainId: async () => ZAMA_SWAP_SEPOLIA.chainId,
    blockNumber: async () => blockNumber,
    codeAt: async (address: Address) =>
      address.toLowerCase() === implementation.toLowerCase()
        ? implementationCode
        : "0x6001600055",
    storageAt: async () => slot,
    proxiableUUID: async () => EIP1967_IMPLEMENTATION_SLOT,
  };
}
async function pair() {
  const a = await inspectZamaSwapVenue(reader());
  const b = await inspectZamaSwapVenue(reader(baseBlock + 2n));
  const baseline: VenueBaseline = {
    proxyAddress: a.proxyAddress,
    proxyCodeHash: a.proxyCodeHash!,
    implementationAddress: a.implementationAddress!,
    implementationCodeHash: a.implementationCodeHash!,
  };
  return {
    first: { provider: "primary", observation: a, failure: null } as VenueRead,
    second: {
      provider: "secondary",
      observation: b,
      failure: null,
    } as VenueRead,
    baseline,
  };
}

describe("two-independent-provider confidential venue readiness", () => {
  it("cross checks UUPS proxy and historical code, while execution is always blocked", async () => {
    const { first, second, baseline } = await pair();
    const report = assessVenueQuorum(first, second, baseline);
    expect(report.status).toBe("consistent-code-evidence");
    expect(report.evidenceFromIndependentObservers).toBe(true);
    expect(report.baselineMatches).toBe(true);
    expect(report.proxyImplementation).toBe(implementation);
    expect(report.executionAllowed).toBe(false);
    expect(report.privateTradingEnabled).toBe(false);
    expect(report.signedIntentAllowed).toBe(false);
    expect(report.blockers).toContain("RFQ_INTERFACE_UNVERIFIED");
    expect(report.blockers).toContain("PUBLIC_FALLBACK_FORBIDDEN");
  });
  it("requires two separately named observers", async () => {
    const { first, second, baseline } = await pair();
    const result = assessVenueQuorum(
      first,
      { ...second, provider: "primary" },
      baseline,
    );
    expect(result.status).toBe("unverified");
    expect(result.blockers).toContain("INDEPENDENT_PROVIDERS_REQUIRED");
  });
  it("rejects independent provider RPC outages without fallback", async () => {
    const { first, second, baseline } = await pair();
    const result = assessVenueQuorum(
      first,
      { ...second, failure: "RPC_ERROR", observation: null },
      baseline,
    );
    expect(result.status).toBe("unverified");
    expect(result.blockers).toContain("QUORUM_RPC_UNAVAILABLE");
    expect(result.executionAllowed).toBe(false);
  });
  it("rejects mismatched proxy and implementation code identities", async () => {
    const { first, second, baseline } = await pair();
    for (const field of [
      "proxyCodeHash",
      "implementationAddress",
      "implementationCodeHash",
    ] as const) {
      const result = assessVenueQuorum(
        first,
        {
          ...second,
          observation: {
            ...second.observation!,
            [field]:
              field === "implementationAddress"
                ? getAddress("0x000000000000000000000000000000000000aAaA")
                : (("0x" + "b".repeat(64)) as Hex),
          },
        },
        baseline,
      );
      expect(result.status).toBe("unverified");
      expect(result.blockers).toContain("RPC_CODE_IDENTITY_DIVERGED");
    }
  });
  it("rejects upgrade/code drift versus historically reviewed baseline even if observers agree", async () => {
    const { first, second, baseline } = await pair();
    const replacement = "0x" + "c".repeat(64);
    const report = assessVenueQuorum(first, second, {
      ...baseline,
      implementationCodeHash: replacement,
    });
    expect(report.baselineMatches).toBe(false);
    expect(report.status).toBe("unverified");
    expect(report.blockers).toContain("REVIEWED_BASELINE_CHANGED_OR_MISSING");
  });
  it("rejects block skew beyond the freshness policy, inclusive boundary is allowed", async () => {
    const { first, second, baseline } = await pair();
    const noQuorum = assessVenueQuorum(
      first,
      {
        ...second,
        observation: {
          ...second.observation!,
          blockNumber: (baseBlock + MAX_RPC_BLOCK_SPREAD + 1n).toString(),
        },
      },
      baseline,
    );
    expect(noQuorum.blockers).toContain("RPC_BLOCK_SPREAD_EXCEEDED");
    const within = assessVenueQuorum(
      first,
      {
        ...second,
        observation: {
          ...second.observation!,
          blockNumber: (baseBlock + MAX_RPC_BLOCK_SPREAD).toString(),
        },
      },
      baseline,
    );
    expect(within.status).toBe("consistent-code-evidence");
  });
  it("fails closed for missing heights, incomplete UUPS proof and unexpected execution claims", async () => {
    const { first, second, baseline } = await pair();
    const noBlock = assessVenueQuorum(
      first,
      {
        ...second,
        observation: { ...second.observation!, blockNumber: null },
      },
      baseline,
    );
    expect(noBlock.blockers).toContain("RPC_BLOCK_NUMBER_UNAVAILABLE");
    const invalidUups = assessVenueQuorum(
      first,
      {
        ...second,
        observation: { ...second.observation!, uupsConfirmed: false },
      },
      baseline,
    );
    expect(invalidUups.blockers).toContain("PROXY_ATTESTATION_INCOMPLETE");
    const impossible = assessVenueQuorum(
      first,
      {
        ...second,
        observation: {
          ...second.observation!,
          executionAllowed: true,
        } as unknown as typeof second.observation,
      },
      baseline,
    );
    expect(impossible.blockers).toContain("UNEXPECTED_EXECUTION_CLAIM");
  });
});
