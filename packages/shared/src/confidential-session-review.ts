import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { ZAMA_SWAP_SEPOLIA } from "./swap-venue";
import type { VenueQuorum } from "./venue-quorum";

const accountAddress = z
  .string()
  .refine(isAddress)
  .transform((value) => getAddress(value));
const evmSelector = z
  .string()
  .regex(/^0x[0-9a-fA-F]{8}$/)
  .transform((value) => value.toLowerCase());

/**
 * A *locally inspected draft*, never an account installation, permit, signed
 * EIP-712 object, MCP operation or transaction. No amount/pair/ciphertext is
 * accepted: even a public whitelist can leak a confidential trade's direction.
 */
export const confidentialSessionReviewSchema = z
  .object({
    purpose: z.literal("confidential-only"),
    mode: z.literal("review-only"),
    chainId: z.literal(ZAMA_SWAP_SEPOLIA.chainId),
    smartAccount: accountAddress,
    delegate: accountAddress,
    venue: accountAddress,
    selector: evmSelector,
    maxActions: z.number().int().min(1).max(10),
    validAfter: z.number().int().positive(),
    validUntil: z.number().int().positive(),
    reviewNonce: z
      .string()
      .regex(/^[1-9]\d{0,38}$/)
      .refine((value) => BigInt(value) < 1n << 128n),
  })
  .strict();

/** Public ERC-20 / generic wallet selectors are never a confidential trade. */
const forbiddenSelectors = new Set([
  "0xa9059cbb", // ERC20 transfer(address,uint256)
  "0x23b872dd", // ERC20 transferFrom(address,address,uint256)
  "0x095ea7b3", // ERC20 approve(address,uint256)
  "0x3659cfe6", // UUPS upgradeTo(address)
  "0x4f1ef286", // UUPS upgradeToAndCall(address,bytes)
  "0x00000000", // fallback/invalid
]);

const permanentBlockers = [
  "ERC7579_MODULE_NOT_INSTALLED",
  "NO_OWNER_SIGNED_SMART_ACCOUNT_SESSION",
  "ACCOUNT_CODE_AND_ERC7579_SUPPORT_UNVERIFIED",
  "VENUE_SELECTOR_AND_ENCRYPTED_ABI_UNVERIFIED",
  "NO_ONCHAIN_SPEND_AND_REPLAY_ENFORCEMENT",
  "ENCRYPTED_SETTLEMENT_NOT_VERIFIED",
  "PUBLIC_FALLBACK_FORBIDDEN",
] as const;

/**
 * An independent preflight review of proposed permissions. No signing, no
 * capital numbers and no venue calls. A good draft is still never executable.
 */
export function reviewConfidentialSessionDraft(
  submission: unknown,
  venue: Pick<
    VenueQuorum,
    "status" | "evidenceFromIndependentObservers"
  > | null,
  nowSeconds: number,
) {
  const parsed = confidentialSessionReviewSchema.safeParse(submission);
  const reasons: string[] = [];
  if (!parsed.success) reasons.push("INVALID_SESSION_DRAFT");
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds <= 0) {
    reasons.push("INVALID_REVIEW_CLOCK");
  }
  if (parsed.success) {
    const {
      smartAccount,
      delegate,
      venue: target,
      selector,
      validAfter,
      validUntil,
    } = parsed.data;
    if (
      smartAccount.toLowerCase() === delegate.toLowerCase() ||
      smartAccount === "0x0000000000000000000000000000000000000000" ||
      delegate === "0x0000000000000000000000000000000000000000"
    )
      reasons.push("ACCOUNT_OR_DELEGATE_INVALID");
    if (target.toLowerCase() !== ZAMA_SWAP_SEPOLIA.address.toLowerCase())
      reasons.push("UNREGISTERED_CONFIDENTIAL_VENUE");
    if (forbiddenSelectors.has(selector))
      reasons.push("PUBLIC_OR_PRIVILEGED_SELECTOR_DENIED");
    if (
      Number.isSafeInteger(nowSeconds) &&
      nowSeconds > 0 &&
      (validAfter < nowSeconds - 3600 ||
        validAfter > nowSeconds + 60 ||
        validUntil <= nowSeconds ||
        validUntil <= validAfter ||
        validUntil > nowSeconds + 86400 ||
        validUntil - validAfter > 86400)
    )
      reasons.push("SESSION_WINDOW_OUTSIDE_REVIEW_BOUND");
  }
  const codeIdentityVerified =
    venue?.status === "consistent-code-evidence" &&
    venue.evidenceFromIndependentObservers === true;
  if (!codeIdentityVerified)
    reasons.push("INDEPENDENT_VENUE_CODE_PROOF_MISSING");
  const reviewable = reasons.length === 0;
  return {
    reviewable,
    executionAllowed: false as const,
    canSign: false as const,
    canInstallModule: false as const,
    canApproveTokens: false as const,
    mode: "review-only" as const,
    privacy: "confidential-only" as const,
    signedByOwner: false as const,
    reasons: [...reasons, ...permanentBlockers],
  };
}
