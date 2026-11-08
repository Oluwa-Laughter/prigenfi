"use client";
import { useState } from "react";
import {
  assessConfidentialTrade,
  confidentialCapabilities,
  type ConfidentialMandate,
} from "@prigenfi/shared/confidential-policy";
import { CheckCircle2, LockKeyhole, ShieldAlert } from "lucide-react";

export function PrivateRouteCheck() {
  const [market, setMarket] =
    useState<ConfidentialMandate["market"]>("portfolio");
  const [asset, setAsset] = useState<string>("cUSDC");
  const outcome = assessConfidentialTrade({
    market,
    watchAssets: asset,
    suggestedCapitalLimit: "10",
    instruction:
      "Research this confidential market and propose only a verified private route.",
    privacy: "confidential-only",
  });
  return (
    <section
      className="private-route-check"
      aria-labelledby="private-route-title"
    >
      <div className="private-route-head">
        <div>
          <p className="ws-kicker">
            <LockKeyhole size={15} /> Live policy readout
          </p>
          <h2 id="private-route-title">Can an agent route this privately?</h2>
          <p>
            Inspect the current internal policy gate. No wallet, instructions or
            private balances are sent to a market API here.
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
          {outcome.executionAllowed ? (
            <CheckCircle2 size={25} />
          ) : (
            <ShieldAlert size={25} />
          )}
        </div>
        <div>
          <strong>
            {outcome.executionAllowed
              ? "Verified private execution available"
              : "Blocked — no verified private execution venue"}
          </strong>
          <p>
            Policy: confidential only · Public routing: forbidden · Wallet
            authority: not granted · Research mandate:{" "}
            {outcome.acceptedAsResearch ? "valid" : "invalid"}
          </p>
        </div>
      </div>
    </section>
  );
}
