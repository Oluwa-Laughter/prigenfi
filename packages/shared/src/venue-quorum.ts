import type { SwapVenueObservation } from "./swap-venue";
import { ZAMA_SWAP_SEPOLIA } from "./swap-venue";

/** Evidence comparison, NOT an RFQ interface or permission to move money. */
export type VenueRead = {
  provider: "primary" | "secondary";
  observation: SwapVenueObservation | null;
  failure: "RPC_ERROR" | "RPC_TIMEOUT" | null;
};
export type VenueBaseline = {
  proxyAddress: string;
  proxyCodeHash: string;
  implementationAddress: string;
  implementationCodeHash: string;
};

export const MAX_RPC_BLOCK_SPREAD = 32n;
export const VENUE_QUORUM_BLOCKERS = [
  "RFQ_INTERFACE_UNVERIFIED",
  "SEPOLIA_PAIR_SUPPORT_UNVERIFIED",
  "ENCRYPTED_ORDER_PROOF_MISSING",
  "LIQUIDITY_AND_FINALITY_UNVERIFIED",
  "AUDITED_SMART_ACCOUNT_AUTH_MISSING",
  "PUBLIC_FALLBACK_FORBIDDEN",
] as const;

export type VenueQuorum = {
  chainId: typeof ZAMA_SWAP_SEPOLIA.chainId;
  proxyAddress: typeof ZAMA_SWAP_SEPOLIA.address;
  status: "consistent-code-evidence" | "unverified";
  proxyImplementation: string | null;
  proxyCodeHash: string | null;
  implementationCodeHash: string | null;
  blockNumbers: { primary: string | null; secondary: string | null };
  evidenceFromIndependentObservers: boolean;
  baselineMatches: boolean;
  executionAllowed: false;
  privateTradingEnabled: false;
  signedIntentAllowed: false;
  blockers: string[];
};

/**
 * Require two distinct operators observing one Sepolia code identity and a
 * previously reviewed baseline. Do not silently 'approve' a new UUPS upgrade.
 * Height skew is bounded; no comparison asserts historical fork-finality.
 */
export function assessVenueQuorum(
  primary: VenueRead,
  secondary: VenueRead,
  baseline: VenueBaseline,
): VenueQuorum {
  const problems: string[] = [];
  const a = primary.observation;
  const b = secondary.observation;
  if (primary.provider !== "primary" || secondary.provider !== "secondary") {
    problems.push("INDEPENDENT_PROVIDERS_REQUIRED");
  }
  if (primary.failure || secondary.failure || !a || !b) {
    problems.push("QUORUM_RPC_UNAVAILABLE");
  }
  for (const observation of [a, b]) {
    if (!observation) continue;
    if (observation.chainId !== ZAMA_SWAP_SEPOLIA.chainId)
      problems.push("WRONG_CHAIN");
    if (
      observation.status !== "deployed-proxy" ||
      observation.uupsConfirmed !== true ||
      observation.proxyAddress.toLowerCase() !==
        ZAMA_SWAP_SEPOLIA.address.toLowerCase() ||
      !observation.proxyCodeHash ||
      !observation.implementationAddress ||
      !observation.implementationCodeHash
    ) {
      problems.push("PROXY_ATTESTATION_INCOMPLETE");
    }
    if (
      observation.executionAllowed !== false ||
      observation.privateTradingEnabled !== false
    ) {
      problems.push("UNEXPECTED_EXECUTION_CLAIM");
    }
  }
  const bothComplete = !!(
    a &&
    b &&
    a.proxyCodeHash &&
    b.proxyCodeHash &&
    a.implementationAddress &&
    b.implementationAddress &&
    a.implementationCodeHash &&
    b.implementationCodeHash
  );
  if (bothComplete && a && b) {
    if (
      a.proxyCodeHash?.toLowerCase() !== b.proxyCodeHash?.toLowerCase() ||
      a.implementationAddress?.toLowerCase() !==
        b.implementationAddress?.toLowerCase() ||
      a.implementationCodeHash?.toLowerCase() !==
        b.implementationCodeHash?.toLowerCase()
    )
      problems.push("RPC_CODE_IDENTITY_DIVERGED");
  }
  let heightA: bigint | null = null;
  let heightB: bigint | null = null;
  try {
    if (
      a?.blockNumber &&
      b?.blockNumber &&
      /^\d+$/.test(a.blockNumber) &&
      /^\d+$/.test(b.blockNumber)
    ) {
      heightA = BigInt(a.blockNumber);
      heightB = BigInt(b.blockNumber);
      if (
        heightA < ZAMA_SWAP_SEPOLIA.deploymentBlock ||
        heightB < ZAMA_SWAP_SEPOLIA.deploymentBlock
      ) {
        problems.push("BLOCK_BEFORE_DEPLOYMENT");
      }
      const diff = heightA > heightB ? heightA - heightB : heightB - heightA;
      if (diff > MAX_RPC_BLOCK_SPREAD)
        problems.push("RPC_BLOCK_SPREAD_EXCEEDED");
    } else {
      problems.push("RPC_BLOCK_NUMBER_UNAVAILABLE");
    }
  } catch {
    problems.push("RPC_BLOCK_NUMBER_UNAVAILABLE");
  }
  const baselineMatches =
    bothComplete &&
    !!a &&
    baseline.proxyAddress.toLowerCase() ===
      ZAMA_SWAP_SEPOLIA.address.toLowerCase() &&
    baseline.proxyCodeHash.toLowerCase() === a.proxyCodeHash?.toLowerCase() &&
    baseline.implementationAddress.toLowerCase() ===
      a.implementationAddress?.toLowerCase() &&
    baseline.implementationCodeHash.toLowerCase() ===
      a.implementationCodeHash?.toLowerCase();
  if (!baselineMatches) problems.push("REVIEWED_BASELINE_CHANGED_OR_MISSING");
  const confirmed =
    problems.length === 0 &&
    bothComplete &&
    heightA !== null &&
    heightB !== null;
  return {
    chainId: ZAMA_SWAP_SEPOLIA.chainId,
    proxyAddress: ZAMA_SWAP_SEPOLIA.address,
    status: confirmed ? "consistent-code-evidence" : "unverified",
    proxyImplementation: confirmed ? (a?.implementationAddress ?? null) : null,
    proxyCodeHash: confirmed ? (a?.proxyCodeHash ?? null) : null,
    implementationCodeHash: confirmed
      ? (a?.implementationCodeHash ?? null)
      : null,
    blockNumbers: {
      primary: a?.blockNumber ?? null,
      secondary: b?.blockNumber ?? null,
    },
    evidenceFromIndependentObservers: confirmed,
    baselineMatches: !!baselineMatches,
    executionAllowed: false,
    privateTradingEnabled: false,
    signedIntentAllowed: false,
    blockers: [...new Set(problems), ...VENUE_QUORUM_BLOCKERS],
  };
}
