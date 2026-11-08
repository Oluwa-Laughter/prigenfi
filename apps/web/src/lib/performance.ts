/**
 * Analytics inputs must originate from a reconciled, independently verified
 * trade execution/position journal. ERC-20 transfers and MCP proposals are NOT trades.
 */
export type VerifiedClosedTrade = {
  settlementId: string;
  agentId: string;
  strategy: string;
  transactionHash: string;
  closedAt: string;
  realizedPnlUsd: number;
  finality: "finalized" | "pending";
};

export type AgentPerformance = {
  closed: number;
  wins: number;
  losses: number;
  flat: number;
  winRate: number | null;
  realizedPnlUsd: number;
  strategies: { name: string; pnl: number; closed: number }[];
};

export function summarizePerformance(
  trades: readonly VerifiedClosedTrade[],
): AgentPerformance {
  const seen = new Set<string>();
  const settled = trades.filter((t) => {
    if (
      t.finality !== "finalized" ||
      !/^0x[0-9a-fA-F]{64}$/.test(t.transactionHash) ||
      !t.settlementId.trim() ||
      !t.strategy.trim() ||
      !t.agentId.trim() ||
      !Number.isFinite(t.realizedPnlUsd) ||
      !Number.isFinite(Date.parse(t.closedAt)) ||
      seen.has(t.settlementId)
    )
      return false;
    seen.add(t.settlementId);
    return true;
  });
  const wins = settled.filter((t) => t.realizedPnlUsd > 0).length;
  const losses = settled.filter((t) => t.realizedPnlUsd < 0).length;
  const flat = settled.length - wins - losses;
  const groups = new Map<
    string,
    { name: string; pnl: number; closed: number }
  >();
  for (const trade of settled) {
    const group = groups.get(trade.strategy) ?? {
      name: trade.strategy,
      pnl: 0,
      closed: 0,
    };
    group.pnl += trade.realizedPnlUsd;
    group.closed += 1;
    groups.set(trade.strategy, group);
  }
  return {
    closed: settled.length,
    wins,
    losses,
    flat,
    winRate: wins + losses === 0 ? null : (100 * wins) / (wins + losses),
    realizedPnlUsd: settled.reduce((sum, t) => sum + t.realizedPnlUsd, 0),
    strategies: Array.from(groups.values()).sort((a, b) => b.closed - a.closed),
  };
}
