import { getAddress, isAddress } from "viem";
import { z } from "zod";

/**
 * Owner-facing PREVIEW of an agent session permission, mirroring the exact
 * grant rules of contracts/src/accounts/SessionCallExecutor.sol.
 *
 * It is a review aid, never authority: it does not sign, does not produce
 * calldata or a UserOperation, does not install a module and does not grant a
 * session. A "reviewable" result means only that the on-chain executor would
 * not reject the parameters for the reasons checkable off-chain. Two checks
 * need chain state and are always reported as remaining: the target must have
 * code and the executor must be installed on the account.
 *
 * Parity with the contract is enforced by tests/session-permission-local.test.ts
 * (differential test against deployed bytecode on Anvil).
 */

/** Must equal SessionCallExecutor.MAX_SESSION_DURATION (7 days). */
export const SESSION_MAX_DURATION_SECONDS = 7 * 24 * 60 * 60;
/** Must equal SessionCallExecutor.MAX_SESSION_CALLS. */
export const SESSION_MAX_CALLS = 100;

/** Must equal SessionCallExecutor.isForbiddenSelector, entry for entry. */
export const FORBIDDEN_SESSION_SELECTORS: Readonly<Record<string, string>> = {
  "0x00000000": "empty selector / fallback",
  "0xa9059cbb": "ERC-20 transfer",
  "0x23b872dd": "ERC-20/721 transferFrom",
  "0x095ea7b3": "ERC-20/721 approve",
  "0x39509351": "ERC-20 increaseAllowance",
  "0xd505accf": "ERC-2612 permit",
  "0xa22cb465": "ERC-721/1155 setApprovalForAll",
  "0x42842e0e": "ERC-721 safeTransferFrom",
  "0xb88d4fde": "ERC-721 safeTransferFrom with data",
  "0xf242432a": "ERC-1155 safeTransferFrom",
  "0x2eb2c2d6": "ERC-1155 safeBatchTransferFrom",
  "0xd4febb96": "ERC-7984 setOperator",
  "0x5bebed7e": "ERC-7984 confidentialTransfer",
  "0x2fb74e62": "ERC-7984 confidentialTransfer with proof",
  "0x537d3c50": "ERC-7984 confidentialTransferAndCall",
  "0xde642119": "ERC-7984 confidentialTransferAndCall with proof",
  "0xeb3155b5": "ERC-7984 confidentialTransferFrom",
  "0xe064b9bb": "ERC-7984 confidentialTransferFrom with proof",
  "0xc7b8a75e": "ERC-7984 confidentialTransferFromAndCall",
  "0x34c45743": "ERC-7984 confidentialTransferFromAndCall with proof",
  "0xbf376c7a": "ERC-7984 wrapper wrap",
  "0xe8c15fd4": "ERC-7984 wrapper unwrap",
  "0x5bf4ef06": "ERC-7984 wrapper unwrap with proof",
  "0x9517e29f": "ERC-7579 installModule",
  "0xa71763a8": "ERC-7579 uninstallModule",
  "0xe9ae5c53": "ERC-7579 execute",
  "0xd691c964": "ERC-7579 executeFromExecutor",
  "0x4f1ef286": "UUPS upgradeToAndCall",
  "0x3659cfe6": "UUPS upgradeTo",
};

/** The executor prototype is deployed nowhere public; Sepolia previews stay blocked. */
export const SESSION_PREVIEW_CHAINS = [31337, 11155111] as const;

const address = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), "INVALID_ADDRESS")
  .transform((value) => getAddress(value));
const uint48 = z
  .number()
  .int()
  .min(0)
  .max(2 ** 48 - 1);

export const sessionPermissionRequestSchema = z
  .object({
    chainId: z
      .number()
      .int()
      .refine(
        (value) =>
          (SESSION_PREVIEW_CHAINS as readonly number[]).includes(value),
        "UNSUPPORTED_CHAIN",
      ),
    account: address,
    /** The SessionCallExecutor module address the grant would be sent to. */
    executor: address,
    agent: address,
    target: address,
    selector: z
      .string()
      .regex(/^0x[0-9a-fA-F]{8}$/, "INVALID_SELECTOR")
      .transform((value) => value.toLowerCase()),
    validAfter: uint48,
    validUntil: uint48,
    maxCalls: z
      .number()
      .int()
      .min(0)
      .max(2 ** 32 - 1),
    /** Optional owner-facing label; never sent anywhere, never echoed beyond 80 chars. */
    purpose: z
      .string()
      .max(80)
      .regex(/^[\x20-\x7e]*$/, "PRINTABLE_ASCII_ONLY")
      .optional(),
  })
  .strict();
