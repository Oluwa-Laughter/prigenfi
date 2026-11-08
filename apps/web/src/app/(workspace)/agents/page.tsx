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
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Your connections</p>
          <h2>Agents & access</h2>
          <p>
            Agent identities must be authorized against your wallet; prompts
            alone don't grant capital rights.
          </p>
        </div>
        <Link href="/vault" className="ws-text-link">
          Manage vault permissions <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="ws-feature-grid">
        <article className="ws-feature-panel">
          <div className="ws-guidance-icon purple">
            <Bot size={25} />
          </div>
          <h3>Your registered agents</h3>
          <p>
            There is no authenticated agent registry or durable session store in
            this release. Connect an agent using the local development MCP
            integration, then authorize its address separately.
          </p>
          <Link href="/docs">
            Developer MCP instructions <ArrowUpRight size={16} />
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
          <Link href="/vault">
            Open policy controls <ArrowUpRight size={16} />
          </Link>
        </article>
        <article className="ws-feature-panel">
          <div className="ws-guidance-icon blue">
            <PlugZap size={25} />
          </div>
          <h3>What MCP supports</h3>
          <p>
            Existing local tools expose scoped reads and simulated proposals.
            Remote OAuth, unattended trade execution and confidential swaps are
            not live.
          </p>
          <Link href="/activity">
            Understand activity <ArrowUpRight size={16} />
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
