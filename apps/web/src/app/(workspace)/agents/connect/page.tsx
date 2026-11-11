import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { AgentConnectionGuide } from "@/components/agent-connection-guide";
export const metadata = { title: "Connect an Agent | PrigenFi" };
export default function ConnectAgentPage() {
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Developer and user connection</p>
          <h1>Connect an agent to PrigenFi.</h1>
          <p className="ws-page-subtitle">
            Connect Codex, Claude or another agent to hosted onchain research
            without cloning source code. Add downloadable research skills.
            Trading, signing and confidential execution remain disabled.
          </p>
        </div>
        <span className="ws-source-mark">
          <Radio size={14} /> Hosted MCP & skills
        </span>
      </div>
      <Link href="/agents" className="ws-text-link agent-connect-back">
        <ArrowLeft size={16} /> Back to your agents
      </Link>
      <AgentConnectionGuide />
    </div>
  );
}
