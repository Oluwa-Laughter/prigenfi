"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useConnection } from "wagmi";

/** Only wallet-matched SIWE sessions may modify the DB-backed public market list. */
export function WatchlistToggle({
  chain,
  pairAddress,
}: {
  chain: string;
  pairAddress: string;
}) {
  const wallet = useConnection();
  const [state, setState] = useState<
    "wallet" | "loading" | "sign-in" | "unavailable" | "ready"
  >("wallet");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const address = wallet.address;
  const network = wallet.chainId;
  const connected = wallet.isConnected;
  useEffect(() => {
    setSaved(false);
    setError("");
    if (!connected || !address || network === undefined) {
      setState("wallet");
      return;
    }
    const controller = new AbortController();
    setState("loading");
    (async () => {
      const session = await fetch("/api/auth/session", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!session.ok) throw new Error("SERVICE_UNAVAILABLE");
      const owner = await session.json();
      if (
        owner.authenticated !== true ||
        owner.address?.toLowerCase() !== address.toLowerCase() ||
        owner.chainId !== network
      ) {
        if (!controller.signal.aborted) setState("sign-in");
        return;
      }
      const response = await fetch("/api/watchlist", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("WATCHLIST_UNAVAILABLE");
      const data = await response.json();
      if (!controller.signal.aborted) {
        setSaved(
          Array.isArray(data.markets) &&
            data.markets.some(
              (item: { chain: string; pairAddress: string }) =>
                item.chain === chain &&
                item.pairAddress.toLowerCase() === pairAddress.toLowerCase(),
            ),
        );
        setState("ready");
      }
    })().catch(() => {
      if (!controller.signal.aborted) setState("unavailable");
    });
    return () => controller.abort();
  }, [address, network, connected, chain, pairAddress]);
  async function change() {
    if (state !== "ready" || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/watchlist", {
        method: saved ? "DELETE" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chain, pairAddress }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error === "WATCHLIST_LIMIT"
            ? "You can save up to 25 markets. Remove one first."
            : "Could not update your saved markets. Refresh or sign in again.",
        );
      }
      setSaved((value) => !value);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update your saved markets.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (state === "wallet")
    return (
      <span className="pair-save-hint">
        Connect your wallet to save this public market
      </span>
    );
  if (state === "loading")
    return (
      <span className="pair-save-hint" role="status">
        Checking your saved markets…
      </span>
    );
  if (state === "sign-in")
    return (
      <Link href="/agents" className="ws-pill-button">
        Sign in to save this market
      </Link>
    );
  if (state === "unavailable")
    return (
      <span className="pair-save-hint">
        Saved markets are unavailable on this deployment
      </span>
    );
  return (
    <div className="pair-save-control">
      <button
        type="button"
        className="ws-pill-button"
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void change()}
      >
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        {busy
          ? "Saving…"
          : saved
            ? "Remove saved market"
            : "Save to my markets"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
