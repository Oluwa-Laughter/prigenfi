import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  Coins,
  Flame,
  Layers2,
  ShieldCheck,
  Waves,
  Zap,
} from "lucide-react";

export const metadata = { title: "Strategies" };
const strategies = [
  {
    id: "all",
    name: "Across Ethereum",
    kind: "Adaptive market research",
    icon: Bot,
    text: "Set a broad objective and let your agent investigate opportunities across eligible DeFi, spot, staking and token markets.",
    risk: "Market-dependent",
    hue: "purple",
  },
  {
    id: "defi",
    name: "DeFi lending",
    kind: "Capital markets",
    icon: Layers2,
    text: "Research lending rates, collateral, liquidation and protocol risks, with confidential execution required.",
    risk: "High",
    hue: "blue",
  },
  {
    id: "spot",
    name: "Spot & DEX markets",
    kind: "Trading liquidity",
    icon: ChartNoAxesCombined,
    text: "Research Ethereum liquidity, slippage and venue safety before seeking a verified confidential route.",
    risk: "High",
    hue: "purple",
  },
  {
    id: "stable",
    name: "Confidential assets",
    kind: "Zama asset opportunities",
    icon: Coins,
    text: "Study cUSDC, cUSDT, cZAMA and eligible confidential wrappers. Private swaps require a verified venue.",
    risk: "Varies",
    hue: "lilac",
  },
  {
    id: "staking",
    name: "Staking & liquidity",
    kind: "Yield research",
    icon: Waves,
    text: "Explore liquid staking and pools, including impermanent loss, reward and withdrawal risk.",
    risk: "High",
    hue: "peach",
  },
  {
    id: "meme",
    name: "Emerging tokens",
    kind: "Speculative research",
    icon: Flame,
    text: "Research new and meme-token pairs, holders, liquidity and contract risks. Never bypass privacy requirements.",
    risk: "Extreme",
    hue: "peach",
  },
  {
    id: "perps",
    name: "Perpetual markets",
    kind: "Advanced research",
    icon: Zap,
    text: "Investigate funding rates, leverage, collateral and liquidation. This route is not executable.",
    risk: "Very high",
    hue: "blue",
  },
];
export default function StrategiesPage() {
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Mandate blueprints</p>
          <h1>Different markets. Different rules.</h1>
          <p className="ws-page-subtitle">
            Start an agent mandate around a market idea. These templates are
            research prompts, not profitable or executable strategies.
          </p>
        </div>
      </div>
      <div className="strategy-grid">
        {strategies.map((s) => (
          <article key={s.id} className="strategy-tile">
            <div className="strategy-tile-top">
              <div className={"ws-guidance-icon " + s.hue}>
                <s.icon size={26} />
              </div>
              <span className="strategy-risk">{s.risk} risk</span>
            </div>
            <p className="strategy-kind">{s.kind}</p>
            <h2>{s.name}</h2>
            <p className="strategy-text">{s.text}</p>
            <div className="strategy-tile-footer">
              <span>Research first · No auto-execution</span>
              <Link href={"/agents?strategy=" + s.id}>
                Create mandate <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="ws-security-note">
        <ShieldCheck size={18} />
        <p>
          Trading meme tokens, lending, staking and perps on a public Ethereum
          venue is not confidential by default. PrigenFi will enable private
          execution only where the underlying Zama-compatible protocol supports
          it and the user's policy permits it.
        </p>
      </div>
    </div>
  );
}
