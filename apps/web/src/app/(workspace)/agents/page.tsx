import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Fingerprint,
  KeyRound,
  PlugZap,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { AgentBrief } from "@/components/agent-brief";

export const metadata = { title: "My Agents" };
export default function AgentsPage() {
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Your agent desk</p>
          <h1>Give an agent a mission.</h1>
          <p className="ws-page-subtitle">
            Describe the opportunity in plain language. Permission, capital and
            execution are separate decisions.
          </p>
        </div>
        <span className="ws-source-mark">
          <Radio size={14} /> Mandate draft mode
        </span>
      </div>
      <AgentBrief />
      <section
        className="ws-security-note"
        aria-labelledby="agent-connect-heading"
      >
        <PlugZap size={21} aria-hidden="true" />
        <div>
          <h2 id="agent-connect-heading">Connect an existing AI agent</h2>
          <p>
            Use PrigenFi's verified local MCP research tools in Codex, Claude
            Desktop, or another compatible host. This connects tools, not wallet
            spending rights.
          </p>
          <Link href="/agents/connect" className="ws-text-link">
            Connect your agent <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Your connections</p>
          <h2>Agents & access</h2>
          <p>
            Agent identities must be authorized against your wallet; prompts
            alone don't grant capital rights.
          </p>
        </div>
        <Link href="/settings" className="ws-text-link">
          Understand permissions <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="ws-feature-grid">
        <article className="ws-feature-panel">
          <div className="ws-guidance-icon purple">
            <Bot size={25} />
          </div>
          <h3>Your registered agents</h3>
          <p>
            Hosted agent accounts, user authentication and live trading sessions
            are not yet connected to the website. Developers can use the local
            MCP bridge to give their existing AI hosts real research tools.
          </p>
          <Link href="/strategies">
            Explore agent strategies <ArrowUpRight size={16} />
          </Link>
        </article>
        <article className="ws-feature-panel">
          <div className="ws-guidance-icon peach">
            <KeyRound size={25} />
          </div>
          <h3>On-chain authority</h3>
          <p>
            The testnet vault checks an agent address, permitted token and
            recipient, transaction cap, daily limit, expiry and revocation.
          </p>
          <Link href="/settings">
            Review safeguards <ArrowUpRight size={16} />
          </Link>
        </article>
        <article className="ws-feature-panel">
          <div className="ws-guidance-icon blue">
            <PlugZap size={25} />
          </div>
          <h3>What MCP supports</h3>
          <p>
            The default local MCP server offers public market discovery, typed
            strategy research and confidential-capability checks. Development
            vault simulations are isolated from normal agent hosts.
          </p>
          <Link href="/agents/connect">
            MCP connection guide <ArrowUpRight size={16} />
          </Link>
        </article>
      </div>
      <div className="ws-security-note">
        <ShieldCheck size={18} />
        <p>
          Your wallet remains the authority. A mandate draft never signs
          transactions, deploys contracts, or grants a decryption permit.
        </p>
      </div>
    </div>
  );
}
