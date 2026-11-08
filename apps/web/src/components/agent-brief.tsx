"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Check, Copy, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Market = "Stablecoins" | "ETH & ERC-20" | "DeFi opportunities";

export function AgentBrief() {
  const [market, setMarket] = useState<Market>("Stablecoins");
  const [assets, setAssets] = useState("cUSD / cUSDT");
  const [limit, setLimit] = useState("100");
  const [instruction, setInstruction] = useState(
    "Watch this market for opportunities. Research liquidity and risks, then propose an action before any execution.",
  );
  const [feedback, setFeedback] = useState("");
  const valid = Number.isFinite(Number(limit)) && Number(limit) > 0 && instruction.trim().length >= 12 && assets.trim().length > 0;
  const brief = [
    "PRIGENFI AGENT MANDATE — DRAFT ONLY",
    "Network: Ethereum Sepolia (testnet)",
    "Market: " + market,
    "Assets or pair of interest: " + assets.trim(),
    "Suggested maximum capital allocation: " + limit + " test asset units",
    "Instructions: " + instruction.trim(),
    "Rules: Do not spend, sign, transfer, trade, or request decryption unless the owner has separately approved an on-chain policy for the exact action.",
    "Only produce a research summary and proposed transaction. Verify sources and simulate before seeking authorization.",
    "Confidential swaps and autonomous execution are not available in this development build.",
  ].join("\n");

  async function copyBrief() {
    if (!valid) return;
    try {
      await navigator.clipboard.writeText(brief);
      setFeedback("Agent brief copied. No wallet permission or transaction was created.");
    } catch {
      setFeedback("Clipboard access was denied. Copy the instructions from the preview instead.");
    }
  }

  return (
    <section className="agent-brief" id="agent-brief" aria-labelledby="agent-brief-title">
      <div className="agent-brief-header">
        <div>
          <div className="eyebrow"><Bot size={14} aria-hidden="true" /> STEP 01 / DIRECT YOUR AGENT</div>
          <h2 id="agent-brief-title">What should your agent work on?</h2>
          <p>Choose the market, define a capital boundary, and give your agent a clear mandate. Permission comes separately, from your wallet.</p>
        </div>
        <span className="brief-chip">Draft · No execution</span>
      </div>
      <div className="brief-form-grid">
        <label className="brief-field">
          <span>Market to explore</span>
          <select value={market} onChange={(e) => {
            const value = e.target.value as Market;
            setMarket(value);
            setAssets(value === "Stablecoins" ? "cUSD / cUSDT" : value === "ETH & ERC-20" ? "ETH / ERC-20" : "Supported DeFi venues");
            setFeedback("");
          }}>
            <option value="Stablecoins">Stablecoins</option>
            <option value="ETH & ERC-20">ETH & ERC-20</option>
            <option value="DeFi opportunities">DeFi opportunities</option>
          </select>
        </label>
        <label className="brief-field">
          <span>Asset or market pair</span>
          <input value={assets} maxLength={90} onChange={(e) => { setAssets(e.target.value); setFeedback(""); }} />
        </label>
        <label className="brief-field">
          <span>Capital boundary (test units)</span>
          <input type="number" min="0.01" step="0.01" value={limit} onChange={(e) => { setLimit(e.target.value); setFeedback(""); }} />
        </label>
        <label className="brief-field brief-span">
          <span>What should your agent look for?</span>
          <textarea value={instruction} maxLength={1200} onChange={(e) => { setInstruction(e.target.value); setFeedback(""); }} />
        </label>
      </div>
      <div className="brief-bottom">
        <p><SlidersHorizontal size={15} aria-hidden="true" style={{display:"inline", marginRight:7}} /> This creates an instruction draft, not an authorized strategy. Agent trading and confidential swaps are not enabled; the current vault supports restricted test transfers only.</p>
        <div className="brief-actions">
          <Link href="#confidential">View cUSD / cUSDT <ArrowUpRight size={13} style={{display:"inline"}} /></Link>
          <Button disabled={!valid} onClick={copyBrief}>
            {feedback.startsWith("Agent brief copied") ? <Check size={16} /> : <Copy size={16} />}
            Copy agent brief
          </Button>
        </div>
      </div>
      {feedback ? <p className="brief-alert" role="status">{feedback}</p> : null}
      <details className="brief-preview">
        <summary>Preview the full mandate</summary>
        <pre>{brief}</pre>
      </details>
    </section>
  );
}
