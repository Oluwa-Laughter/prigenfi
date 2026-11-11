import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Compass,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MarketFeedView } from "@/components/workspace/market-feed";
import { AgentPerformanceCharts } from "@/components/workspace/performance";
import { WorkspaceOverview } from "@/components/workspace/overview-state";

export const metadata = { title: "Overview" };
export default function Overview() {
  return (
    <div className="workspace-page overview-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Your command center</p>
          <h1>Make your agent work for you.</h1>
          <p className="ws-page-subtitle">
            Build a market mandate, keep control of your capital, and follow the
            data behind every decision.
          </p>
        </div>
        <Link className="ws-pill-button" href="/agents">
          New agent mandate <ArrowUpRight size={17} />
        </Link>
      </div>
      <section className="ws-command-hero">
        <div>
          <span className="ws-command-pill">
            <Sparkles size={15} /> Start here
          </span>
          <h2>What should your agent do next?</h2>
          <p>
            Direct a strategy across Ethereum: DeFi, spot markets, confidential
            assets and emerging tokens. Privacy is a mandatory execution
            condition; you control the capital.
          </p>
          <div className="ws-command-links">
            <Link className="ws-command-primary" href="/agents">
              Write a mandate <ArrowUpRight size={16} />
            </Link>
            <Link href="/markets">
              Browse live market pairs <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="ws-command-orbit" aria-hidden="true">
          <span className="orbit-center">
            <Bot size={39} />
          </span>
          <span className="orbit-node orbit-one">DeFi</span>
          <span className="orbit-node orbit-two">Spot</span>
          <span className="orbit-node orbit-three">FHE</span>
          <span className="orbit-node orbit-four">ETH</span>
        </div>
      </section>
      <WorkspaceOverview />
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Ethereum mainnet signals</p>
          <h2>Market watch</h2>
          <p>
            Real external pool data, separate from the testnet execution
            environment.
          </p>
        </div>
        <Link href="/markets" className="ws-text-link">
          Full market explorer <ArrowUpRight size={16} />
        </Link>
      </div>
      <MarketFeedView compact />
      <AgentPerformanceCharts trades={[]} />
      <div className="ws-bottom-grid">
        <article className="ws-guidance">
          <div className="ws-guidance-icon purple">
            <Compass size={25} />
          </div>
          <h3>Find an angle</h3>
          <p>
            Study liquidity and emerging Ethereum pairs before you put capital
            at risk.
          </p>
          <Link href="/strategies">
            Explore strategies <ArrowRight size={16} />
          </Link>
        </article>
        <article className="ws-guidance">
          <div className="ws-guidance-icon peach">
            <LockKeyhole size={25} />
          </div>
          <h3>Separate the capital</h3>
          <p>
            Set the agent's scope and risk limits. Wallet-based permissions must
            approve execution independently of the AI's instructions.
          </p>
          <Link href="/settings">
            Explore account safeguards <ArrowRight size={16} />
          </Link>
        </article>
        <article className="ws-guidance">
          <div className="ws-guidance-icon blue">
            <ShieldCheck size={25} />
          </div>
          <h3>Confidential by design</h3>
          <p>
            Explore cUSDC, cUSDT, cZAMA and cWETH through Zama wallet tools on
            Sepolia—not public-market privacy claims.
          </p>
          <Link href="/portfolio">
            See confidential assets <ArrowRight size={16} />
          </Link>
        </article>
      </div>
    </div>
  );
}
