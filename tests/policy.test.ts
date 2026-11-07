import { describe, it, expect } from "vitest";
import {
  evaluateTransfer,
  exactUnits,
  transferSchema,
  type PolicySnapshot,
  type TransferIntent,
} from "../packages/shared/src";
import { ProposalSession } from "../packages/sdk/src";
const vault = "0x0000000000000000000000000000000000000001";
const agent = "0x0000000000000000000000000000000000000002";
const token = "0x0000000000000000000000000000000000000003";
const recipient = "0x0000000000000000000000000000000000000004";
const intent: TransferIntent = {
  kind: "erc20-transfer",
  chainId: 31337,
  vault,
  agent,
  token,
  recipient,
  amount: "100",
  nonce: "0",
  deadline: 1000100,
};
const snapshot: PolicySnapshot = {
  chainId: 31337,
  vault,
  agent,
  token,
  paused: false,
  nonce: 0n,
  balance: 1000n,
  timestamp: 1000000n,
  blockNumber: 1n,
  permission: {
    recipient,
    perOperation: 100n,
    dailyLimit: 200n,
    spent: 100n,
    day: 11n,
    expiresAt: 1001000n,
    active: true,
  },
};
describe("policy boundary", () => {
  it("allows a scoped transfer and rejects excess", () => {
    expect(evaluateTransfer(intent, snapshot).allowed).toBe(true);
    expect(
      evaluateTransfer({ ...intent, amount: "101" }, snapshot).reasons,
    ).toContain("SPENDING_LIMIT");
  });
  it.each([
    "paused",
    "expired",
    "revoked",
    "nonce",
    "chain",
    "recipient",
    "daily",
    "deadline",
    "balance",
    "scope",
  ])("denies %s", (kind) => {
    const s = structuredClone(snapshot);
    const i = { ...intent };
    if (kind === "paused") s.paused = true;
    if (kind === "expired") s.permission.expiresAt = s.timestamp;
    if (kind === "revoked") s.permission.active = false;
    if (kind === "nonce") i.nonce = "1";
    if (kind === "chain") s.chainId = 1;
    if (kind === "recipient") i.recipient = token;
    if (kind === "daily") s.permission.spent = 200n;
    if (kind === "deadline") i.deadline = 1000000;
    if (kind === "balance") s.balance = 1n;
    if (kind === "scope") i.vault = token;
    expect(evaluateTransfer(i, s).allowed).toBe(false);
  });
  it("resets UTC budget without floating point amounts", () => {
    expect(exactUnits("1.000001", 6)).toBe(1000001n);
    expect(() => exactUnits("0.0000001", 6)).toThrow();
    expect(() => exactUnits("1e6", 6)).toThrow();
    expect(
      evaluateTransfer(intent, {
        ...snapshot,
        permission: { ...snapshot.permission, day: 10n, spent: 200n },
      }).allowed,
    ).toBe(true);
  });
  it("rejects arbitrary calls and mainnet", () => {
    expect(() => transferSchema.parse({ ...intent, chainId: 1 })).toThrow();
    expect(() => transferSchema.parse({ ...intent, data: "0x" })).toThrow();
    expect(() => transferSchema.parse({ ...intent, amount: "0" })).toThrow();
  });
  it("proposes once, detects conflicting retries, and never executes", async () => {
    const session = new ProposalSession({
      simulate: async () => ({ allowed: true, reasons: [] }),
    });
    const p = await session.propose(intent, "id");
    expect(await session.propose(intent, "id")).toEqual(p);
    expect(p.status).toBe("simulated");
    await expect(
      session.propose({ ...intent, amount: "1" }, "id"),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  });
  it("denied proposals are not stored", async () => {
    const session = new ProposalSession({
      simulate: async () => ({ allowed: false, reasons: ["SPENDING_LIMIT"] }),
    });
    await expect(session.propose(intent, "id")).rejects.toThrow(
      "POLICY_DENIED",
    );
    expect(session.get("id")).toBe(null);
  });
});
