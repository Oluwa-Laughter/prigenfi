import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChartColumnIncreasing,
  CircleDot,
  Compass,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MarketFeedView } from "@/components/workspace/market-feed";
import { AgentPerformanceCharts } from "@/components/workspace/performance";

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
          <h2>What market should your agent watch next?</h2>
          <p>
            Find opportunities in Ethereum spot markets, meme tokens, DeFi,
            lending and stablecoins. Your agent can research the plan; you
            authorize what actually happens.
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
          <span className="orbit-node orbit-one">MEME</span>
          <span className="orbit-node orbit-two">DEX</span>
          <span className="orbit-node orbit-three">DeFi</span>
          <span className="orbit-node orbit-four">ETH</span>
        </div>
      </section>
      <div className="ws-stat-grid">
        <article className="ws-stat">
          <span>
            <Bot size={18} /> Agent results
          </span>
          <strong>—</strong>
          <small>No verified closed agent trades yet</small>
        </article>
        <article className="ws-stat">
          <span>
            <ChartColumnIncreasing size={18} /> Trading win rate
          </span>
          <strong>—</strong>
          <small>Calculated after settled trades are indexed</small>
        </article>
        <article className="ws-stat">
          <span>
            <CircleDot size={18} /> Realized P&amp;L
          </span>
          <strong>—</strong>
          <small>Not available without verified fills and cost basis</small>
        </article>
        <article className="ws-stat">
          <span>
            <ShieldCheck size={18} /> Execution policy
          </span>
          <strong>Testnet</strong>
          <small>Only restricted ERC-20 transfers currently enabled</small>
        </article>
      </div>
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
            Start with a user-owned vault and restrict which agent can act and
            how much it can spend.
          </p>
          <Link href="/vault">
            Capital and permissions <ArrowRight size={16} />
          </Link>
        </article>
        <article className="ws-guidance">
          <div className="ws-guidance-icon blue">
            <ShieldCheck size={25} />
          </div>
          <h3>Confidential by design</h3>
          <p>
            Explore cUSD and cUSDT through Zama wallet tools on Sepolia—not
            public-market privacy claims.
          </p>
          <Link href="/portfolio">
            See confidential assets <ArrowRight size={16} />
          </Link>
        </article>
      </div>
    </div>
  );
}
