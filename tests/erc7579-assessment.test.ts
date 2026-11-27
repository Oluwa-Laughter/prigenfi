import { describe, expect, it } from "vitest";
import {
  type Address,
  type Hex,
  decodeFunctionData,
  encodeAbiParameters,
  getAddress,
  keccak256,
  toFunctionSelector,
} from "viem";
import {
  ERC1967_IMPLEMENTATION_SLOT,
  ERC7579_EXECUTION_BLOCKERS,
  ERC7579_SELECTORS,
  PHANTOM_MODULE_ADDRESS,
  REVIEWED_ERC7579_IMPLEMENTATIONS,
  assessErc7579Account,
  decodeStrictBool,
  encodeExecutionMode,
  erc7579AssessmentRequestSchema,
  erc7579ReadAbi,
  isWellFormedAccountId,
  type Erc7579Assessment,
  type Erc7579ChainReader,
} from "../packages/shared/src/erc7579-assessment";

const ACCOUNT = getAddress("0x1000000000000000000000000000000000000001");
const VALIDATOR = getAddress("0x2000000000000000000000000000000000000002");
const IMPLEMENTATION = getAddress("0x3000000000000000000000000000000000000003");
const ACCOUNT_CODE: Hex = "0x6080604052";
const MODULE_CODE: Hex = "0x60016001";
const BLOCK = 42n;
const bool = (value: boolean) =>
  encodeAbiParameters([{ type: "bool" }], [value]);

type Behaviour = {
  accountId?: string | "revert" | Hex;
  supportsModule?: (typeId: bigint) => boolean | "revert" | Hex;
  supportsMode?: (mode: Hex) => boolean | "revert";
  installed?: (typeId: bigint, module: Address) => boolean;
  signature?: Hex | "revert";
};

/** OpenZeppelin AccountERC7579-like honest behaviour. */
const honest: Required<Behaviour> = {
  accountId: "@openzeppelin/contracts.AccountERC7579.v1.0.0",
  supportsModule: (typeId) => typeId >= 1n && typeId <= 3n,
  supportsMode: (mode) =>
    ["00", "01", "ff"].includes(mode.slice(2, 4)) &&
    ["00", "01"].includes(mode.slice(4, 6)),
  installed: (typeId, module) => typeId === 1n && module === VALIDATOR,
  signature: `0xffffffff${"0".repeat(56)}`,
};

function fakeReader(
  overrides: Behaviour = {},
  options: {
    chainId?: number;
    accountCode?: Hex;
    implementationSlot?: Hex;
    extraCode?: Record<string, Hex>;
    blocks?: bigint[];
    failCalls?: boolean;
  } = {},
): Erc7579ChainReader {
  const b = { ...honest, ...overrides };
  const code: Record<string, Hex> = {
    [ACCOUNT.toLowerCase()]: options.accountCode ?? ACCOUNT_CODE,
    [VALIDATOR.toLowerCase()]: MODULE_CODE,
    ...Object.fromEntries(
      Object.entries(options.extraCode ?? {}).map(([k, v]) => [
        k.toLowerCase(),
        v,
      ]),
    ),
  };
  const seen = options.blocks;
  const pin = (block: bigint) => {
    seen?.push(block);
  };
  return {
    getChainId: async () => options.chainId ?? 31337,
    getBlockNumber: async () => BLOCK,
    getCode: async (address, block) => {
      pin(block);
      return code[address.toLowerCase()];
    },
    getStorageAt: async (_address, slot, block) => {
      pin(block);
      expect(slot).toBe(ERC1967_IMPLEMENTATION_SLOT);
      return options.implementationSlot ?? `0x${"0".repeat(64)}`;
    },
    call: async (to, data, block) => {
      pin(block);
      if (options.failCalls) throw new Error("transport down");
      if (to === VALIDATOR) {
        const { functionName, args } = decodeFunctionData({
          abi: erc7579ReadAbi,
          data,
        });
        if (functionName !== "isModuleType") return { ok: false };
        return { ok: true, data: bool((args as [bigint])[0] === 1n) };
      }
      if (to !== ACCOUNT) return { ok: false };
      const { functionName, args } = decodeFunctionData({
        abi: erc7579ReadAbi,
        data,
      });
      switch (functionName) {
        case "accountId":
          if (b.accountId === "revert") return { ok: false };
          if (b.accountId.startsWith("0x"))
            return { ok: true, data: b.accountId as Hex };
          return {
            ok: true,
            data: encodeAbiParameters([{ type: "string" }], [b.accountId]),
          };
        case "supportsModule": {
          const answer = b.supportsModule((args as [bigint])[0]);
          if (answer === "revert") return { ok: false };
          return {
            ok: true,
            data: typeof answer === "boolean" ? bool(answer) : answer,
          };
        }
        case "supportsExecutionMode": {
          const answer = b.supportsMode((args as [Hex])[0]);
          return answer === "revert"
            ? { ok: false }
            : { ok: true, data: bool(answer) };
        }
        case "isModuleInstalled": {
          const [typeId, module] = args as readonly [bigint, Address, Hex];
          return {
            ok: true,
            data: bool(b.installed(typeId, getAddress(module))),
          };
        }
        case "isValidSignature":
          return b.signature === "revert"
            ? { ok: false }
            : { ok: true, data: b.signature };
        default:
          return { ok: false };
      }
    },
  };
}