export type SessionPermissionRequest = z.input<
  typeof sessionPermissionRequestSchema
>;

export type SessionGrantRejection =
  | "INVALID_AGENT"
  | "INVALID_TARGET"
  | "FORBIDDEN_SELECTOR"
  | "INVALID_WINDOW"
  | "INVALID_CALL_LIMIT";

export type SessionPermissionPreview = {
  status: "reviewable" | "would-be-rejected";
  /** In the contract's check order; the first entry is the revert the chain would return. */
  rejections: SessionGrantRejection[];
  forbiddenSelectorLabel: string | null;
  summary: string[];
  onchainChecksRemaining: Array<"TARGET_HAS_CODE" | "EXECUTOR_INSTALLED">;
  blockers: string[];
  executionAllowed: false;
  canSign: false;
  canInstallModule: false;
  canGrantSession: false;
};

export const SESSION_PREVIEW_BLOCKERS = [
  "PROTOTYPE_EXECUTOR_UNAUDITED_ANVIL_ONLY",
  "OWNER_USEROPERATION_FLOW_NOT_ENABLED",
  "NO_VERIFIED_CONFIDENTIAL_VENUE",
  "NO_ENCRYPTED_AMOUNT_BUDGET",
] as const;

/**
 * Evaluate the grant exactly as `SessionCallExecutor.grantSession` would at
 * block timestamp `nowSeconds`, excluding the two chain-state checks.
 */
export function previewSessionPermission(
  request: SessionPermissionRequest,
  nowSeconds: number,
): SessionPermissionPreview {
  if (!Number.isInteger(nowSeconds) || nowSeconds < 0)
    throw new Error("INVALID_EVALUATION_TIME");
  const input = sessionPermissionRequestSchema.parse(request);
  const rejections: SessionGrantRejection[] = [];
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const zero = "0x0000000000000000000000000000000000000000";

  // Order mirrors the contract's require sequence after the installed check.
  if (
    same(input.agent, zero) ||
    same(input.agent, input.account) ||
    same(input.agent, input.executor)
  )
    rejections.push("INVALID_AGENT");
  if (
    same(input.target, input.account) ||
    same(input.target, input.executor) ||
    same(input.target, input.agent)
  )
    rejections.push("INVALID_TARGET");
  const forbiddenSelectorLabel =
    FORBIDDEN_SESSION_SELECTORS[input.selector] ?? null;
  if (forbiddenSelectorLabel) rejections.push("FORBIDDEN_SELECTOR");
  if (
    input.validUntil <= nowSeconds ||
    input.validUntil <= input.validAfter ||
    input.validUntil - input.validAfter > SESSION_MAX_DURATION_SECONDS ||
    input.validUntil > nowSeconds + SESSION_MAX_DURATION_SECONDS
  )
    rejections.push("INVALID_WINDOW");
  if (input.maxCalls === 0 || input.maxCalls > SESSION_MAX_CALLS)
    rejections.push("INVALID_CALL_LIMIT");

  const hours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;
  const startsIn = input.validAfter - nowSeconds;
  const summary = [
    `Agent ${input.agent} could call one function (${input.selector}) on contract ${input.target}, from account ${input.account}.`,
    `It could make at most ${input.maxCalls} call${input.maxCalls === 1 ? "" : "s"}, each sending zero native value, never as a batch or delegatecall.`,
    startsIn > 0
      ? `Starts in about ${hours(startsIn)} h and lasts about ${hours(Math.max(0, input.validUntil - input.validAfter))} h.`
      : `Active now for about ${hours(Math.max(0, input.validUntil - nowSeconds))} h.`,
    "You can revoke it, or every session at once, immediately; removing the module also ends all sessions.",
    "It cannot move, approve or wrap tokens (including confidential ERC-7984 tokens), change modules or upgrade contracts.",
    "It does not limit amounts inside the allowed function. Only grant functions whose effects you understand.",
  ];
  if (input.purpose) summary.unshift(`Purpose (your note): ${input.purpose}`);

  return {
    status: rejections.length === 0 ? "reviewable" : "would-be-rejected",
    rejections,
    forbiddenSelectorLabel,
    summary,
    onchainChecksRemaining: ["TARGET_HAS_CODE", "EXECUTOR_INSTALLED"],
    blockers: [...SESSION_PREVIEW_BLOCKERS],
    executionAllowed: false,
    canSign: false,
    canInstallModule: false,
    canGrantSession: false,
  };
}
