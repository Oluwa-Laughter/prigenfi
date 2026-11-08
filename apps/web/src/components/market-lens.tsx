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
    id: "memes",
    label: "Meme tokens",
    title: "Scout meme momentum",
    mandate:
      "Find emerging Ethereum meme pairs with meaningful liquidity. Flag honeypot risks, concentration and sharp price moves before proposing anything.",
    assets: "New ETH pairs",
    mode: "Research only",
  },
  {
    id: "spot",
    label: "Spot DEX",
    title: "Watch spot liquidity",
    mandate:
      "Track ETH/ERC-20 liquidity across DEX pools. Compare routing, depth and slippage. Only prepare a trade if the wallet policy permits it.",
    assets: "ETH / ERC-20",
    mode: "Research only",
  },
  {
    id: "defi",
    label: "DeFi",
    title: "Compare DeFi positions",
    mandate:
      "Research lending and liquid staking opportunities. Report protocol and liquidation risks, then propose a bounded allocation.",
    assets: "Lending & staking",
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
