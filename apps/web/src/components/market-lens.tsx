"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CircleCheck,
  Eye,
  Fingerprint,
  Radar,
  Waves,
} from "lucide-react";
const modes = [
  {
    id: "all",
    label: "All markets",
    title: "Direct an agent",
    mandate:
      "Research Ethereum markets on my behalf. Compare opportunities across DeFi, spot, staking and tokens. Require a verified confidential route before any trade.",
    assets: "Ethereum ecosystem",
    mode: "Private execution required",
  },
  {
    id: "defi",
    label: "DeFi",
    title: "Study DeFi",
    mandate:
      "Compare collateral, protocol and liquidity risks across lending, liquid staking and DeFi strategies. Do not use a public fallback.",
    assets: "Lending & pools",
    mode: "Research only",
  },
  {
    id: "spot",
    label: "Spot",
    title: "Spot liquidity",
    mandate:
      "Compare Ethereum pairs, execution quality and slippage. Only propose a confidential swap after it is verified.",
    assets: "ETH / ERC-20",
    mode: "Research only",
  },
  {
    id: "meme",
    label: "Emerging",
    title: "Token research",
    mandate:
      "Inspect contract safety, holders, liquidity and volatility of emerging tokens. Never claim a public swap is confidential.",
    assets: "Emerging tokens",
    mode: "Research only",
  },
];
export function MarketLens() {
  const [mode, setMode] = useState(0);
  const active = modes[mode];
  return (
    <div className="market-lens">
      <div className="lens-top">
        <div>
          <span className="lens-status-dot" /> PrigenFi studio{" "}
          <span className="lens-version">/ concept preview</span>
        </div>
        <span className="lens-symbol">
          <Radar size={18} />
        </span>
      </div>
      <div className="lens-content">
        <div className="lens-heading">
          <div className="lens-avatar">
            <Bot size={23} />
          </div>
          <div>
            <strong>Your trading agent</strong>
            <span>Give it a direction</span>
          </div>
          <span className="lens-preview-badge">Not live</span>
        </div>
        <p className="lens-caption">Choose a focus</p>
        <div className="lens-modes">
          {modes.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={i === mode}
              className={i === mode ? "selected" : ""}
              onClick={() => setMode(i)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="lens-note" key={active.id}>
          <span className="lens-note-icon">
            <Waves size={20} />
          </span>
          <p>{active.mandate}</p>
        </div>
        <div className="lens-map">
          <span className="lens-map-line" />
          <div>
            <Eye size={17} />
            <span>Research</span>
          </div>
          <div>
            <Fingerprint size={17} />
            <span>Policy</span>
          </div>
          <div>
            <CircleCheck size={17} />
            <span>Proposal</span>
          </div>
        </div>
        <div className="lens-bottom">
          <div>
            <span>Market universe</span>
            <strong>{active.assets}</strong>
          </div>
          <div>
            <span>Execution</span>
            <strong>{active.mode}</strong>
          </div>
        </div>
      </div>
      <div className="lens-footer">
        <span>
          <span className="lens-violet-dot" /> Owner authorization required
        </span>
        <span className="lens-footer-arrow">
          <ArrowUpRight size={17} />
        </span>
      </div>
    </div>
  );
}
