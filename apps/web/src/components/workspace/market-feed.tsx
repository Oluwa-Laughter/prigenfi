"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCcw, Search, AlertCircle } from "lucide-react";
import {
  marketCategories,
  priceUsd,
  usd,
  type MarketCategory,
  type MarketFeed,
  type MarketPair,
} from "@/lib/markets";
import {
  publicMarketNetworks,
  marketQuerySchema,
} from "@prigenfi/shared/market-research";
import { MarketCharts } from "./market-charts";

function changeText(n: number | null) {
  return n === null ? "—" : (n > 0 ? "+" : "") + n.toFixed(2) + "%";
}

export function MarketFeedView({
  compact = false,
  initialCategory = "spot",
}: {
  compact?: boolean;
  initialCategory?: MarketCategory;
}) {
  const first =
    marketCategories.find((c) => c.id === initialCategory) ??
    marketCategories[0];
  const [category, setCategory] = useState<MarketCategory>(first.id);
  const [chain, setChain] =
    useState<(typeof publicMarketNetworks)[number]["id"]>("ethereum");
  const [query, setQuery] = useState<string>(first.query);
  const [submitted, setSubmitted] = useState<string>(first.query);
  const [feed, setFeed] = useState<MarketFeed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    void version;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      "/api/markets?chain=" + chain + "&q=" + encodeURIComponent(submitted),
      {
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const data: unknown = await r.json();
        if (!r.ok) throw new Error("Market feed unavailable");
        return data as MarketFeed;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          if (
            data.chain !== chain ||
            data.dataClass !== "public-market-research"
          ) {
            throw new Error("Mismatched market response");
          }
          setFeed(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFeed(null);
          setError(
            "Public market data for this network is temporarily unavailable. Try again.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [chain, submitted, version]);

  function selectCategory(id: MarketCategory) {
    const next =
      marketCategories.find((c) => c.id === id) ?? marketCategories[0];
    setCategory(id);
    setQuery(next.query);
    setSubmitted(next.query);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (marketQuerySchema.safeParse(query.trim()).success)
      setSubmitted(query.trim());
  }
  const data = feed?.pairs ?? [];
  const rows = compact ? data.slice(0, 5) : data;
  return (
    <section className="market-view">
      {!compact && (
        <>
          <div className="market-filter-bar">
            {marketCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => selectCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="market-category-summary">
            {marketCategories.find((c) => c.id === category)?.description}
          </p>
          <label className="market-network-select">
            <span>Public market network</span>
            <select
              aria-label="Public market network"
              value={chain}
              onChange={(event) => {
                setChain(event.target.value as typeof chain);
                setFeed(null);
                setError("");
              }}
            >
              {publicMarketNetworks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
            <small>
              Research only · This does not enable private trading on the
              selected network
            </small>
          </label>
          <form className="market-search" onSubmit={submit}>
            <Search size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="market-search-term">
              Search token symbol, pair, or EVM contract address
            </label>
            <input
              id="market-search-term"
              maxLength={45}
              placeholder="ETH, USDC/ETH, or a token contract address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={!marketQuerySchema.safeParse(query.trim()).success}
            >
              Search markets
            </button>
          </form>
        </>
      )}
      {loading ? (
        <div className="insight-empty" role="status">
          Loading public market data from DEX Screener…
        </div>
      ) : error ? (
        <div className="insight-empty">
          <AlertCircle size={22} />
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again <RefreshCcw size={14} />
          </button>
        </div>
      ) : !data.length ? (
        <div className="insight-empty">
          No public {publicMarketNetworks.find((n) => n.id === chain)?.name}{" "}
          pairs found for “{submitted}”. Try an exact token contract address for
          chain-specific discovery.
        </div>
      ) : (
        <>
          <div className="market-table-shell">
            <table className="market-table">
              <thead>
                <tr>
                  <th scope="col">Pair / market</th>
                  <th scope="col">Price</th>
                  <th scope="col">24h change</th>
                  <th scope="col">Volume (24h)</th>
                  <th scope="col">Liquidity</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: MarketPair) => (
                  <tr key={p.pairAddress}>
                    <td>
                      <div className="pair-token">
                        <span className="pair-symbol">
                          {p.base.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {p.base} <span>/ {p.quote}</span>
                          </strong>
                          <small>
                            {p.dex} · {feed?.network}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="numeric">{priceUsd(p.priceUsd)}</td>
                    <td
                      className={
                        "numeric change " +
                        (p.change24h !== null && p.change24h >= 0
                          ? "up"
                          : "down")
                      }
                    >
                      {changeText(p.change24h)}
                    </td>
                    <td className="numeric">
                      {usd(p.volume24hUsd, {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className="numeric">
                      {usd(p.liquidityUsd, {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td>
                      <a
                        className="market-source-link"
                        href={
                          "https://dexscreener.com/" +
                          chain +
                          "/" +
                          p.pairAddress
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={
                          "Inspect " + p.base + " pair on DEX Screener"
                        }
                      >
                        Inspect <ArrowUpRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {compact && (
            <Link className="market-more" href="/markets">
              View EVM markets <ArrowUpRight size={16} />
            </Link>
          )}
          <div className="market-footnote">
            Public DEX Screener snapshot ·{" "}
            {feed?.network ?? "Selected EVM network"}
            {feed?.fetchedAt
              ? " · " + new Date(feed.fetchedAt).toLocaleString()
              : ""}
            . Symbol searches use a globally limited provider result set;
            contract-address searches query your selected network directly. Data
            may be delayed or manipulated. Research only; no trades or private
            execution are performed from this table.
          </div>
          <MarketCharts
            pairs={data}
            network={feed?.network ?? "Selected EVM network"}
          />
        </>
      )}
    </section>
  );
}