function expectNoAuthority(result: Erc7579Assessment) {
  expect(result.executionAllowed).toBe(false);
  expect(result.canSign).toBe(false);
  expect(result.canInstallModule).toBe(false);
  expect(result.canGrantSession).toBe(false);
  expect(result.blockers).toEqual([...ERC7579_EXECUTION_BLOCKERS]);
}

describe("ERC-7579 canonical constants", () => {
  it("matches viem-computed selectors for the spec signatures", () => {
    const signatures: Record<keyof typeof ERC7579_SELECTORS, string> = {
      accountId: "accountId()",
      supportsExecutionMode: "supportsExecutionMode(bytes32)",
      supportsModule: "supportsModule(uint256)",
      isModuleInstalled: "isModuleInstalled(uint256,address,bytes)",
      installModule: "installModule(uint256,address,bytes)",
      uninstallModule: "uninstallModule(uint256,address,bytes)",
      execute: "execute(bytes32,bytes)",
      executeFromExecutor: "executeFromExecutor(bytes32,bytes)",
      isModuleType: "isModuleType(uint256)",
      isValidSignature: "isValidSignature(bytes32,bytes)",
    };
    for (const [key, signature] of Object.entries(signatures))
      expect(toFunctionSelector(`function ${signature}`)).toBe(
        ERC7579_SELECTORS[key as keyof typeof ERC7579_SELECTORS],
      );
  });

  it("encodes callType/execType in the first two mode bytes", () => {
    expect(encodeExecutionMode(0xff, 0x01)).toBe(`0xff01${"0".repeat(60)}`);
    expect(encodeExecutionMode(0, 0)).toBe(`0x${"0".repeat(64)}`);
    expect(() => encodeExecutionMode(256, 0)).toThrow("INVALID_MODE_BYTE");
    expect(() => encodeExecutionMode(-1, 0)).toThrow("INVALID_MODE_BYTE");
  });

  it("decodes ABI bools strictly", () => {
    expect(decodeStrictBool(bool(true))).toBe(true);
    expect(decodeStrictBool(bool(false))).toBe(false);
    expect(decodeStrictBool(`0x${"0".repeat(63)}2`)).toBe("malformed");
    expect(decodeStrictBool("0x01")).toBe("malformed");
    expect(decodeStrictBool("0x")).toBe("malformed");
  });

  it("checks vendor.account.semver account identifiers", () => {
    expect(
      isWellFormedAccountId("@openzeppelin/contracts.AccountERC7579.v1.0.0"),
    ).toBe(true);
    expect(isWellFormedAccountId("biconomy.nexus.1.2.0")).toBe(true);
    expect(isWellFormedAccountId("just-a-name")).toBe(false);
    expect(isWellFormedAccountId("vendor.account")).toBe(false);
  });

  it("keeps the reviewed implementation registry empty by decision", () => {
    expect(REVIEWED_ERC7579_IMPLEMENTATIONS).toEqual([]);
  });
});

