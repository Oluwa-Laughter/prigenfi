"use client";
import Link from "next/link";
import { Activity, ArrowUpRight, PieChart as PieIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  summarizePerformance,
  type VerifiedClosedTrade,
} from "@/lib/performance";
import { usd } from "@/lib/markets";

export function AgentPerformanceCharts({
  trades,
}: {
  trades: readonly VerifiedClosedTrade[];
}) {
  const data = summarizePerformance(trades);
  const outcomes = [
    { name: "Wins", value: data.wins },
    { name: "Losses", value: data.losses },
    { name: "Flat", value: data.flat },
  ].filter((v) => v.value > 0);
  return (
    <section className="agent-results">
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Verified trading results</p>
          <h2>Agent performance</h2>
          <p>
            Actual closed positions only. Public transfers and simulated orders
            do not count as trades.
          </p>
        </div>
        <Link href="/activity" className="ws-text-link">
          Check activity <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="agent-results-stats">
        <span>
          <strong>{data.closed ? data.closed : "—"}</strong>
          <small>Verified closes</small>
        </span>
        <span>
          <strong>
            {data.winRate === null ? "—" : data.winRate.toFixed(1) + "%"}
          </strong>
          <small>Win rate (excluding flat closes)</small>
        </span>
        <span>
          <strong>
            {data.closed
              ? usd(data.realizedPnlUsd, { maximumFractionDigits: 2 })
              : "—"}
          </strong>
          <small>Realized net P&amp;L</small>
        </span>
      </div>
      {data.closed === 0 ? (
        <div className="agent-results-empty">
          <div className="performance-placeholder">
            <PieIcon size={38} />
            <span>No verified trading history</span>
          </div>
          <div>
            <h3>No closed positions to chart yet.</h3>
            <p>
              When PrigenFi has verified settlement records and cost basis, this
              space will show the agent's win/loss ratio and realized results by
              strategy. We will never use fabricated trades to fill these
              charts.
            </p>
            <Link href="/strategies">
              Explore research strategies <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="chart-duo">
          <article className="metric-panel">
            <div className="chart-heading">
              <div>
                <h3>Win / loss ratio</h3>
                <p>Based on finalized closed positions</p>
              </div>
              <Activity size={17} />
            </div>
            <div className="donut-layout">
              <div className="donut-canvas">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomes}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="85%"
                      stroke="none"
                      paddingAngle={4}
                    >
                      {outcomes.map((o) => (
                        <Cell
                          key={o.name}
                          fill={
                            o.name === "Wins"
                              ? "#6455db"
                              : o.name === "Losses"
                                ? "#f28e7c"
                                : "#bdb4da"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="donut-legend">
                {outcomes.map((o) => (
                  <div key={o.name}>
                    <span
                      className="donut-key"
                      style={{
                        background:
                          o.name === "Wins"
                            ? "#6455db"
                            : o.name === "Losses"
                              ? "#f28e7c"
                              : "#bdb4da",
                      }}
                    />
                    <span>{o.name}</span>
                    <strong>{o.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
          <article className="metric-panel">
            <div className="chart-heading">
              <div>
                <h3>Realized result by strategy</h3>
                <p>Finalized USD-equivalent P&amp;L</p>
              </div>
            </div>
            <div className="chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.strategies}>
                  <CartesianGrid stroke="#e8e6f1" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#77718d", fontSize: 11 }}
                  />
                  <YAxis width={48} tick={{ fill: "#77718d", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) =>
                      usd(typeof value === "number" ? value : null)
                    }
                  />
                  <Bar
                    dataKey="pnl"
                    fill="#6655d8"
                    maxBarSize={56}
                    radius={[7, 7, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
