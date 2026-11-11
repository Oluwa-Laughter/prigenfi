"use client";
import { useState } from "react";
import {
  confidentialCapabilities,
  type ConfidentialMandate,
} from "@prigenfi/shared/confidential-policy";
import { CheckCircle2, LockKeyhole, ShieldAlert } from "lucide-react";

export function PrivateRouteCheck() {
  const [market, setMarket] =
    useState<ConfidentialMandate["market"]>("portfolio");
  const [asset, setAsset] = useState<string>("cUSDC");
  // Capability lookup only: do not fabricate a user mandate, amount or trading quote.
  const listed = confidentialCapabilities.confidentialAssets.some(
    (entry) => entry.symbol === asset,
  );
  const executionAllowed = false;
  return (
    <section
      className="private-route-check"
      aria-labelledby="private-route-title"
    >
      <div className="private-route-head">
        <div>
          <p className="ws-kicker">
            <LockKeyhole size={15} /> Read-only product capabilities
          </p>
          <h2 id="private-route-title">Can an agent route this privately?</h2>
          <p>
            Inspect the product's declared market scope and crypto-only
            test-wrapper selection. This is not a verified live trading route,
            and no capital amount or instruction is fabricated.
          </p>
        </div>
      </div>
      <div className="private-route-controls">
        <label>
          Strategy domain
          <select
            value={market}
            onChange={(e) =>
              setMarket(e.target.value as ConfidentialMandate["market"])
            }
          >
            {confidentialCapabilities.marketDomains.map((m) => (
              <option key={m} value={m}>
                {m === "portfolio"
                  ? "All Ethereum markets"
                  : m === "emerging-tokens"
                    ? "Emerging tokens"
                    : m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Testnet confidential asset
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            {confidentialCapabilities.confidentialAssets.map((a) => (
              <option key={a.address} value={a.symbol}>
                {a.symbol}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="private-route-result" role="status">
        <div className="private-route-result-icon">
          {executionAllowed ? (
            <CheckCircle2 size={25} />
          ) : (
            <ShieldAlert size={25} />
          )}
        </div>
        <div>
          <strong>
            {executionAllowed
              ? "Verified private execution available"
              : "Blocked — no verified private execution venue"}
          </strong>
          <p>
            Market: {market} · Test wrapper: {listed ? "listed" : "unsupported"}
            {" · "}Public fallback: forbidden · Wallet authority: not granted
          </p>
        </div>
      </div>
    </section>
  );
}
