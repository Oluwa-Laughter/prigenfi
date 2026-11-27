import {
  type Address,
  type Hex,
  decodeAbiParameters,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  toHex,
} from "viem";
import { z } from "zod";

/**
 * Strictly READ-ONLY ERC-7579 modular smart-account compatibility assessment.
 *
 * This module answers one question: "what does this deployed contract claim
 * about itself, and is that claim internally consistent with ERC-7579?" It
 * never signs, never sends a transaction, never installs a module, never
 * grants a session and never turns a positive result into spending authority.
 *
 * A self-reported `accountId()` or `supportsModule()` answer is UNTRUSTED
 * contract output. Only a runtime code hash that appears in an independently
 * reviewed implementation registry may be labelled a verified implementation,
 * and that registry is intentionally empty until a smart-account stack has
 * been selected, its source reproduced and its audit evidence reviewed.
 */

/** Canonical spec provenance, checked against ethereum/ERCs ERCS/erc-7579.md. */
export const ERC7579_SPEC = {
  erc: 7579,
  status: "Draft",
  source: "github.com/ethereum/ERCs/blob/master/ERCS/erc-7579.md",
  sourceSha256:
    "df9f94dd8f75518b1ed6cf234a3d66e1d8708ec3b494e3e3654c9c63e776b3c2",
  retrievedAt: "2026-11-27",
  referenceImplementation:
    "@openzeppelin/contracts@5.6.1 account/extensions/draft-AccountERC7579.sol",
} as const;

export const ERC7579_MODULE_TYPES = {
  validator: 1n,
  executor: 2n,
  fallback: 3n,
  hook: 4n,
} as const;
export type Erc7579ModuleKind = keyof typeof ERC7579_MODULE_TYPES;

/** Selectors cross-checked in contracts/test/Erc7579Fixtures.t.sol. */
export const ERC7579_SELECTORS = {
  accountId: "0x9cfd7cff",
  supportsExecutionMode: "0xd03c7914",
  supportsModule: "0xf2dc691d",
  isModuleInstalled: "0x112d3a7d",
  installModule: "0x9517e29f",
  uninstallModule: "0xa71763a8",
  execute: "0xe9ae5c53",
  executeFromExecutor: "0xd691c964",
  isModuleType: "0xecd05961",
  isValidSignature: "0x1626ba7e",
} as const;

export const ERC1271_MAGIC_VALUE = "0x1626ba7e" as const;
/** keccak256("eip1967.proxy.implementation") - 1 */
export const ERC1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
const EIP7702_DELEGATION_PREFIX = "0xef0100";

export const ERC7579_CALL_TYPES = {
  single: 0x00,
  batch: 0x01,
  staticcall: 0xfe,
  delegatecall: 0xff,
} as const;
export const ERC7579_EXEC_TYPES = { revert: 0x00, try: 0x01 } as const;
type CallTypeName = keyof typeof ERC7579_CALL_TYPES;
type ExecTypeName = keyof typeof ERC7579_EXEC_TYPES;

/** bytes32 = callType(1) | execType(1) | unused(4) | selector(4) | payload(22). */
export function encodeExecutionMode(callType: number, execType: number): Hex {
  if (
    !Number.isInteger(callType) ||
    !Number.isInteger(execType) ||
    callType < 0 ||
    callType > 0xff ||
    execType < 0 ||
    execType > 0xff
  )
    throw new Error("INVALID_MODE_BYTE");
  const hex = (value: number) => value.toString(16).padStart(2, "0");
  return `0x${hex(callType)}${hex(execType)}${"0".repeat(60)}`;
}

const PROBED_MODES: ReadonlyArray<[CallTypeName, ExecTypeName]> = [
  ["single", "revert"],
  ["single", "try"],
  ["batch", "revert"],
  ["batch", "try"],
  ["staticcall", "revert"],
  ["delegatecall", "revert"],
  ["delegatecall", "try"],
];

/**
 * Values no ERC defines. ERC-7780 assigns module types 5-7, so probes use 0
 * and uint256 max; 0x7f is not a defined call or exec type. ERC-7579 says
 * supportsModule/supportsExecutionMode MUST return false when unsupported.
 */
