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
            Give your local AI agent real market-research tools through MCP.
            Trading permissions and automated confidential execution are not
            connected.
          </p>
        </div>
        <span className="ws-source-mark">
          <Radio size={14} /> Local stdio MCP
        </span>
      </div>
      <Link href="/agents" className="ws-text-link agent-connect-back">
        <ArrowLeft size={16} /> Back to your agents
      </Link>
      <AgentConnectionGuide />
    </div>
  );
}
