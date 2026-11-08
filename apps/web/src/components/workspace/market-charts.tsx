"use client";
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
import { MarketPair, usd } from "@/lib/markets";

const palette = [
  "#6352d9",
  "#f38e73",
  "#4f85d8",
  "#a580da",
  "#dbb26c",
  "#a3a8cd",
];

export function MarketCharts({ pairs }: { pairs: MarketPair[] }) {
  const valid = pairs.filter(
    (p) => (p.liquidityUsd ?? 0) > 0 && (p.volume24hUsd ?? 0) > 0,
  );
  const bars = [...valid]
    .sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))
    .slice(0, 6)
    .map((p) => ({
      name: p.base.slice(0, 8) + "/" + p.quote.slice(0, 8),
      volume: Math.round(p.volume24hUsd ?? 0),
    }));
  const slices = [...valid]
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.base.slice(0, 10),
      key: p.pairAddress,
      value: Math.round(p.liquidityUsd ?? 0),
    }));
  if (!bars.length)
    return (
      <div className="insight-empty">
        No usable Ethereum pool volume and liquidity data was returned for this
        search.
      </div>
    );
  return (
    <div className="chart-duo">
      <section className="metric-panel">
        <div className="chart-heading">
          <div>
            <h3>24h market volume</h3>
            <p>Selected Ethereum pools · USD</p>
          </div>
          <span className="chart-source">Public market feed</span>
        </div>
        <div
          className="chart-canvas"
          role="img"
          aria-label={
            "24 hour traded volume for " +
            bars.map((b) => b.name + ": " + usd(b.volume)).join(", ")
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bars}
              margin={{ top: 12, right: 10, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#e8e6f1" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#707184", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1e6
                    ? (v / 1e6).toFixed(0) + "m"
                    : v >= 1000
                      ? (v / 1000).toFixed(0) + "k"
                      : String(v)
                }
                tick={{ fill: "#8b8b9d", fontSize: 11 }}
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) =>
                  usd(
                    typeof v === "number"
                      ? v
                      : typeof v === "string"
                        ? Number(v)
                        : null,
                  )
                }
                cursor={{ fill: "#efecff" }}
              />
              <Bar
                dataKey="volume"
                fill="#6352d9"
                radius={[7, 7, 0, 0]}
                maxBarSize={54}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="metric-panel">
        <div className="chart-heading">
          <div>
            <h3>Pool liquidity mix</h3>
            <p>Top pools in this search · USD</p>
          </div>
          <span className="chart-source">Snapshot</span>
        </div>
        <div className="donut-layout">
          <div
            className="donut-canvas"
            role="img"
            aria-label={
              "Liquidity distribution: " +
              slices.map((s) => s.name + " " + usd(s.value)).join(", ")
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="84%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {slices.map((p, i) => (
                    <Cell key={p.key} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) =>
                    usd(
                      typeof v === "number"
                        ? v
                        : typeof v === "string"
                          ? Number(v)
                          : null,
                    )
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="donut-legend">
            {slices.map((s, i) => (
              <div key={s.key}>
                <span
                  className="donut-key"
                  style={{ background: palette[i % palette.length] }}
                />
                <span>{s.name}</span>
                <strong>{usd(s.value, { notation: "compact" })}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