const UNDEFINED_MODULE_TYPES = [0n, 2n ** 256n - 1n] as const;
const UNDEFINED_MODES = [
  encodeExecutionMode(0x7f, 0x00),
  encodeExecutionMode(0x00, 0x7f),
] as const;
/** Deterministic codeless address used to detect phantom module claims. */
export const PHANTOM_MODULE_ADDRESS = getAddress(
  `0x${keccak256(toHex("prigenfi.erc7579.phantom-module")).slice(26)}`,
);
const ERC1271_PROBE_DIGEST = keccak256(toHex("prigenfi.erc7579.probe"));

export const erc7579ReadAbi = parseAbi([
  "function accountId() view returns (string)",
  "function supportsExecutionMode(bytes32 encodedMode) view returns (bool)",
  "function supportsModule(uint256 moduleTypeId) view returns (bool)",
  "function isModuleInstalled(uint256 moduleTypeId, address module, bytes additionalContext) view returns (bool)",
  "function isModuleType(uint256 moduleTypeId) view returns (bool)",
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);

/** Chains where the assessor may run. Read-only; extend only by decision. */
export const ERC7579_ASSESSMENT_CHAINS = [31337, 11155111] as const;
const MAX_MODULE_CHECKS = 8;
const MAX_ACCOUNT_ID_LENGTH = 128;

const addressSchema = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), "INVALID_ADDRESS")
  .transform((value) => getAddress(value));
const hexBytesSchema = z
  .string()
  .regex(/^0x([0-9a-fA-F]{2}){0,64}$/, "INVALID_CONTEXT")
  .transform((value) => value.toLowerCase() as Hex);

export const erc7579AssessmentRequestSchema = z
  .object({
    chainId: z
      .number()
      .int()
      .refine(
        (value) =>
          (ERC7579_ASSESSMENT_CHAINS as readonly number[]).includes(value),
        "UNSUPPORTED_CHAIN",
      ),
    account: addressSchema,
    modules: z
      .array(
        z
          .object({
            kind: z.enum(["validator", "executor", "fallback", "hook"]),
            address: addressSchema,
            additionalContext: hexBytesSchema.default("0x"),
          })
          .strict(),
      )
      .max(MAX_MODULE_CHECKS)
      .default([]),
  })
  .strict();
export type Erc7579AssessmentRequest = z.input<
  typeof erc7579AssessmentRequestSchema
>;

/** Minimal block-pinned read surface; no signer or sender is ever accepted. */
export type Erc7579ChainReader = {
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getCode(address: Address, blockNumber: bigint): Promise<Hex | undefined>;
  getStorageAt(
    address: Address,
    slot: Hex,
    blockNumber: bigint,
  ): Promise<Hex | undefined>;
  /** eth_call with no `from`; a revert resolves to `{ ok: false }`. */
  call(
    to: Address,
    data: Hex,
    blockNumber: bigint,
  ): Promise<{ ok: true; data: Hex } | { ok: false }>;
};

export type ReviewedErc7579Implementation = {
  chainId: number;
  runtimeCodeHash: Hex;
  accountId: string;
  sourceReference: string;
  reviewReference: string;
};

/**
 * Independently reviewed implementations. EMPTY by decision: no smart-account
 * stack has been selected, reproduced from source and audit-reviewed yet.
 * Adding an entry requires a recorded decision in docs/DECISIONS.md.
 */
export const REVIEWED_ERC7579_IMPLEMENTATIONS: readonly ReviewedErc7579Implementation[] =
  [];

type Tri = boolean | "reverted" | "malformed";

export type Erc7579Classification =
  | "assessment-failed"
  | "no-contract-code"
  | "not-erc7579"
  | "self-reported-unreliable"
  | "self-reported-erc7579"
  | "reviewed-implementation";

