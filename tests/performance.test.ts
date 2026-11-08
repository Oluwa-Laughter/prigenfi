import { describe, expect, it } from "vitest";
import {
  summarizePerformance,
  type VerifiedClosedTrade,
} from "../apps/web/src/lib/performance";
const hash = "0x" + "1".repeat(64);
const closed = (id: string, pnl: number): VerifiedClosedTrade => ({
  settlementId: id,
  agentId: "test-agent",
  strategy: id === "win1" ? "meme" : "spot",
  transactionHash: hash,
  closedAt: "2026-11-08T00:00:00Z",
  realizedPnlUsd: pnl,
  finality: "finalized",
});
describe("reconciled agent analytics", () => {
  it("calculates win rate from finalized outcomes excluding flat closes", () => {
    const d = summarizePerformance([
      closed("win1", 40),
      closed("win2", 20),
      closed("loss", -10),
      closed("flat", 0),
    ]);
    expect(d.closed).toBe(4);
    expect(d.wins).toBe(2);
    expect(d.losses).toBe(1);
    expect(d.flat).toBe(1);
    expect(d.winRate).toBeCloseTo(66.66666, 3);
    expect(d.realizedPnlUsd).toBe(50);
  });
  it("never fabricates win rate without verified settlement inputs", () => {
    expect(summarizePerformance([])).toMatchObject({
      closed: 0,
      winRate: null,
      realizedPnlUsd: 0,
    });
    const bad = { ...closed("pending", 5000), finality: "pending" as const };
    expect(
      summarizePerformance([bad, closed("ok", 10), closed("ok", 10)]),
    ).toMatchObject({ closed: 1, wins: 1 });
    expect(
      summarizePerformance([
        { ...closed("invalid", 10), transactionHash: "0xdeadcafe" },
      ]).closed,
    ).toBe(0);
  });
});
