import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Fingerprint,
  LockKeyhole,
  Radio,
  Sparkles,
  Workflow,
} from "lucide-react";
import { MarketLens } from "@/components/market-lens";

const categories = [
  {
    number: "01",
    title: "DeFi & yield",
    detail: "Research lending, liquid staking, pools and protocol exposure.",
    tone: "defi",
    slug: "defi",
  },
  {
    number: "02",
    title: "DEX spot markets",
    detail: "Study ETH and ERC-20 pairs across on-chain liquidity.",
    tone: "spot",
    slug: "spot",
  },
  {
    number: "03",
    title: "Confidential assets",
    detail: "Explore cUSDC, cUSDT, cZAMA and cWETH on Sepolia test rails.",
    tone: "stable",
    slug: "stable",
  },
  {
    number: "04",
    title: "Emerging tokens",
    detail: "Investigate new and meme-token markets with strict risk checks.",
    tone: "meme",
    slug: "meme",
  },
];

export default function Home() {
  return (
    <main id="main" className="marketing-home">
      <section className="marketing-container m-hero">
        <div className="m-hero-copy">
          <p className="m-overline">
            <span className="m-orbit-dot" /> Finance for the age of AI agents
          </p>
          <h1>
            Direct the trade.
            <br />
            <span className="m-serif">Not every</span>
            <br />
            click.
          </h1>
          <p className="m-hero-lead">
            Across the Ethereum ecosystem, tell your agent what you want to
            achieve. Choose your markets, set limits and require confidentiality
            at every future execution step.
          </p>
          <div className="m-hero-actions">
            <Link className="m-primary-cta" href="/agents">
              Create an agent mandate <ArrowUpRight size={19} />
            </Link>
            <Link className="m-secondary-cta" href="/markets">
              Explore Ethereum markets <ArrowRight size={17} />
            </Link>
          </div>
          <div className="m-hero-postscript">
            <span className="m-postscript-line" /> Testnet preview · Research
            and simulation first · No guaranteed returns
          </div>
        </div>
        <MarketLens />
      </section>

      <div className="m-category-rail">
        <div className="marketing-container m-rail-inner">
          <span>One mandate.</span>
          <span>DeFi positions</span>
          <span>DEX liquidity</span>
          <span>Private token markets</span>
          <span>Emerging assets</span>
          <span>Owner-controlled risk</span>
        </div>
      </div>

      <section className="marketing-container m-market-section" id="markets">
        <div className="m-section-heading">
          <span className="m-section-kicker">Across Ethereum</span>
          <div>
            <h2>
              One ecosystem.
              <br />
              Many market moves.
            </h2>
            <p>
              ETH is more than a token. Your agent should understand the markets
              around it—from decentralized exchanges and speculative assets to
              lending and liquid staking.
            </p>
          </div>
        </div>
        <div className="m-markets-grid">
          {categories.map((category) => (
            <Link
              className={"m-market-card " + category.tone}
              key={category.slug}
              href={"/markets?category=" + category.slug}
            >
              <div className="m-market-top">
                <span>{category.number} / Ethereum</span>
                <ArrowUpRight size={20} />
              </div>
              <div>
                <h3>{category.title}</h3>
                <p>{category.detail}</p>
              </div>
              <span className="m-market-tag">Explore markets</span>
            </Link>
          ))}
        </div>
        <p className="m-market-disclosure">
          Market discovery uses public data. Listing a market does not mean
          PrigenFi supports trading it privately or executing it today.
        </p>
      </section>

      <section className="m-workflow-section" id="how-it-works">
        <div className="marketing-container m-workflow-inner">
          <div className="m-workflow-intro">
            <p className="m-section-kicker">The PrigenFi approach</p>
            <h2>Give the agent a mission. Keep the keys.</h2>
            <p>
              AI can be ambitious. Permissions need to be precise. PrigenFi
              separates what an agent wants to do from what your wallet actually
              allows.
            </p>
            <Link href="/agents" className="m-inline-link">
              Start your mandate <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="m-workflow-steps">
            <div>
              <span className="step-index">01</span>
              <div>
                <h3>Describe your edge</h3>
                <p>
                  Describe any Ethereum trading goal in plain language, from
                  portfolio strategies to spot, lending and emerging tokens.
                </p>
              </div>
              <Sparkles size={24} />
            </div>
            <div>
              <span className="step-index">02</span>
              <div>
                <h3>Put boundaries on capital</h3>
                <p>
                  Allocate a separate vault budget. Restrict agent identity,
                  token, recipient, spending and expiry.
                </p>
              </div>
              <Fingerprint size={24} />
            </div>
            <div>
              <span className="step-index">03</span>
              <div>
                <h3>Verify before execution</h3>
                <p>
                  Research and policy simulation precede execution. Live
                  strategy execution and confidential swaps remain in
                  development.
                </p>
              </div>
              <Workflow size={24} />
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-container m-privacy-section" id="privacy">
        <div className="m-privacy-art" aria-hidden="true">
          <div className="m-privacy-disc">
            <LockKeyhole size={64} strokeWidth={1.2} />
            <div className="m-privacy-ring" />
          </div>
          <span className="m-privacy-stamp">Encrypted by design</span>
        </div>
        <div className="m-privacy-copy">
          <p className="m-section-kicker">Zama-powered confidentiality</p>
          <h2>Your portfolio doesn't have to be everyone’s business.</h2>
          <p>
            PrigenFi is integrating confidential balances and transfers through
            Zama. You control when to reveal eligible amounts. We won't pretend
            the entire Ethereum mempool, trade route or cross-chain bridge
            becomes private.
          </p>
          <div className="m-privacy-checks">
            <span>
              <Check size={17} /> cUSDC, cUSDT and cZAMA testnet tools
            </span>
            <span>
              <Check size={17} /> Wallet-authorized decryption
            </span>
            <span>
              <Check size={17} /> Transparent privacy limits
            </span>
          </div>
          <Link className="m-inline-link" href="/privacy">
            Explore private assets <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="marketing-container m-end-section">
        <div>
          <p className="m-section-kicker">For people and their agents</p>
          <h2>The next trade starts with an instruction.</h2>
          <p>
            Create a mandate, explore real Ethereum market information and
            manage the testnet permission tools that will power automated
            strategies.
          </p>
        </div>
        <Link className="m-primary-cta" href="/dashboard">
          Enter the workspace <ArrowUpRight size={19} />
        </Link>
        <div className="m-end-notice">
          <Radio size={17} /> Developer preview. No autonomous or private
          strategy execution or real-fund trading is live.
        </div>
      </section>
    </main>
  );
}