export type Erc7579Assessment = {
  chainId: number;
  account: Address;
  blockNumber: string | null;
  classification: Erc7579Classification;
  codeKind:
    "none" | "contract" | "erc1967-proxy" | "eip7702-delegated-eoa" | null;
  accountCodeHash: Hex | null;
  implementationAddress: Address | null;
  identityCodeHash: Hex | null;
  selfReported: {
    accountId: string | null;
    accountIdWellFormed: boolean;
    modules: Record<Erc7579ModuleKind, Tri>;
    executionModes: Record<string, Tri>;
    erc1271:
      | "rejects-probe"
      | "accepts-empty-signature"
      | "reverted"
      | "malformed"
      | null;
  };
  moduleChecks: Array<{
    kind: Erc7579ModuleKind;
    address: Address;
    hasCode: boolean;
    declaresType: Tri;
    reportedInstalled: Tri;
  }>;
  reviewedImplementation: ReviewedErc7579Implementation | null;
  findings: string[];
  riskFlags: string[];
  /** Hard invariants: this assessment never grants authority. */
  executionAllowed: false;
  canSign: false;
  canInstallModule: false;
  canGrantSession: false;
  blockers: string[];
};

export const ERC7579_EXECUTION_BLOCKERS = [
  "AUDITED_SMART_ACCOUNT_STACK_NOT_SELECTED",
  "SESSION_VALIDATOR_NOT_INSTALLED_OR_REVIEWED",
  "OWNER_SIGNED_SESSION_GRANT_MISSING",
  "ONCHAIN_SPEND_LIMIT_AND_REVOCATION_UNPROVEN",
  "CONFIDENTIAL_VENUE_UNVERIFIED",
  "PUBLIC_FALLBACK_FORBIDDEN",
] as const;

function emptyModules(): Record<Erc7579ModuleKind, Tri> {
  return {
    validator: "reverted",
    executor: "reverted",
    fallback: "reverted",
    hook: "reverted",
  };
}

/** ABI bool: exactly one 32-byte word equal to 0 or 1. Anything else is malformed. */
export function decodeStrictBool(data: Hex): boolean | "malformed" {
  if (!/^0x[0-9a-fA-F]{64}$/.test(data)) return "malformed";
  const word = BigInt(data);
  if (word === 0n) return false;
  if (word === 1n) return true;
  return "malformed";
}

function decodeBytes4(data: Hex): Hex | "malformed" {
  if (!/^0x[0-9a-fA-F]{64}$/.test(data)) return "malformed";
  if (!/^0{56}$/.test(data.slice(10))) return "malformed";
  return data.slice(0, 10).toLowerCase() as Hex;
}

/** Untrusted contract text: printable ASCII, bounded, or rejected. */
function decodeAccountId(data: Hex): string | "malformed" {
  try {
    const [value] = decodeAbiParameters([{ type: "string" }], data);
    if (
      value.length === 0 ||
      value.length > MAX_ACCOUNT_ID_LENGTH ||
      !/^[\x21-\x7e]+$/.test(value)
    )
      return "malformed";
    return value;
  } catch {
    return "malformed";
  }
}

/** ERC-7579 SHOULD format: "vendorname.accountname.semver". */
export function isWellFormedAccountId(value: string): boolean {
  return /^[^.\s]+\.[^.\s]+\.v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(
    value,
  );
}

function parseDelegation(code: Hex): Address | null {
  const lower = code.toLowerCase();
  if (
    lower.length !== 2 + 23 * 2 ||
    !lower.startsWith(EIP7702_DELEGATION_PREFIX)
  )
    return null;
  return getAddress(`0x${lower.slice(EIP7702_DELEGATION_PREFIX.length)}`);
}

function hasCode(code: Hex | undefined): code is Hex {
  return typeof code === "string" && code !== "0x" && code.length > 2;
}

function baseResult(chainId: number, account: Address): Erc7579Assessment {
  return {
    chainId,
    account,
    blockNumber: null,
    classification: "assessment-failed",
    codeKind: null,
    accountCodeHash: null,
    implementationAddress: null,
    identityCodeHash: null,
    selfReported: {
      accountId: null,
      accountIdWellFormed: false,
      modules: emptyModules(),
      executionModes: {},
      erc1271: null,
    },
    moduleChecks: [],
    reviewedImplementation: null,
    findings: [],
    riskFlags: [],
    executionAllowed: false,
    canSign: false,
    canInstallModule: false,
    canGrantSession: false,
    blockers: [...ERC7579_EXECUTION_BLOCKERS],
  };
}

/**
 * Assess one account at one pinned block. Every read uses the same block so a
 * mid-assessment upgrade or module change cannot produce a mixed snapshot.
 * Throws only for invalid input; RPC failures return `assessment-failed`.
 */
