"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConnection } from "wagmi";
import { publicMarketNetworks } from "@prigenfi/shared/market-research";
import {
  ArrowUpRight,
  Bookmark,
  Download,
  Eraser,
  LockKeyhole,
  RefreshCw,
  Trash2,
} from "lucide-react";

type Market = { chain: string; pairAddress: string; savedAt: string };
type LoadState = "connect" | "loading" | "sign-in" | "unavailable" | "ready";
const CLEAR_PHRASE = "CLEAR MY MARKETS";

/** Exports public pool identifiers only; never uses external analytics or price providers. */
function csvFor(markets: Market[]) {
  const lines = [
    "network,pair_address,saved_at",
    ...markets.map(
      ({ chain, pairAddress, savedAt }) => `${chain},${pairAddress},${savedAt}`,
    ),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function SavedMarketsManager() {
  const { address, chainId, isConnected } = useConnection();
  const [state, setState] = useState<LoadState>("loading");
  const [owner, setOwner] = useState<{
    address: string;
    chainId: number;
  } | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [revision, setRevision] = useState(0);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    void revision;
    setOwner(null);
    setMarkets([]);
    setError("");
    setNotice("");
    setConfirmOpen(false);
    setConfirmation("");
    if (!isConnected || !address || chainId === undefined) {
      setState("connect");
      return;
    }
    const controller = new AbortController();
    setState("loading");
    (async () => {
      const session = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!session.ok) throw new Error("ACCOUNT_SERVICE_UNAVAILABLE");
      const identity = await session.json();
      if (
        identity.authenticated !== true ||
        identity.address?.toLowerCase() !== address.toLowerCase() ||
        identity.chainId !== chainId
      ) {
        if (!controller.signal.aborted) setState("sign-in");
        return;
      }
      const result = await fetch("/api/watchlist", {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!result.ok) throw new Error("WATCHLIST_UNAVAILABLE");
      const data = await result.json();
      if (data.executionAllowed !== false || !Array.isArray(data.markets))
        throw new Error("INVALID_WATCHLIST_RESPONSE");
      if (!controller.signal.aborted) {
        setOwner({ address: identity.address, chainId: identity.chainId });
        setMarkets(data.markets as Market[]);
        setState("ready");
      }
    })().catch(() => {
      if (!controller.signal.aborted) setState("unavailable");
    });
    return () => controller.abort();
  }, [address, chainId, isConnected, revision]);

  // Never render owner-specific records for a disconnected or switched wallet.
  const authorized =
    state === "ready" &&
    !!owner &&
    !!isConnected &&
    !!address &&
    owner.address.toLowerCase() === address.toLowerCase() &&
    owner.chainId === chainId;
  const rows = authorized ? markets : [];

  async function remove(market: Market) {
    if (!authorized || busyKey) return;
    const key = `${market.chain}:${market.pairAddress}`;
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chain: market.chain,
          pairAddress: market.pairAddress,
        }),
      });
      if (!response.ok)
        throw new Error(
          "Could not remove this market. Check your sign-in and try again.",
        );
      setMarkets((current) =>
        current.filter(
          (item) =>
            item.chain !== market.chain ||
            item.pairAddress !== market.pairAddress,
        ),
      );
      setNotice("Market removed from your saved research.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not remove this market.",
      );
    } finally {
      setBusyKey("");
    }
  }
  async function clearAll() {
    if (
      !authorized ||
      busyKey ||
      confirmation !== CLEAR_PHRASE ||
      rows.length === 0
    )
      return;
    setBusyKey("all");
    setError("");
    setNotice("");
    try {
      const result = await fetch("/api/watchlist", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearAll: true, confirmation: CLEAR_PHRASE }),
      });
      if (!result.ok)
        throw new Error(
          "Could not clear your markets. Check your session and try again.",
        );
      const payload = await result.json();
      if (typeof payload.removed !== "number")
        throw new Error(
          "Could not confirm deletion. Refresh your saved markets.",
        );
      setMarkets([]);
      setConfirmOpen(false);
      setConfirmation("");
      setNotice(
        `${payload.removed} saved ${payload.removed === 1 ? "market" : "markets"} removed from your workspace.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not clear your markets.",
      );
    } finally {
      setBusyKey("");
    }
  }
  function download() {
    if (!authorized || !rows.length || busyKey) return;
    const blob = new Blob([csvFor(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "prigenfi-public-market-watchlist.csv";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  const emptyText =
    state === "connect"
      ? "Connect your wallet from the top bar, then sign in on My agents to see your saved research."
      : state === "sign-in"
        ? "Your wallet is connected, but no matching signed-in account session is active."
        : state === "loading"
          ? "Checking your wallet-owned research records…"
          : "Your research records are unavailable. The account database may not be configured on this deployment.";
  return (
    <section
      className="saved-markets-panel"
      aria-label="Saved public crypto markets"
    >
      <div className="saved-markets-toolbar">
        <div>
          <span className="saved-markets-eyebrow">
            <LockKeyhole size={15} /> Wallet-scoped records
          </span>
          <strong>
            {authorized
              ? `${rows.length} saved ${rows.length === 1 ? "pool" : "pools"}`
              : "Your market list"}
          </strong>
          <small>
            Public market identifiers only. Nothing here is a balance, private
            order or authorized trade.
          </small>
        </div>
        {authorized && (
          <div className="saved-markets-actions">
            <button
              type="button"
              onClick={reload}
              disabled={!!busyKey}
              className="ws-overview-refresh"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              type="button"
              onClick={download}
              disabled={!rows.length || !!busyKey}
              className="ws-overview-refresh"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(true);
                setConfirmation("");
              }}
              disabled={!rows.length || !!busyKey}
              className="saved-markets-danger"
            >
              <Eraser size={15} /> Clear all
            </button>
          </div>
        )}
      </div>
      {!authorized ? (
        <div className="saved-markets-empty" role="status">
          <Bookmark size={23} aria-hidden="true" />
          <p>{emptyText}</p>
          {state === "sign-in" && (
            <Link href="/agents" className="ws-text-link">
              Sign in with your wallet <ArrowUpRight size={16} />
            </Link>
          )}
          {state === "unavailable" && (
            <button
              type="button"
              className="ws-overview-refresh"
              onClick={reload}
            >
              Try again <RefreshCw size={15} />
            </button>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="saved-markets-empty" role="status">
          <Bookmark size={23} aria-hidden="true" />
          <p>
            You have no saved pools. Explore public crypto markets, open a pool,
            and save the ones you want to revisit.
          </p>
          <Link href="/markets" className="ws-text-link">
            Discover a market <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : (
        <ul className="saved-markets-list">
          {rows.map((item) => {
            const key = `${item.chain}:${item.pairAddress}`;
            const network = publicMarketNetworks.find(
              (entry) => entry.id === item.chain,
            );
            return (
              <li key={key}>
                <span className="saved-markets-symbol">
                  <Bookmark size={18} />
                </span>
                <div className="saved-markets-identity">
                  <strong>{network?.name ?? item.chain}</strong>
                  <code>{item.pairAddress}</code>
                  <small>
                    Saved {new Date(item.savedAt).toLocaleDateString()}
                  </small>
                </div>
                <div className="saved-markets-item-actions">
                  <Link
                    href={`/markets/pair/${item.chain}/${item.pairAddress}`}
                    aria-label={`Inspect ${network?.name ?? item.chain} pool ${item.pairAddress}`}
                    className="ws-text-link"
                  >
                    Inspect <ArrowUpRight size={15} />
                  </Link>
                  <button
                    type="button"
                    className="saved-markets-remove"
                    disabled={!!busyKey}
                    onClick={() => void remove(item)}
                    aria-label={`Remove ${network?.name ?? item.chain} pool ${item.pairAddress}`}
                  >
                    <Trash2 size={16} />{" "}
                    {busyKey === key ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {authorized && confirmOpen && rows.length > 0 && (
        <section
          className="saved-markets-confirm"
          aria-labelledby="clear-saved-heading"
        >
          <strong id="clear-saved-heading">
            Clear all {rows.length} saved markets?
          </strong>
          <p>
            This permanently removes your public market bookmarks from this
            account. It does not affect any on-chain assets, wallets, research
            profiles, or agent credentials.
          </p>
          <label htmlFor="saved-markets-confirm-input">
            Type <strong>{CLEAR_PHRASE}</strong> to confirm
          </label>
          <input
            id="saved-markets-confirm-input"
            type="text"
            value={confirmation}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <div className="saved-markets-confirm-actions">
            <button
              type="button"
              className="saved-markets-danger"
              disabled={confirmation !== CLEAR_PHRASE || !!busyKey}
              onClick={() => void clearAll()}
            >
              Permanently clear markets
            </button>
            <button
              type="button"
              className="ws-overview-refresh"
              disabled={!!busyKey}
              onClick={() => {
                setConfirmOpen(false);
                setConfirmation("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      {error && (
        <p className="saved-markets-message is-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="saved-markets-message" role="status">
          {notice}
        </p>
      )}
      <p className="saved-markets-disclosure">
        Saving a pool links its public chain and contract address to your
        authenticated PrigenFi research account. It does not save wallet
        balances or create a confidential position. CSV exports are generated in
        your browser from the records shown, with no market-data calls or
        personal wallet address added to the file.
      </p>
    </section>
  );
}
