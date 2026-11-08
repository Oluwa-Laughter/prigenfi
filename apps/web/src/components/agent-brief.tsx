"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Check,
  ClipboardCopy,
  LockKeyhole,
} from "lucide-react";

type Market =
  | "Meme tokens"
  | "DEX spot"
  | "DeFi lending"
  | "Staking & liquidity"
  | "Stablecoins"
  | "Perpetuals";
const templates: Record<
  string,
  { market: Market; assets: string; instruction: string }
> = {
  meme: {
    market: "Meme tokens",
    assets: "PEPE / ETH and emerging tokens",
    instruction:
      "Research Ethereum meme-token momentum. Inspect contract risk, liquidity depth, concentrated holders and slippage. Prepare an evidence-based proposal; do not trade.",
  },
  spot: {
    market: "DEX spot",
    assets: "ETH / ERC-20",
    instruction:
      "Compare Ethereum DEX spot pairs and liquidity. Estimate price impact, slippage, route safety and transaction cost before proposing any execution.",
  },
  defi: {
    market: "DeFi lending",
    assets: "AAVE / ETH / USDC",
    instruction:
      "Study collateral, utilization, borrower risk and lending protocol exposure. Report risks and propose a bounded strategy.",
  },
  stable: {
    market: "Stablecoins",
    assets: "cUSD / cUSDT",
    instruction:
      "Study stablecoin market spreads and available confidentiality routes. Do not imply an executable private swap unless a Zama-compatible venue has been verified.",
  },
  staking: {
    market: "Staking & liquidity",
    assets: "ETH / liquid staking / LP",
    instruction:
      "Analyze staking yields, liquidity exit risk, impermanent loss and protocol dependencies. Submit a research report before any allocation.",
  },
  perps: {
    market: "Perpetuals",
    assets: "ETH / ERC-20 perps",
    instruction:
      "Research funding rates, volatility, margin and liquidation risk. Leveraged execution is not supported; do not place trades.",
  },
};
const markets: Market[] = [
  "Meme tokens",
  "DEX spot",
  "DeFi lending",
  "Staking & liquidity",
  "Stablecoins",
  "Perpetuals",
];
export function AgentBrief() {
  const [market, setMarket] = useState<Market>("DEX spot");
  const [assets, setAssets] = useState("ETH / ERC-20");
  const [limit, setLimit] = useState("100");
  const [instruction, setInstruction] = useState(templates.spot.instruction);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("strategy");
    const template = id ? templates[id] : undefined;
    if (template) {
      setMarket(template.market);
      setAssets(template.assets);
      setInstruction(template.instruction);
    }
  }, []);
  const valid =
    Number.isFinite(Number(limit)) &&
    Number(limit) > 0 &&
    Number(limit) <= 1000000000 &&
    assets.trim().length > 0 &&
    instruction.trim().length >= 12;
  const mandate = [
    "PRIGENFI — AGENT RESEARCH MANDATE (DRAFT)",
    "Market research scope: Ethereum ecosystem",
    "Execution environment: Ethereum Sepolia testnet only",
    "Market: " + market,
    "Watch assets: " + assets.trim(),
    "Proposed capital ceiling: " +
      limit +
      " test units (not an on-chain approval)",
    "User instruction: " + instruction.trim(),
    "Agent requirements: cite price, liquidity and token-risk evidence. Do not infer approvals from this text.",
    "Execution: research and proposal only. No signing, swaps, bridging or decryption through this mandate.",
    "Owner must separately authorize the exact asset, target, amount and expiry in a verified on-chain policy.",
  ].join("\n");
  async function copy() {
    if (!valid) return;
    try {
      await navigator.clipboard.writeText(mandate);
      setStatus(
        "Mandate copied. This did not register an agent or grant wallet permissions.",
      );
    } catch {
      setStatus(
        "Clipboard access is blocked. Open the preview below and copy the text manually.",
      );
    }
  }
  return (
    <section
      className="agent-brief"
      id="agent-brief"
      aria-labelledby="agent-brief-title"
    >
      <div className="agent-brief-header">
        <div>
          <span className="ws-kicker">
            <Bot size={15} /> Mission builder
          </span>
          <h2 id="agent-brief-title">What should your agent work on?</h2>
          <p>
            Choose the market, set a suggested ceiling and describe the research
            you want. You remain the signer and rule-maker.
          </p>
        </div>
        <span className="brief-chip">Draft only · No trade</span>
      </div>
      <div className="brief-form-grid">
        <label className="brief-field">
          <span>Market to research</span>
          <select
            value={market}
            onChange={(e) => {
              const v = e.target.value as Market;
              const choice = Object.values(templates).find(
                (x) => x.market === v,
              );
              setMarket(v);
              if (choice) {
                setAssets(choice.assets);
                setInstruction(choice.instruction);
              }
              setStatus("");
            }}
          >
            {markets.map((m) => (
              <option value={m} key={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="brief-field">
          <span>Token / pair / venue</span>
          <input
            value={assets}
            maxLength={90}
            onChange={(e) => {
              setAssets(e.target.value);
              setStatus("");
            }}
          />
        </label>
        <label className="brief-field">
          <span>Suggested capital ceiling (test units)</span>
          <input
            type="number"
            min="0.01"
            max="1000000000"
            step="0.01"
            value={limit}
            onChange={(e) => {
              setLimit(e.target.value);
              setStatus("");
            }}
          />
        </label>
        <label className="brief-field brief-span">
          <span>Your instruction to the agent</span>
          <textarea
            value={instruction}
            maxLength={1200}
            onChange={(e) => {
              setInstruction(e.target.value);
              setStatus("");
            }}
          />
        </label>
      </div>
      <div className="brief-bottom">
        <p>
          <LockKeyhole size={16} /> A market instruction is not wallet
          authority. Private swaps and autonomous execution aren't available in
          this release.
        </p>
        <div className="brief-actions">
          <Link href="/vault">
            Manage wallet limits <ArrowUpRight size={16} />
          </Link>
          <button
            type="button"
            disabled={!valid}
            className="ws-pill-button"
            onClick={copy}
          >
            {status.startsWith("Mandate copied") ? (
              <Check size={17} />
            ) : (
              <ClipboardCopy size={17} />
            )}{" "}
            Copy mandate
          </button>
        </div>
      </div>
      {status && (
        <p role="status" className="brief-alert">
          {status}
        </p>
      )}
      <details className="brief-preview">
        <summary>Preview complete agent instructions</summary>
        <pre>{mandate}</pre>
      </details>
    </section>
  );
}