export async function assessErc7579Account(
  reader: Erc7579ChainReader,
  request: Erc7579AssessmentRequest,
  reviewed: readonly ReviewedErc7579Implementation[] = REVIEWED_ERC7579_IMPLEMENTATIONS,
): Promise<Erc7579Assessment> {
  const input = erc7579AssessmentRequestSchema.parse(request);
  const result = baseResult(input.chainId, input.account);
  const { findings, riskFlags } = result;
  try {
    const chainId = await reader.getChainId();
    if (chainId !== input.chainId) {
      findings.push("WRONG_CHAIN");
      return result;
    }
    const block = await reader.getBlockNumber();
    result.blockNumber = block.toString();

    const accountCode = await reader.getCode(input.account, block);
    if (!hasCode(accountCode)) {
      result.codeKind = "none";
      result.classification = "no-contract-code";
      findings.push("NO_CONTRACT_CODE_AT_BLOCK");
      return result;
    }
    result.accountCodeHash = keccak256(accountCode);
    result.codeKind = "contract";
    result.identityCodeHash = result.accountCodeHash;

    const delegate = parseDelegation(accountCode);
    if (delegate) {
      result.codeKind = "eip7702-delegated-eoa";
      result.implementationAddress = delegate;
      riskFlags.push("EIP7702_EOA_KEY_RETAINS_FULL_CONTROL");
      const delegateCode = await reader.getCode(delegate, block);
      if (!hasCode(delegateCode)) {
        findings.push("EIP7702_DELEGATE_HAS_NO_CODE");
        result.identityCodeHash = null;
      } else {
        result.identityCodeHash = keccak256(delegateCode);
      }
    } else {
      const slot = await reader.getStorageAt(
        input.account,
        ERC1967_IMPLEMENTATION_SLOT,
        block,
      );
      if (slot && BigInt(slot) !== 0n) {
        const implementation = getAddress(`0x${slot.slice(-40)}`);
        result.codeKind = "erc1967-proxy";
        result.implementationAddress = implementation;
        riskFlags.push("UPGRADEABLE_PROXY_IMPLEMENTATION_MAY_CHANGE");
        const implementationCode = await reader.getCode(implementation, block);
        if (!hasCode(implementationCode)) {
          findings.push("PROXY_IMPLEMENTATION_HAS_NO_CODE");
          result.identityCodeHash = null;
        } else {
          result.identityCodeHash = keccak256(implementationCode);
        }
      }
    }

    const read = async (data: Hex) => reader.call(input.account, data, block);
    const readBool = async (data: Hex): Promise<Tri> => {
      const response = await read(data);
      return response.ok ? decodeStrictBool(response.data) : "reverted";
    };

    const idResponse = await read(
      encodeFunctionData({ abi: erc7579ReadAbi, functionName: "accountId" }),
    );
    if (!idResponse.ok) {
      findings.push("ACCOUNT_ID_UNAVAILABLE");
    } else {
      const id = decodeAccountId(idResponse.data);
      if (id === "malformed") findings.push("ACCOUNT_ID_MALFORMED");
      else {
        result.selfReported.accountId = id;
        result.selfReported.accountIdWellFormed = isWellFormedAccountId(id);
        if (!result.selfReported.accountIdWellFormed)
          findings.push("ACCOUNT_ID_NOT_VENDOR_NAME_SEMVER");
      }
    }

    for (const [kind, typeId] of Object.entries(ERC7579_MODULE_TYPES) as Array<
      [Erc7579ModuleKind, bigint]
    >) {
      result.selfReported.modules[kind] = await readBool(
        encodeFunctionData({
          abi: erc7579ReadAbi,
          functionName: "supportsModule",
          args: [typeId],
        }),
      );
    }
    for (const [callType, execType] of PROBED_MODES) {
      result.selfReported.executionModes[`${callType}/${execType}`] =
        await readBool(
          encodeFunctionData({
            abi: erc7579ReadAbi,
            functionName: "supportsExecutionMode",
            args: [
              encodeExecutionMode(
                ERC7579_CALL_TYPES[callType],
                ERC7579_EXEC_TYPES[execType],
              ),
            ],
          }),
        );
    }

    const moduleAnswers = Object.values(result.selfReported.modules);
    const modeAnswers = Object.values(result.selfReported.executionModes);
    if (
      moduleAnswers.includes("malformed") ||
      modeAnswers.includes("malformed")
    )
      findings.push("CONFIG_RETURNED_NON_BOOLEAN");
    if (moduleAnswers.includes("reverted") || modeAnswers.includes("reverted"))
      findings.push("CONFIG_FUNCTION_REVERTED");

    // Negative probes: an honest account MUST answer false.
    let overclaims = false;
    for (const typeId of UNDEFINED_MODULE_TYPES) {
      const answer = await readBool(
        encodeFunctionData({
          abi: erc7579ReadAbi,
          functionName: "supportsModule",
          args: [typeId],
        }),
      );
      if (answer === true) overclaims = true;
    }
    for (const mode of UNDEFINED_MODES) {
      const answer = await readBool(
        encodeFunctionData({
          abi: erc7579ReadAbi,
          functionName: "supportsExecutionMode",
          args: [mode],
        }),
      );
      if (answer === true) overclaims = true;
    }
    if (overclaims) findings.push("CLAIMS_UNDEFINED_CAPABILITY");

    for (const kind of ["validator", "executor"] as const) {
      const phantom = await readBool(
        encodeFunctionData({
          abi: erc7579ReadAbi,
          functionName: "isModuleInstalled",
          args: [ERC7579_MODULE_TYPES[kind], PHANTOM_MODULE_ADDRESS, "0x"],
        }),
      );
      if (phantom === true) {
        findings.push("REPORTS_CODELESS_MODULE_INSTALLED");
        break;
      }
    }

    const sigResponse = await read(
      encodeFunctionData({
        abi: erc7579ReadAbi,
        functionName: "isValidSignature",
        args: [ERC1271_PROBE_DIGEST, "0x"],
      }),
    );
    if (!sigResponse.ok) {
      result.selfReported.erc1271 = "reverted";
      findings.push("ERC1271_PROBE_REVERTED");
    } else {
      const magic = decodeBytes4(sigResponse.data);
      if (magic === "malformed") {
        result.selfReported.erc1271 = "malformed";
        findings.push("ERC1271_RETURN_MALFORMED");
      } else if (magic === ERC1271_MAGIC_VALUE) {
        result.selfReported.erc1271 = "accepts-empty-signature";
        findings.push("ERC1271_ACCEPTS_EMPTY_SIGNATURE");
      } else {
        result.selfReported.erc1271 = "rejects-probe";
      }
    }

    for (const module of input.modules) {
      const typeId = ERC7579_MODULE_TYPES[module.kind];
      const moduleCode = await reader.getCode(module.address, block);
      const moduleHasCode = hasCode(moduleCode);
      const declaresType: Tri = moduleHasCode
        ? await (async () => {
            const response = await reader.call(
              module.address,
              encodeFunctionData({
                abi: erc7579ReadAbi,
                functionName: "isModuleType",
                args: [typeId],
              }),
              block,
            );
            return response.ok ? decodeStrictBool(response.data) : "reverted";
          })()
        : "reverted";
      const reportedInstalled = await readBool(
        encodeFunctionData({
          abi: erc7579ReadAbi,
          functionName: "isModuleInstalled",
          args: [typeId, module.address, module.additionalContext],
        }),
      );
      if (reportedInstalled === true && !moduleHasCode)
        findings.push("REPORTS_CODELESS_MODULE_INSTALLED");
      if (reportedInstalled === true && declaresType !== true)
        findings.push("INSTALLED_MODULE_TYPE_MISMATCH");
      result.moduleChecks.push({
        kind: module.kind,
        address: module.address,
        hasCode: moduleHasCode,
        declaresType,
        reportedInstalled,
      });
    }

    const modules = result.selfReported.modules;
    const modes = result.selfReported.executionModes;
    if (
      modes["delegatecall/revert"] === true ||
      modes["delegatecall/try"] === true
    )
      riskFlags.push("DELEGATECALL_EXECUTION_SUPPORTED");
    if (modules.executor === true)
      riskFlags.push("EXECUTOR_MODULES_CAN_BYPASS_USEROP_VALIDATION");
    if (modules.fallback === true)
      riskFlags.push("FALLBACK_HANDLERS_EXTEND_ACCOUNT_SURFACE");
    if (modules.hook !== true)
      riskFlags.push("NO_HOOK_SUPPORT_FOR_EXECUTION_POLICY");
    if (result.selfReported.accountId === null) {
      result.classification = "not-erc7579";
      return dedupe(result);
    }

    const unreliable = [
      "CONFIG_RETURNED_NON_BOOLEAN",
      "CONFIG_FUNCTION_REVERTED",
      "CLAIMS_UNDEFINED_CAPABILITY",
      "REPORTS_CODELESS_MODULE_INSTALLED",
      "INSTALLED_MODULE_TYPE_MISMATCH",
      "ERC1271_ACCEPTS_EMPTY_SIGNATURE",
      "ERC1271_PROBE_REVERTED",
      "ERC1271_RETURN_MALFORMED",
      "PROXY_IMPLEMENTATION_HAS_NO_CODE",
      "EIP7702_DELEGATE_HAS_NO_CODE",
    ];
    if (findings.some((finding) => unreliable.includes(finding))) {
      result.classification = "self-reported-unreliable";
      return dedupe(result);
    }
    if (modules.validator !== true || modes["single/revert"] !== true) {
      findings.push("MISSING_VALIDATOR_OR_SINGLE_EXECUTION");
      result.classification = "not-erc7579";
      return dedupe(result);
    }

    const match = reviewed.find(
      (entry) =>
        entry.chainId === input.chainId &&
        result.identityCodeHash !== null &&
        entry.runtimeCodeHash.toLowerCase() ===
          result.identityCodeHash.toLowerCase() &&
        entry.accountId === result.selfReported.accountId,
    );
    if (match) {
      result.reviewedImplementation = match;
      result.classification = "reviewed-implementation";
    } else {
      result.classification = "self-reported-erc7579";
      findings.push("IMPLEMENTATION_NOT_IN_REVIEWED_REGISTRY");
    }
    return dedupe(result);
  } catch {
    findings.push("RPC_READ_FAILED");
    result.classification = "assessment-failed";
    return dedupe(result);
  }
}

