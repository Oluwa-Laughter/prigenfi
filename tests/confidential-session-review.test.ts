import { describe, expect, it } from "vitest";
import { ZAMA_SWAP_SEPOLIA } from "../packages/shared/src/swap-venue";
import {
  confidentialSessionReviewSchema,
  reviewConfidentialSessionDraft,
} from "../packages/shared/src/confidential-session-review";

const now = 1_800_000_000;
const verified = {
  status: "consistent-code-evidence" as const,
  evidenceFromIndependentObservers: true,
};
const draft = {
  purpose: "confidential-only",
  mode: "review-only",
  chainId: 11155111,
  smartAccount: "0x000000000000000000000000000000000000aaaa",
  delegate: "0x000000000000000000000000000000000000bbbb",
  venue: ZAMA_SWAP_SEPOLIA.address,
  selector: "0x11223344",
  maxActions: 2,
  validAfter: now - 60,
  validUntil: now + 3600,
  reviewNonce: "1",
};

describe("confidential-session preflight is not wallet authorization", () => {
  it("accepts well-scoped draft for review only, never signs, installs, decrypts or spends", () => {
    const result = reviewConfidentialSessionDraft(draft, verified, now);
    expect(confidentialSessionReviewSchema.safeParse(draft).success).toBe(true);
    expect(result).toMatchObject({
      reviewable: true,
      executionAllowed: false,
      canSign: false,
      canInstallModule: false,
      canApproveTokens: false,
      signedByOwner: false,
      privacy: "confidential-only",
    });
    expect(result.reasons).toContain("NO_ONCHAIN_SPEND_AND_REPLAY_ENFORCEMENT");
    expect(result.reasons).toContain(
      "VENUE_SELECTOR_AND_ENCRYPTED_ABI_UNVERIFIED",
    );
  });
  it("never grants permission even with independently confirmed UUPS code", () => {
    for (const proof of [
      null,
      {
        status: "unverified" as const,
        evidenceFromIndependentObservers: false,
      },
      verified,
    ]) {
      const result = reviewConfidentialSessionDraft(draft, proof, now);
      expect(result.executionAllowed).toBe(false);
      expect(result.canSign).toBe(false);
    }
  });
  it("rejects plaintext amounts, exposed pairs, ciphertext, calldata and model-generated signing claims", () => {
    for (const extra of [
      { amount: "10" },
      { tokenIn: "0x0000000000000000000000000000000000000001" },
      { tokenOut: "0x0000000000000000000000000000000000000002" },
      { calldata: "0x1234" },
      { encryptedAmount: "0x1234" },
      { walletPrivateKey: "not-a-key" },
      { authorizedByAgent: true },
      { operatorApproval: true },
      { canFallbackToPublic: true },
    ]) {
      const result = reviewConfidentialSessionDraft(
        { ...draft, ...extra },
        verified,
        now,
      );
      expect(result.reviewable).toBe(false);
      expect(result.reasons).toContain("INVALID_SESSION_DRAFT");
      expect(JSON.stringify(result)).not.toContain(Object.keys(extra)[0]);
    }
  });
  it("rejects wrong chain, public/trading fallbacks, wrong venue and privilege selectors", () => {
    const invalid = [
      { chainId: 1 },
      { purpose: "public-allowed" },
      { mode: "approved" },
      { venue: "0x000000000000000000000000000000000000dDdD" },
      ...[
        "0xa9059cbb",
        "0x23b872dd",
        "0x095ea7b3",
        "0x3659cfe6",
        "0x4f1ef286",
        "0x00000000",
      ].map((selector) => ({ selector })),
      { selector: "0x123" },
      { maxActions: 0 },
      { maxActions: 100 },
      { reviewNonce: "0" },
      { reviewNonce: (1n << 128n).toString() },
    ];
    for (const change of invalid) {
      const result = reviewConfidentialSessionDraft(
        { ...draft, ...change },
        verified,
        now,
      );
      expect(result.reviewable, JSON.stringify(change)).toBe(false);
      expect(result.executionAllowed).toBe(false);
    }
  });
  it("denies zero/delegate-self addresses and expired/future/long-running sessions", () => {
    const invalid = [
      { delegate: draft.smartAccount },
      { smartAccount: "0x0000000000000000000000000000000000000000" },
      { delegate: "0x0000000000000000000000000000000000000000" },
      { validAfter: now + 120 },
      { validAfter: now - 3601 },
      { validUntil: now },
      { validUntil: now + 86401 },
      { validUntil: draft.validAfter },
    ];
    for (const change of invalid) {
      const result = reviewConfidentialSessionDraft(
        { ...draft, ...change },
        verified,
        now,
      );
      expect(result.reviewable, JSON.stringify(change)).toBe(false);
      expect(result.executionAllowed).toBe(false);
    }
  });
  it("invalid review clock cannot grant authority", () => {
    for (const clock of [
      -1,
      Number.NaN,
      0,
      Number.POSITIVE_INFINITY,
      now + 86401,
    ]) {
      const result = reviewConfidentialSessionDraft(draft, verified, clock);
      expect(result.reviewable).toBe(false);
      expect(result.executionAllowed).toBe(false);
    }
  });
});
