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
import { AgentAccounts } from "@/components/workspace/agent-accounts";

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
      <AgentAccounts />
      <section
        className="ws-security-note"
        aria-labelledby="agent-connect-heading"
      >
        <PlugZap size={21} aria-hidden="true" />
        <div>
          <h2 id="agent-connect-heading">Connect an existing AI agent</h2>
          <p>
            Connect Codex, Claude or another compatible host directly to hosted
            read-only research, when enabled. No source checkout is needed. Add
            portable Agent Skills to guide the workflow. This does not grant
            wallet spending rights.
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
          <h3>Authenticated research profiles</h3>
          <p>
            A wallet-verified session can save scoped research profiles when the
            database is configured. This is not proof that the AI host is online
            or that the wallet has authorized financial execution.
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
            Hosted MCP offers scoped or public crypto-market research when
            enabled. Downloadable skills help agents use real source-stamped
            findings, with no signing or trading tools.
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