function dedupe(result: Erc7579Assessment): Erc7579Assessment {
  result.findings = [...new Set(result.findings)];
  result.riskFlags = [...new Set(result.riskFlags)];
  return result;
}

/** Adapt a viem PublicClient-like object; still no signer is accepted. */
export function erc7579ReaderFromClient(client: {
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getCode(args: {
    address: Address;
    blockNumber: bigint;
  }): Promise<Hex | undefined>;
  getStorageAt(args: {
    address: Address;
    slot: Hex;
    blockNumber: bigint;
  }): Promise<Hex | undefined>;
  call(args: { to: Address; data: Hex; blockNumber: bigint }): Promise<{
    data?: Hex;
  }>;
}): Erc7579ChainReader {
  return {
    getChainId: () => client.getChainId(),
    getBlockNumber: () => client.getBlockNumber(),
    getCode: (address, blockNumber) => client.getCode({ address, blockNumber }),
    getStorageAt: (address, slot, blockNumber) =>
      client.getStorageAt({ address, slot, blockNumber }),
    call: async (to, data, blockNumber) => {
      try {
        const response = await client.call({ to, data, blockNumber });
        return { ok: true, data: response.data ?? "0x" };
      } catch (error) {
        // Distinguish contract reverts from transport failure: transport
        // failures must abort the assessment rather than look like "false".
        if (isExecutionRevert(error)) return { ok: false };
        throw error;
      }
    },
  };
}

function isExecutionRevert(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    const candidate = current as {
      name?: string;
      code?: number;
      cause?: unknown;
    };
    if (
      candidate.name === "CallExecutionError" ||
      candidate.name === "ContractFunctionRevertedError" ||
      candidate.name === "ExecutionRevertedError" ||
      candidate.code === 3
    ) {
      if (candidate.name === "CallExecutionError") {
        current = candidate.cause;
        if (!current) return false;
        continue;
      }
      return true;
    }
    current = candidate.cause;
  }
  return false;
}
