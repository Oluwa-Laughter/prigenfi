"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Check,
  ClipboardCopy,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { publicMarketNetworks } from "@prigenfi/shared/market-research";
import {
  assessConfidentialTrade,
  confidentialMandateSchema,
  type ConfidentialMandate,
} from "@prigenfi/shared/confidential-policy";

type Market =
  | "All Ethereum markets"
  | "DEX spot"
  | "DeFi lending"
  | "Staking & liquidity"
  | "Stablecoins"
  | "Meme tokens"
  | "Perpetuals";
const templates: Record<
  string,
  { market: Market; assets: string; instruction: string }
> = {
  all: {
    market: "All Ethereum markets",
    assets: "ETH, ERC-20, cUSDC, cUSDT, cZAMA and eligible markets",
    instruction:
      "Research the Ethereum ecosystem for risk-adjusted opportunities across decentralized exchanges, DeFi and token markets. Explain trade-offs and propose only strategies that can preserve confidential execution. Never route a transaction publicly.",
  },
  spot: {
    market: "DEX spot",
    assets: "ETH / ERC-20 / cWETH",
    instruction:
      "Research ETH and ERC-20 spot liquidity, expected slippage and venue risk. Report only routes with verified confidential execution; otherwise explain why a private trade is unavailable.",
  },
  defi: {
    market: "DeFi lending",
    assets: "cUSDC / cUSDT / ETH markets",
    instruction:
      "Compare lending collateral, borrow rates, liquidation risk and protocol dependency. Propose only strategies compatible with enforced confidential execution.",
  },
  staking: {
    market: "Staking & liquidity",
    assets: "cZAMA / cWETH and staking markets",
    instruction:
      "Examine staking and liquidity pools, yields, impermanent loss and withdrawal conditions. Do not offer a public trade as a private option.",
  },
  stable: {
    market: "Stablecoins",
    assets: "cUSDC / cUSDT",
    instruction:
      "Monitor stablecoin liquidity, depeg risk and opportunities. Only propose a transaction if a confidential venue and strict wallet policy have been verified.",
  },
  meme: {
    market: "Meme tokens",
    assets: "Ethereum emerging tokens",
    instruction:
      "Research token contracts, holder concentration, pool liquidity and safety risks. Report any unsupported privacy guarantees and do not trade publicly.",
  },
  perps: {
    market: "Perpetuals",
    assets: "ETH and eligible derivatives",
    instruction:
      "Research funding, volatility, margin and liquidation risk. Leverage and derivatives execution are unavailable; do not submit orders.",
  },
};
const marketDomain: Record<Market, ConfidentialMandate["market"]> = {
  "All Ethereum markets": "portfolio",
  "DEX spot": "spot",
  "DeFi lending": "defi",
  "Staking & liquidity": "staking",
  Stablecoins: "stablecoins",
  "Meme tokens": "emerging-tokens",
  Perpetuals: "derivatives",
};
const markets: Market[] = [
  "All Ethereum markets",
  "DEX spot",
  "DeFi lending",
  "Staking & liquidity",
  "Stablecoins",
  "Meme tokens",
  "Perpetuals",
];
export function AgentBrief() {
  const [market, setMarket] = useState<Market>("All Ethereum markets");
  const [assets, setAssets] = useState("");
  const [limit, setLimit] = useState("");
  const [instruction, setInstruction] = useState("");
  const [researchNetwork, setResearchNetwork] = useState("all");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("strategy");
    const template = id ? templates[id] : undefined;
    if (template) {
      setMarket(template.market);
      setAssets(template.assets);
      setInstruction(template.instruction);
    }
  }, []);
  const draft = {
    market: marketDomain[market],
    instruction,
    watchAssets: assets,
    suggestedCapitalLimit: limit,
    privacy: "confidential-only" as const,
  };
  const valid = confidentialMandateSchema.safeParse(draft).success;
  const readiness = assessConfidentialTrade(draft);
  const mandate = [
    "PRIGENFI — CONFIDENTIAL AGENT MANDATE / RESEARCH DRAFT",
    "Public research scope: " +
      (researchNetwork === "all"
        ? publicMarketNetworks.map((network) => network.name).join(", ")
        : publicMarketNetworks.find((network) => network.id === researchNetwork)
            ?.name),
    "Real private agent execution: NOT AVAILABLE; supported Sepolia testnet wallet assets only",
    "Strategy universe: " + market,
    "Watch assets or venues: " + assets.trim(),
    "Owner-suggested maximum exposure: " +
      limit +
      " test units (NOT an on-chain permission)",
    "Execution privacy: CONFIDENTIAL ONLY — NEVER fall back to a public trade or route.",
    "Owner instruction: " + instruction.trim(),
    "Required: validate protocol/venue support, account authorization, token mapping, price data, liquidity, contract and slippage risks before any proposed action.",
    "Current readiness: NO VERIFIED CONFIDENTIAL SWAP VENUE; execution prohibited.",
    "No spending, signing, decryption, bridging or private order submission is authorized by these instructions.",
    "This text remains in your browser until you explicitly copy it. A copied draft is not an active agent.",
  ].join("\n");
  async function copy() {
    if (!valid) return;
    try {
      await navigator.clipboard.writeText(mandate);
      setFeedback(
        "Private-only research mandate copied. No permissions were granted and no trading agent was started.",
      );
    } catch {
      setFeedback(
        "Clipboard access is blocked. Expand the preview to copy the mandate.",
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
          <p className="ws-kicker">
            <Bot size={15} /> Agent instructions
          </p>
          <h2 id="agent-brief-title">
            Tell your agent what you want to achieve.
          </h2>
          <p>
            Write your own objective and choose the ecosystems to study. Your
            agent host can interpret the goal through MCP, but no model can
            grant itself access to your money.
          </p>
        </div>
        <span className="brief-chip">
          <LockKeyhole size={14} /> Privacy required
        </span>
      </div>
      <div className="brief-form-grid">
        <label className="brief-field">
          <span>Market scope</span>
          <select
            value={market}
            onChange={(e) => {
              const next = e.target.value as Market;
              const template = Object.values(templates).find(
                (t) => t.market === next,
              );
              setMarket(next);
              if (template) {
                setAssets(template.assets);
                setInstruction(template.instruction);
              }
              setFeedback("");
            }}
          >
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="brief-field">
          <span>Public research networks</span>
          <select
            value={researchNetwork}
            onChange={(event) => setResearchNetwork(event.target.value)}
          >
            <option value="all">All listed EVM markets (research)</option>
            {publicMarketNetworks.map((network) => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
        </label>
        <label className="brief-field">
          <span>Tokens or venues to research</span>
          <input
            value={assets}
            placeholder="Specify assets, tokens or addresses to research"
            maxLength={90}
            onChange={(e) => {
              setAssets(e.target.value);
              setFeedback("");
            }}
          />
        </label>
        <label className="brief-field">
          <span>
            Owner's research capital ceiling (test units; never an allowance)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            max="1000000000"
            value={limit}
            placeholder="Enter your own limit"
            onChange={(e) => {
              setLimit(e.target.value);
              setFeedback("");
            }}
          />
        </label>
        <label className="brief-field brief-span">
          <span>Describe your goal in your own words</span>
          <textarea
            value={instruction}
            maxLength={1200}
            onChange={(e) => {
              setInstruction(e.target.value);
              setFeedback("");
            }}
            placeholder="Research opportunities across Ethereum. Only propose confidential strategies that respect my limits and explain the risks…"
          />
        </label>
      </div>
      <div className="privacy-readiness" role="status">
        <ShieldAlert size={20} />
        <div>
          <strong>
            {valid && readiness.acceptedAsResearch
              ? "Research mandate ready. Confidential execution is not yet available."
              : "Complete the mandate to check its research scope."}
          </strong>
          <p>
            Private-only is mandatory. No verified confidential trading venue or
            unattended execution is connected. A standard DEX swap must never be
            used as a fallback.
          </p>
        </div>
      </div>
      <div className="brief-bottom">
        <p>
          <Sparkles size={17} /> Your goal stays on this device until you copy
          it. A connected MCP-enabled agent host can interpret the goal you
          voluntarily share; this page does not run an AI model or save trading
          sessions.
        </p>
        <div className="brief-actions">
          <Link href="/privacy">
            See privacy guarantees <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            className="ws-pill-button"
            disabled={!valid}
            onClick={copy}
          >
            {feedback.startsWith("Private-only") ? (
              <Check size={16} />
            ) : (
              <ClipboardCopy size={16} />
            )}{" "}
            Copy private mandate
          </button>
        </div>
      </div>
      {feedback && (
        <p className="brief-alert" role="status">
          {feedback}
        </p>
      )}
      <details className="brief-preview">
        <summary>Preview the complete confidential mandate</summary>
        <pre>{mandate}</pre>
      </details>
    </section>
  );
}