describe("ERC-7579 request validation", () => {
  it.each([
    [{ chainId: 1, account: ACCOUNT }, "mainnet is not an assessment chain"],
    [{ chainId: 8453, account: ACCOUNT }, "unlisted chain"],
    [{ chainId: 31337, account: "0x1234" }, "bad address"],
    [
      { chainId: 31337, account: ACCOUNT, signer: ACCOUNT },
      "unknown signer field",
    ],
    [{ chainId: 31337, account: ACCOUNT, privateKey: "0x01" }, "secret field"],
    [
      {
        chainId: 31337,
        account: ACCOUNT,
        modules: [{ kind: "policy", address: VALIDATOR }],
      },
      "unknown module kind",
    ],
    [
      {
        chainId: 31337,
        account: ACCOUNT,
        modules: Array.from({ length: 9 }, () => ({
          kind: "validator",
          address: VALIDATOR,
        })),
      },
      "too many module checks",
    ],
    [
      {
        chainId: 31337,
        account: ACCOUNT,
        modules: [
          { kind: "fallback", address: VALIDATOR, additionalContext: "0xzz" },
        ],
      },
      "non-hex context",
    ],
  ])("rejects %j (%s)", (request: unknown, _reason: string) => {
    expect(erc7579AssessmentRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });
});

describe("assessErc7579Account", () => {
  it("reports an honest account as self-reported, never verified or executable", async () => {
    const blocks: bigint[] = [];
    const result = await assessErc7579Account(fakeReader({}, { blocks }), {
      chainId: 31337,
      account: ACCOUNT,
      modules: [{ kind: "validator", address: VALIDATOR }],
    });
    expect(result.classification).toBe("self-reported-erc7579");
    expect(result.findings).toContain(
      "IMPLEMENTATION_NOT_IN_REVIEWED_REGISTRY",
    );
    expect(result.selfReported.modules).toEqual({
      validator: true,
      executor: true,
      fallback: true,
      hook: false,
    });
    expect(result.selfReported.executionModes["staticcall/revert"]).toBe(false);
    expect(result.selfReported.erc1271).toBe("rejects-probe");
    expect(result.riskFlags).toEqual(
      expect.arrayContaining([
        "DELEGATECALL_EXECUTION_SUPPORTED",
        "EXECUTOR_MODULES_CAN_BYPASS_USEROP_VALIDATION",
        "NO_HOOK_SUPPORT_FOR_EXECUTION_POLICY",
      ]),
    );
    expect(result.moduleChecks).toEqual([
      {
        kind: "validator",
        address: VALIDATOR,
        hasCode: true,
        declaresType: true,
        reportedInstalled: true,
      },
    ]);
    expect(result.blockNumber).toBe("42");
    expect(new Set(blocks)).toEqual(new Set([BLOCK]));
    expectNoAuthority(result);
  });

  it("labels a reviewed implementation only on exact chain, code hash and id match, still without authority", async () => {
    const entry = {
      chainId: 31337,
      runtimeCodeHash: keccak256(ACCOUNT_CODE),
      accountId: honest.accountId,
      sourceReference: "test-only",
      reviewReference: "test-only",
    };
    const reviewed = await assessErc7579Account(
      fakeReader(),
      { chainId: 31337, account: ACCOUNT },
      [entry],
    );
    expect(reviewed.classification).toBe("reviewed-implementation");
    expectNoAuthority(reviewed);

    const wrongId = await assessErc7579Account(
      fakeReader({ accountId: "impostor.account.1.0.0" }),
      { chainId: 31337, account: ACCOUNT },
      [entry],
    );
    expect(wrongId.classification).toBe("self-reported-erc7579");
    const wrongChain = await assessErc7579Account(
      fakeReader({}, { chainId: 11155111 }),
      { chainId: 11155111, account: ACCOUNT },
      [entry],
    );
    expect(wrongChain.classification).toBe("self-reported-erc7579");
  });

  it("treats a codeless address (EOA or undeployed account) as no contract code", async () => {
    const result = await assessErc7579Account(
      fakeReader({}, { accountCode: "0x" }),
      {
        chainId: 31337,
        account: ACCOUNT,
      },
    );
    expect(result.classification).toBe("no-contract-code");
    expectNoAuthority(result);
  });

  it("fails closed on a chain mismatch before any account read", async () => {
    const blocks: bigint[] = [];
    const result = await assessErc7579Account(
      fakeReader({}, { chainId: 1, blocks }),
      {
        chainId: 31337,
        account: ACCOUNT,
      },
    );
    expect(result.classification).toBe("assessment-failed");
    expect(result.findings).toEqual(["WRONG_CHAIN"]);
    expect(blocks).toEqual([]);
  });

  it("fails closed when RPC transport fails rather than reading 'false'", async () => {
    const result = await assessErc7579Account(
      fakeReader({}, { failCalls: true }),
      {
        chainId: 31337,
        account: ACCOUNT,
      },
    );
    expect(result.classification).toBe("assessment-failed");
    expect(result.findings).toContain("RPC_READ_FAILED");
    expectNoAuthority(result);
  });

  it("classifies a contract without accountId as not ERC-7579", async () => {
    const result = await assessErc7579Account(
      fakeReader({
        accountId: "revert",
        supportsModule: () => "revert",
        supportsMode: () => "revert",
      }),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.classification).toBe("not-erc7579");
    expect(result.findings).toContain("ACCOUNT_ID_UNAVAILABLE");
  });

  it("flags an account that claims undefined module types and modes", async () => {
    const result = await assessErc7579Account(
      fakeReader({ supportsModule: () => true, supportsMode: () => true }),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.classification).toBe("self-reported-unreliable");
    expect(result.findings).toContain("CLAIMS_UNDEFINED_CAPABILITY");
    expectNoAuthority(result);
  });

  it("flags an account that reports a codeless phantom module as installed", async () => {
    const result = await assessErc7579Account(
      fakeReader({
        installed: (_typeId, module) => module === PHANTOM_MODULE_ADDRESS,
      }),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.classification).toBe("self-reported-unreliable");
    expect(result.findings).toContain("REPORTS_CODELESS_MODULE_INSTALLED");
  });

  it("flags an installed module whose isModuleType disagrees", async () => {
    const result = await assessErc7579Account(
      fakeReader({ installed: () => false }),
      {
        chainId: 31337,
        account: ACCOUNT,
        modules: [{ kind: "executor", address: VALIDATOR }],
      },
    );
    expect(result.moduleChecks[0]?.reportedInstalled).toBe(false);
    const mismatch = await assessErc7579Account(
      fakeReader({
        installed: (typeId, module) => typeId === 2n && module === VALIDATOR,
      }),
      {
        chainId: 31337,
        account: ACCOUNT,
        modules: [{ kind: "executor", address: VALIDATOR }],
      },
    );
    expect(mismatch.findings).toContain("INSTALLED_MODULE_TYPE_MISMATCH");
    expect(mismatch.classification).toBe("self-reported-unreliable");
  });

  it("flags ERC-1271 acceptance of an empty signature as critical", async () => {
    const result = await assessErc7579Account(
      fakeReader({ signature: `0x1626ba7e${"0".repeat(56)}` }),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.selfReported.erc1271).toBe("accepts-empty-signature");
    expect(result.classification).toBe("self-reported-unreliable");
  });

  it.each([
    [
      "non-boolean supportsModule",
      { supportsModule: () => `0x${"0".repeat(63)}2` as Hex },
      "CONFIG_RETURNED_NON_BOOLEAN",
    ],
    [
      "reverting supportsExecutionMode",
      { supportsMode: () => "revert" as const },
      "CONFIG_FUNCTION_REVERTED",
    ],
    [
      "reverting ERC-1271",
      { signature: "revert" as const },
      "ERC1271_PROBE_REVERTED",
    ],
    [
      "dirty bytes4 padding",
      { signature: `0xffffffff${"0".repeat(55)}1` as Hex },
      "ERC1271_RETURN_MALFORMED",
    ],
  ])("flags %s as unreliable", async (_label, behaviour, finding) => {
    const result = await assessErc7579Account(
      fakeReader(behaviour as Behaviour),
      {
        chainId: 31337,
        account: ACCOUNT,
      },
    );
    expect(result.findings).toContain(finding);
    expect(result.classification).toBe("self-reported-unreliable");
    expectNoAuthority(result);
  });

  it("rejects non-printable or oversized account identifiers", async () => {
    for (const accountId of ["evil\u0000id.x.1.0.0", "a".repeat(129), ""]) {
      const result = await assessErc7579Account(fakeReader({ accountId }), {
        chainId: 31337,
        account: ACCOUNT,
      });
      expect(result.selfReported.accountId).toBeNull();
      expect(result.findings).toContain("ACCOUNT_ID_MALFORMED");
      expect(result.classification).toBe("not-erc7579");
    }
    const garbage = await assessErc7579Account(
      fakeReader({ accountId: "0xdeadbeef" }),
      {
        chainId: 31337,
        account: ACCOUNT,
      },
    );
    expect(garbage.findings).toContain("ACCOUNT_ID_MALFORMED");
  });

  it("uses the ERC-1967 implementation code as identity and flags upgradeability", async () => {
    const implementationCode: Hex = "0x6000600060006000";
    const result = await assessErc7579Account(
      fakeReader(
        {},
        {
          implementationSlot: `0x${"0".repeat(24)}${IMPLEMENTATION.slice(2).toLowerCase()}`,
          extraCode: { [IMPLEMENTATION]: implementationCode },
        },
      ),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.codeKind).toBe("erc1967-proxy");
    expect(result.implementationAddress).toBe(IMPLEMENTATION);
    expect(result.identityCodeHash).toBe(keccak256(implementationCode));
    expect(result.riskFlags).toContain(
      "UPGRADEABLE_PROXY_IMPLEMENTATION_MAY_CHANGE",
    );
  });

  it("marks a proxy pointing at a codeless implementation unreliable", async () => {
    const result = await assessErc7579Account(
      fakeReader(
        {},
        {
          implementationSlot: `0x${"0".repeat(24)}${IMPLEMENTATION.slice(2).toLowerCase()}`,
        },
      ),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.findings).toContain("PROXY_IMPLEMENTATION_HAS_NO_CODE");
    expect(result.classification).toBe("self-reported-unreliable");
  });

  it("detects EIP-7702 delegated EOAs and the retained EOA key risk", async () => {
    const delegation =
      `0xef0100${IMPLEMENTATION.slice(2).toLowerCase()}` as Hex;
    const result = await assessErc7579Account(
      fakeReader(
        {},
        {
          accountCode: delegation,
          extraCode: { [IMPLEMENTATION]: "0x60016002" },
        },
      ),
      { chainId: 31337, account: ACCOUNT },
    );
    expect(result.codeKind).toBe("eip7702-delegated-eoa");
    expect(result.implementationAddress).toBe(IMPLEMENTATION);
    expect(result.identityCodeHash).toBe(keccak256("0x60016002"));
    expect(result.riskFlags).toContain("EIP7702_EOA_KEY_RETAINS_FULL_CONTROL");
    expectNoAuthority(result);
  });

  it("never grants authority for any classification", async () => {
    const scenarios: Array<Parameters<typeof fakeReader>> = [
      [{}],
      [
        {
          supportsModule: () => true,
          supportsMode: () => true,
          installed: () => true,
        },
      ],
      [{ accountId: "revert" }],
      [{}, { accountCode: "0x" }],
      [{}, { chainId: 5 }],
      [{}, { failCalls: true }],
    ];
    for (const args of scenarios)
      expectNoAuthority(
        await assessErc7579Account(fakeReader(...args), {
          chainId: 31337,
          account: ACCOUNT,
        }),
      );
  });
});
