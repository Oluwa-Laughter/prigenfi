"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Bot, Clock3, RefreshCw } from "lucide-react";
import { useConnection } from "wagmi";

type Overview = {
  source: "owner-authenticated-postgres";
  owner: { address: string; chainId: number };
  agents: {
    active: number;
    expiringSoon: number;
    inactive: number;
    latest: { id: string; label: string; host: string; expiresAt: string }[];
  };
  watchlist: {
    total: number;
    maxSaved: number;
    saved: { chain: string; pairAddress: string; savedAt: string }[];
  };
  executionAllowed: false;
};
type Phase = "connect" | "loading" | "sign-in" | "unavailable" | "ready";

export function WorkspaceOverview() {
  const wallet = useConnection();
  const { address, chainId, isConnected } = wallet;
  const [phase, setPhase] = useState<Phase>("loading");
  const [snapshot, setSnapshot] = useState<Overview | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    void revision;
    setSnapshot(null);
    if (!isConnected || !address || chainId === undefined) {
      setPhase("connect");
      return;
    }
    const controller = new AbortController();
    setPhase("loading");
    (async () => {
      const response = await fetch("/api/workspace/overview", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (response.status === 401) {
        if (!controller.signal.aborted) setPhase("sign-in");
        return;
      }
      if (!response.ok) throw new Error("BACKEND_UNAVAILABLE");
      const result = (await response.json()) as Overview;
      if (
        result.source !== "owner-authenticated-postgres" ||
        result.owner?.address?.toLowerCase() !== address.toLowerCase() ||
        result.owner?.chainId !== chainId ||
        result.executionAllowed !== false
      ) {
        if (!controller.signal.aborted) setPhase("sign-in");
        return;
      }
      if (!controller.signal.aborted) {
        setSnapshot(result);
        setPhase("ready");
      }
    })().catch(() => {
      if (!controller.signal.aborted) setPhase("unavailable");
    });
    return () => controller.abort();
  }, [address, chainId, isConnected, revision]);

  // Never show owner records if the browser's connected wallet or chain changes.
  const visible =
    phase === "ready" &&
    snapshot &&
    isConnected &&
    address &&
    snapshot.owner.address.toLowerCase() === address.toLowerCase() &&
    snapshot.owner.chainId === chainId
      ? snapshot
      : null;

  return (
    <section
      className="ws-owner-overview"
      id="workspace-summary"
      aria-labelledby="workspace-summary-heading"
    >
      <div className="ws-owner-header">
        <div>
          <p className="ws-kicker">Your saved workspace</p>
          <h2 id="workspace-summary-heading">Research, in one place.</h2>
          <p>
            Wallet-owned research records, not trade positions or agent profits.
          </p>
        </div>
        {visible && (
          <button
            type="button"
            className="ws-overview-refresh"
            onClick={reload}
            aria-label="Refresh my workspace overview"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        )}
      </div>
      {!visible ? (
        <div className="ws-owner-empty" role="status">
          <div className="ws-owner-empty-symbol">
            <Bookmark size={23} />
          </div>
          <div>
            <strong>
              {phase === "connect"
                ? "Connect a wallet to personalize your workspace"
                : phase === "loading"
                  ? "Checking your saved research…"
                  : phase === "sign-in"
                    ? "Sign in to see your saved research"
                    : "Your saved workspace is currently unavailable"}
            </strong>
            <p>
              {phase === "connect"
                ? "Use Connect wallet in the top bar, then sign in through My agents. Your public market bookmarks and research profiles will be associated with that wallet."
                : phase === "loading"
                  ? "Loading only records associated with the authenticated wallet."
                  : phase === "sign-in"
                    ? "A wallet connection alone does not establish a backend session. Your saved markets and research profiles are only visible after wallet sign-in."
                    : "The account database or session service may not be configured on this deployment. No sample portfolio or substitute data is shown."}
            </p>
            {phase === "sign-in" && (
              <Link href="/agents" className="ws-text-link">
                Open wallet sign-in <ArrowUpRight size={15} />
              </Link>
            )}
            {phase === "unavailable" && (
              <button
                type="button"
                className="ws-overview-refresh"
                onClick={reload}
              >
                Try again <RefreshCw size={15} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="ws-owner-metrics">
            <div>
              <Bot size={17} />
              <span>Active research profiles</span>
              <strong>{visible.agents.active}</strong>
            </div>
            <div>
              <Bookmark size={17} />
              <span>Saved public markets</span>
              <strong>{visible.watchlist.total}</strong>
            </div>
            <div>
              <Clock3 size={17} />
              <span>Profiles expiring within 48h</span>
              <strong>{visible.agents.expiringSoon}</strong>
            </div>
          </div>
          <div className="ws-owner-columns">
            <div>
              <div className="ws-owner-column-heading">
                <h3>Markets you follow</h3>
                <Link href="/saved">
                  View all <ArrowUpRight size={15} />
                </Link>
              </div>
              {visible.watchlist.saved.length ? (
                <ul className="ws-owner-list">
                  {visible.watchlist.saved.map((market) => (
                    <li key={market.chain + market.pairAddress}>
                      <div>
                        <strong>{market.chain}</strong>
                        <small title={market.pairAddress}>
                          {market.pairAddress.slice(0, 8)}…
                          {market.pairAddress.slice(-6)}
                        </small>
                      </div>
                      <Link
                        href={`/markets/pair/${market.chain}/${market.pairAddress}`}
                      >
                        Inspect <ArrowUpRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ws-owner-list-empty">
                  No public pairs saved yet. Open Markets, inspect a pool, and
                  save it to return here.
                </p>
              )}
            </div>
            <div>
              <div className="ws-owner-column-heading">
                <h3>Your research profiles</h3>
                <Link href="/agents">
                  Manage <ArrowUpRight size={15} />
                </Link>
              </div>
              {visible.agents.latest.length ? (
                <ul className="ws-owner-list">
                  {visible.agents.latest.map((profile) => (
                    <li key={profile.id}>
                      <div>
                        <strong>{profile.label}</strong>
                        <small>
                          {profile.host} · Expires{" "}
                          {new Date(profile.expiresAt).toLocaleDateString()}
                        </small>
                      </div>
                      <Link href="/agents">
                        Manage <ArrowUpRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ws-owner-list-empty">
                  No active research profiles. Create one on My agents to save
                  permitted networks and research areas.
                </p>
              )}
            </div>
          </div>
          <p className="ws-owner-note">
            Data: your authenticated account records. Saved markets are
            identifiers, not holdings; research profiles cannot trade or decrypt
            assets.
          </p>
        </>
      )}
    </section>
  );
}
