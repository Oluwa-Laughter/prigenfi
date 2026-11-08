import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CircleDot,
  Compass,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main id="main" className="site-home">
      <section className="wrap home-hero">
        <div className="home-hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> THE AGENT-NATIVE FINANCE LAYER
          </div>
          <h1>
            Your money.
            <br />
            Your agent.
            <br />
            <span>Your rules.</span>
          </h1>
          <p className="hero-lead">
            Tell your agent which markets to explore. Decide how much it can
            use. PrigenFi is building the private execution layer between your
            instructions and on-chain finance.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Create your agent brief <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
            <Link href="#how-it-works" className="text-cta">
              See how PrigenFi works <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <p className="hero-disclaimer">
            Ethereum Sepolia development · Test assets only · Autonomous trading
            not yet live
          </p>
        </div>
        <div className="hero-stage">
          <div className="stage-topline">
            <span className="stage-light" /> YOUR AGENT WORKSPACE
            <span className="stage-example">EXAMPLE SETUP</span>
          </div>
          <div className="stage-content">
            <div className="stage-heading">
              <span className="stage-icon">
                <Bot size={22} />
              </span>
              <div>
                <strong>New trading mandate</strong>
                <small>Put your intent into a clear set of rules</small>
              </div>
            </div>
            <div className="stage-command-label">YOUR INSTRUCTION</div>
            <div className="stage-prompt">
              “Watch the stablecoin market for opportunities between cUSD and
              cUSDT. Keep each proposed action within my limit and ask before
              committing.”
              <span className="stage-cursor" aria-hidden="true" />
            </div>
            <div className="stage-tags">
              <span>Stablecoins</span>
              <span>Ethereum Sepolia</span>
              <span>Owner approval</span>
            </div>
            <div className="stage-divider" />
            <div className="stage-policy-head">
              <SlidersHorizontal size={17} />
              <strong>Execution boundaries</strong>
              <span>Set by you</span>
            </div>
            <div className="stage-policy-grid">
              <div>
                <small>Capital</small>
                <strong>Allocated by owner</strong>
              </div>
              <div>
                <small>Permission</small>
                <strong>Scoped & revocable</strong>
              </div>
              <div>
                <small>Assets</small>
                <strong>cUSD / cUSDT</strong>
              </div>
              <div>
                <small>Execution</small>
                <strong>Testnet development</strong>
              </div>
            </div>
            <div className="stage-bottom">
              <ShieldCheck size={16} />
              <span>
                Your agent never receives your main wallet's private key.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="wrap product-principles"
        aria-label="Product principles"
      >
        <div>
          <Wallet size={19} />
          <span>You own the capital</span>
        </div>
        <div>
          <Compass size={19} />
          <span>Your agent explores markets</span>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>Policies enforce limits</span>
        </div>
        <div>
          <EyeOff size={19} />
          <span>Confidential assets where supported</span>
        </div>
      </section>

      <section className="wrap home-section" id="how-it-works">
        <div className="section-label">
          <span>01 / THE EXPERIENCE</span>{" "}
          <span>FINANCE THAT FOLLOWS YOUR LEAD</span>
        </div>
        <div className="section-heading-row">
          <h2>
            Give it direction.
            <br />
            <span>Keep the final say.</span>
          </h2>
          <p>
            PrigenFi is designed for agents to do the legwork while you decide
            the market, the available capital and the permissions. Nothing
            should depend on trusting a prompt alone.
          </p>
        </div>
        <div className="journey-grid">
          <article className="journey-card">
            <span className="journey-number">01</span>
            <Compass size={26} />
            <h3>Pick your market</h3>
            <p>
              Stablecoins, ETH and ERC-20 opportunities. Describe what you want
              your agent to look for.
            </p>
            <span className="journey-meta">Your strategy, your intent</span>
          </article>
          <article className="journey-card">
            <span className="journey-number">02</span>
            <KeyRound size={26} />
            <h3>Give limited access</h3>
            <p>
              Assign an agent identity, allocate vault capital and set token,
              recipient and spending limits.
            </p>
            <span className="journey-meta">Revocable permissions</span>
          </article>
          <article className="journey-card">
            <span className="journey-number">03</span>
            <Workflow size={26} />
            <h3>Review every move</h3>
            <p>
              Let agent tools research and propose actions. See the decision and
              policy outcome before execution.
            </p>
            <span className="journey-meta">Simulation available today</span>
          </article>
        </div>
      </section>

      <section className="wrap privacy-stage" id="privacy">
        <div className="privacy-stage-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> ZAMA-POWERED CONFIDENTIAL ASSETS
          </div>
          <h2>
            More control.
            <br />
            <span>Less exposure.</span>
          </h2>
          <p>
            Work toward private asset balances and transfers with Zama's
            encrypted token infrastructure. Our initial focus is stablecoins—not
            broadcasting everything your wallet holds.
          </p>
          <p className="privacy-footnote">
            On Sepolia, cUSD and cUSDT are product-facing labels for unbacked
            test wrappers. Wallet addresses, timing and public shield/unshield
            amounts remain visible. Confidential agent-directed swaps are not
            yet implemented.
          </p>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard#confidential">
              Explore private assets <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="asset-showcase">
          <div className="asset-showcase-heading">
            <span>ASSET UNIVERSE</span>
            <span>DEVELOPMENT</span>
          </div>
          <div className="asset-line">
            <span className="coin coin-usd">$</span>
            <div>
              <strong>cUSD</strong>
              <small>USDC-based confidential test asset</small>
            </div>
            <span className="asset-status">Sepolia</span>
          </div>
          <div className="asset-line">
            <span className="coin coin-usdt">₮</span>
            <div>
              <strong>cUSDT</strong>
              <small>USDT-based confidential test asset</small>
            </div>
            <span className="asset-status">Sepolia</span>
          </div>
          <div className="asset-line">
            <span className="coin coin-eth">Ξ</span>
            <div>
              <strong>ETH / ERC-20</strong>
              <small>Public asset support, broader markets planned</small>
            </div>
            <span className="asset-status muted-status">Planned</span>
          </div>
          <div className="asset-caption">
            <LockKeyhole size={15} /> Confidentiality depends on the asset and
            execution route.
          </div>
        </div>
      </section>

      <section className="wrap home-section mcp-section" id="agent-mcp">
        <div className="section-label">
          <span>02 / BUILT FOR AGENTS</span>{" "}
          <span>ONE INTERFACE · MANY AGENTS</span>
        </div>
        <div className="mcp-layout">
          <div>
            <div className="mcp-symbol">
              <Bot size={27} />
            </div>
            <h2>
              Bring your own agent.
              <br />
              <span>Give it boundaries.</span>
            </h2>
            <p>
              PrigenFi's Model Context Protocol tools let compatible AI agents
              inspect authorized wallet state, read permissions and prepare
              structured proposals. The wallet and policy layer—not the agent's
              words—decide what is allowed.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard#agent-brief">
                Set up an agent brief <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="mcp-example">
            <div className="mcp-example-head">
              <CircleDot size={15} /> AGENT TOOL FLOW <span>LOCAL MVP</span>
            </div>
            <div>
              <span className="mcp-index">01</span>
              <strong>Understand the mandate</strong>
              <small>Selected market, asset and limits</small>
            </div>
            <div>
              <span className="mcp-index">02</span>
              <strong>Read allowed wallet state</strong>
              <small>MCP tools scoped to an agent identity</small>
            </div>
            <div>
              <span className="mcp-index">03</span>
              <strong>Simulate a proposal</strong>
              <small>Current MVP: restricted public-token transfers</small>
            </div>
            <div>
              <span className="mcp-index">04</span>
              <strong>Owner-controlled execution</strong>
              <small>Confidential trading venue integration is pending</small>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap home-finale">
        <div className="eyebrow">
          <span className="eyebrow-dot" /> THE NEXT WAY TO DIRECT CAPITAL
        </div>
        <h2>
          Give your agent a goal.
          <br />
          Stay in charge of the outcome.
        </h2>
        <p>
          Start shaping your market mandate and explore the testnet tools behind
          private agent finance.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">
            Enter the workspace <ArrowUpRight size={17} />
          </Link>
        </Button>
        <div className="finale-note">
          <Check size={15} /> Testnet only, without profit guarantees or live
          autonomous trading
        </div>
      </section>
    </main>
  );
}
