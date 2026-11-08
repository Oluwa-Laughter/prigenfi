import Link from "next/link";
import {
  ArrowUpRight,
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
    id: "meme",
    name: "Meme momentum",
    kind: "High volatility",
    icon: Flame,
    text: "Research new pools, momentum shifts, holder concentration, token safety and exit liquidity.",
    risk: "Extreme",
    hue: "peach",
  },
  {
    id: "spot",
    name: "DEX spot execution",
    kind: "Liquidity-led",
    icon: ChartNoAxesCombined,
    text: "Compare Ethereum token pairs, venue liquidity, estimated slippage and price impact.",
    risk: "High",
    hue: "purple",
  },
  {
    id: "defi",
    name: "DeFi lending",
    kind: "Protocol exposure",
    icon: Layers2,
    text: "Study supply/borrow rates, collateral risk, utilization and protocol dependency.",
    risk: "High",
    hue: "blue",
  },
  {
    id: "stable",
    name: "Stablecoin opportunities",
    kind: "Confidential asset research",
    icon: Coins,
    text: "Investigate stablecoin market opportunities; cUSD/cUSDT private swaps require a compatible venue.",
    risk: "Varies",
    hue: "lilac",
  },
  {
    id: "staking",
    name: "Staking and liquidity",
    kind: "Yield research",
    icon: Waves,
    text: "Analyze liquid staking and LP strategies, including rewards, withdrawal and smart-contract risks.",
    risk: "High",
    hue: "peach",
  },
  {
    id: "perps",
    name: "Perpetual markets",
    kind: "Advanced research",
    icon: Zap,
    text: "Research funding rates, leverage, collateral and liquidation paths. Execution is not supported.",
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
