"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import type { SwapVenueObservation } from "@prigenfi/shared/swap-venue";

type VenueResponse = SwapVenueObservation & { checkedAt?: string | null };

export function SwapVenueStatus() {
  const [report, setReport] = useState<VenueResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/confidential-venue", {
      signal: controller.signal,
      credentials: "omit",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("RPC unavailable");
        return (await res.json()) as VenueResponse;
      })
      .then((value) => {
        if (!controller.signal.aborted) setReport(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, []);
  const deployed = report?.status === "deployed-proxy" && report.uupsConfirmed;
  const rows = [
    {
      name: "Official Sepolia registry",
      detail: "Pinned, SHA-256-verified source snapshot",
      checked: true,
    },
    {
      name: "On-chain contract proxy",
      detail: deployed
        ? "Bytecode observed at a specific block"
        : "Waiting for a verified RPC observation",
      checked: deployed,
    },
    {
      name: "UUPS implementation",
      detail: deployed
        ? "Implementation bytecode and UUID confirmed"
        : "Not independently confirmed in this session",
      checked: deployed,
    },
    {
      name: "Private RFQ execution",
      detail:
        "Interface, liquidity, permissions and encrypted settlement not proven",
      checked: false,
    },
  ];
  return (
    <section className="venue-audit" aria-labelledby="venue-audit-heading">
      <div className="venue-audit-title">
        <div>
          <p className="ws-kicker">
            <TerminalSquare size={15} /> On-chain infrastructure
          </p>
          <h2 id="venue-audit-heading">Zama confidential RFQ venue</h2>
          <p>
            The official Sepolia proxy can be inspected without signing a
            transaction. Verification of deployed code is not authorization to
            trade.
          </p>
        </div>
        <span className="venue-audit-badge">
          <LockKeyhole size={14} /> Execution locked
        </span>
      </div>
      <div className="venue-audit-grid">
        <div className="venue-audit-checks" role="status" aria-live="polite">
          {rows.map((row) => (
            <div className="venue-check-row" key={row.name}>
              <span
                className={
                  row.checked ? "venue-check-ok" : "venue-check-pending"
                }
              >
                {row.checked ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <XCircle size={19} />
                )}
              </span>
              <div>
                <strong>{row.name}</strong>
                <small>{row.detail}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="venue-audit-report">
          <span className="ws-kicker">
            <ShieldCheck size={14} /> Read-only chain observation
          </span>
          <div className="venue-big-status">
            {deployed ? (
              <CheckCircle2 size={25} />
            ) : unavailable ? (
              <ShieldAlert size={25} />
            ) : (
              <Clock3 size={25} />
            )}
            <strong>
              {deployed
                ? "Proxy confirmed"
                : unavailable
                  ? "RPC temporarily unavailable"
                  : "Checking Sepolia"}
            </strong>
          </div>
          <p>
            {deployed
              ? "PrigenFi confirmed the registered proxy and its upgradeable implementation. Actual confidential orders remain blocked."
              : "No trading decision will be made from an unavailable or incomplete chain observation."}
          </p>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>Ethereum Sepolia</dd>
            </div>
            <div>
              <dt>Block</dt>
              <dd>{report?.blockNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Implementation</dt>
              <dd className="venue-hex">
                {report?.implementationAddress ?? "Unverified"}
              </dd>
            </div>
            <div>
              <dt>Last RPC check</dt>
              <dd>
                {report?.checkedAt
                  ? new Date(report.checkedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
          </dl>
          <a
            href="https://sepolia.etherscan.io/address/0xab86445f72A64A99C8d248dcE004915B45C88e20"
            target="_blank"
            rel="noopener noreferrer"
          >
            Inspect deployed contract <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
      <p className="venue-audit-warning">
        <ShieldAlert size={17} /> A verified proxy is not a verified swap. Pair
        eligibility, access to market makers, RFQ ABI, confidential permissions
        and settlement require separate end-to-end proof. Public fallback
        remains prohibited.
      </p>
    </section>
  );
}
