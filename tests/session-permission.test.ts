import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import {
  FORBIDDEN_SESSION_SELECTORS,
  SESSION_MAX_CALLS,
  SESSION_MAX_DURATION_SECONDS,
  SESSION_PREVIEW_BLOCKERS,
  previewSessionPermission,
  sessionPermissionRequestSchema,
  type SessionPermissionRequest,
} from "../packages/shared/src/session-permission";

const source = readFileSync(
  "contracts/src/accounts/SessionCallExecutor.sol",
  "utf8",
);
const NOW = 1_800_000_000;
const ACCOUNT = getAddress("0x1000000000000000000000000000000000000001");
const EXECUTOR = getAddress("0x2000000000000000000000000000000000000002");
const AGENT = getAddress("0x3000000000000000000000000000000000000003");
const TARGET = getAddress("0x4000000000000000000000000000000000000004");
const base: SessionPermissionRequest = {
  chainId: 31337,
  account: ACCOUNT,
  executor: EXECUTOR,
  agent: AGENT,
  target: TARGET,
  selector: "0x1234abcd",
  validAfter: NOW,
  validUntil: NOW + 3600,
  maxCalls: 3,
};
const preview = (overrides: Partial<SessionPermissionRequest> = {}) =>
  previewSessionPermission({ ...base, ...overrides }, NOW);

describe("parity with SessionCallExecutor.sol source", () => {
  it("forbids exactly the selectors the contract forbids", () => {
    const body = source.slice(
      source.indexOf("function isForbiddenSelector"),
      source.indexOf(
        "// ------",
        source.indexOf("function isForbiddenSelector"),
      ),
    );
    const fromSolidity = new Set(
      [...body.matchAll(/selector == (0x[0-9a-f]{8})/g)].map((m) => m[1]),
    );
    expect(body).toContain("selector == bytes4(0)");
    fromSolidity.add("0x00000000");
    expect(new Set(Object.keys(FORBIDDEN_SESSION_SELECTORS))).toEqual(
      fromSolidity,
    );
  });

  it("uses the contract's duration and call limits", () => {
    expect(source).toMatch(/MAX_SESSION_DURATION = 7 days;/);
    expect(SESSION_MAX_DURATION_SECONDS).toBe(7 * 86_400);
    expect(source).toMatch(
      new RegExp(`MAX_SESSION_CALLS = ${SESSION_MAX_CALLS};`),
    );
  });
});

describe("previewSessionPermission", () => {
  it("summarizes a well-formed grant without granting anything", () => {
    const result = preview({ purpose: "Rebalance research test" });
    expect(result.status).toBe("reviewable");
    expect(result.rejections).toEqual([]);
    expect(result.summary[0]).toBe(
      "Purpose (your note): Rebalance research test",
    );
    expect(result.summary.join(" ")).toContain("at most 3 calls");
    expect(result.summary.join(" ")).toContain("does not limit amounts");
    expect(result.onchainChecksRemaining).toEqual([
      "TARGET_HAS_CODE",
      "EXECUTOR_INSTALLED",
    ]);
    expect(result.blockers).toEqual([...SESSION_PREVIEW_BLOCKERS]);
    expect(result).toMatchObject({
      executionAllowed: false,
      canSign: false,
      canInstallModule: false,
      canGrantSession: false,
    });
  });

  it.each([
    [{ agent: "0x0000000000000000000000000000000000000000" }, "INVALID_AGENT"],
    [{ agent: ACCOUNT }, "INVALID_AGENT"],
    [{ agent: EXECUTOR }, "INVALID_AGENT"],
    [{ target: ACCOUNT }, "INVALID_TARGET"],
    [{ target: EXECUTOR }, "INVALID_TARGET"],
    [{ target: AGENT }, "INVALID_TARGET"],
    [{ selector: "0x095EA7B3" }, "FORBIDDEN_SELECTOR"],
    [{ selector: "0x2fb74e62" }, "FORBIDDEN_SELECTOR"],
    [{ selector: "0x00000000" }, "FORBIDDEN_SELECTOR"],
    [{ validUntil: NOW }, "INVALID_WINDOW"],
    [{ validAfter: NOW + 10, validUntil: NOW + 10 }, "INVALID_WINDOW"],
    [{ validAfter: 0, validUntil: NOW + 3600 }, "INVALID_WINDOW"],
    [{ validUntil: NOW + SESSION_MAX_DURATION_SECONDS + 1 }, "INVALID_WINDOW"],
    [
      {
        validAfter: NOW + SESSION_MAX_DURATION_SECONDS,
        validUntil: NOW + SESSION_MAX_DURATION_SECONDS + 1,
      },
      "INVALID_WINDOW",
    ],
    [{ maxCalls: 0 }, "INVALID_CALL_LIMIT"],
    [{ maxCalls: SESSION_MAX_CALLS + 1 }, "INVALID_CALL_LIMIT"],
  ] as const)("rejects %j as %s", (overrides, reason) => {
    const result = preview(overrides as Partial<SessionPermissionRequest>);
    expect(result.status).toBe("would-be-rejected");
    expect(result.rejections).toContain(reason);
    expect(result.canGrantSession).toBe(false);
  });

  it("accepts the exact boundaries the contract accepts", () => {
    expect(
      preview({ validUntil: NOW + SESSION_MAX_DURATION_SECONDS }).status,
    ).toBe("reviewable");
    expect(preview({ maxCalls: SESSION_MAX_CALLS }).status).toBe("reviewable");
    expect(preview({ maxCalls: 1 }).summary.join(" ")).toContain(
      "at most 1 call,",
    );
    expect(
      preview({ validAfter: NOW + 60, validUntil: NOW + 3660 }).summary[2],
    ).toMatch(/^Starts in about/);
  });

  it("labels forbidden selectors for the owner", () => {
    expect(preview({ selector: "0xd4febb96" }).forbiddenSelectorLabel).toBe(
      "ERC-7984 setOperator",
    );
  });

  it.each([
    [{ chainId: 1 }],
    [{ chainId: 8453 }],
    [{ selector: "0x1234" }],
    [{ account: "0xnot" }],
    [{ maxCalls: -1 }],
    [{ maxCalls: 1.5 }],
    [{ validUntil: 2 ** 48 }],
    [{ purpose: "x".repeat(81) }],
    [{ purpose: "line\nbreak" }],
    [{ calldata: "0xdeadbeef" }],
    [{ amount: "100" }],
    [{ privateKey: "0x01" }],
    [{ signature: "0x01" }],
  ])("rejects malformed or out-of-scope input %j", (overrides) => {
    expect(
      sessionPermissionRequestSchema.safeParse({ ...base, ...overrides })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid evaluation time", () => {
    expect(() => previewSessionPermission(base, -1)).toThrow(
      "INVALID_EVALUATION_TIME",
    );
    expect(() => previewSessionPermission(base, 1.5)).toThrow(
      "INVALID_EVALUATION_TIME",
    );
  });
});
