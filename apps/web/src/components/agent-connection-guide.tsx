"use client";

import { useState } from "react";
import {
  Check,
  ClipboardCopy,
  Terminal,
  PlugZap,
  ShieldCheck,
  ArrowUpRight,
  Bot,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";

type Host = "codex" | "claude";
const steps = [
  {
    command: "pnpm install --frozen-lockfile",
    label: "Install the pinned project dependencies",
  },
  {
    command: "pnpm agent:connect --check",
    label: "Verify the real MCP server handshake and discover tools",
  },
  {
    command: "pnpm agent:connect --write",
    label: "Generate local host configuration without changing host settings",
  },
];
const hosts: Record<
  Host,
  {
    label: string;
    print: string;
    file: string;
    location: string;
    confirm: string;
  }
> = {
  codex: {
    label: "Codex",
    print: "pnpm agent:connect --print codex",
    file: ".local/agent-connection/codex-prigenfi.toml",
    location:
      "Add the printed [mcp_servers.prigenfi] section to ~/.codex/config.toml or a trusted project config.",
    confirm:
      "Run codex mcp list, restart the host if needed, then inspect /mcp in Codex.",
  },
  claude: {
    label: "Claude Desktop",
    print: "pnpm agent:connect --print claude",
    file: ".local/agent-connection/claude-prigenfi.json",
    location:
      "Merge the printed mcpServers.prigenfi entry into Claude Desktop's existing MCP configuration; do not replace other servers.",
    confirm:
      "Restart Claude Desktop and inspect Connectors or its local MCP server settings.",
  },
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      className="agent-copy"
      aria-label={label}
      onClick={copy}
    >
      {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}{" "}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AgentConnectionGuide() {
  const [host, setHost] = useState<Host>("codex");
  const chosen = hosts[host];
  return (
    <div className="agent-connect-guide">
      <section
        className="agent-connect-intro"
        aria-label="Actual connection capabilities"
      >
        <div>
          <PlugZap size={24} />
          <strong>Local agent tools</strong>
          <span>
            Connect through an MCP-enabled application on your own computer.
          </span>
        </div>
        <div>
          <Bot size={24} />
          <strong>Research and planning</strong>
          <span>
            Discover real public markets and validate confidential-only research
            proposals.
          </span>
        </div>
        <div>
          <LockKeyhole size={24} />
          <strong>No trading permission</strong>
          <span>
            Connecting an agent does not let it sign, move funds, or decrypt
            your wallet.
          </span>
        </div>
      </section>
      <section className="agent-connect-section">
        <p className="ws-kicker">
          <Terminal size={15} /> Connect on your computer
        </p>
        <h2>Start from your PrigenFi checkout</h2>
        <p>
          Use the terminal in the PrigenFi repository after cloning it onto the
          same computer as your MCP host. Commands run locally; this website
          cannot install software or inspect your desktop.
        </p>
        <ol className="agent-connect-steps">
          {steps.map((step, index) => (
            <li key={step.command}>
              <span className="agent-step-number">{index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <div className="agent-command">
                  <code>{step.command}</code>
                  <CopyButton
                    value={step.command}
                    label={"Copy " + step.command}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="agent-connect-section">
        <p className="ws-kicker">
          <PlugZap size={15} /> Choose your agent host
        </p>
        <h2>Add the verified PrigenFi server</h2>
        <fieldset className="agent-host-switch" aria-label="Choose an MCP host">
          {(Object.keys(hosts) as Host[]).map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={host === h}
              onClick={() => setHost(h)}
            >
              {hosts[h].label}
            </button>
          ))}
        </fieldset>
        <p>{chosen.location}</p>
        <div className="agent-command">
          <code>{chosen.print}</code>
          <CopyButton
            value={chosen.print}
            label="Copy host configuration command"
          />
        </div>
        <p className="agent-connect-file">
          Generated template: <code>{chosen.file}</code>
        </p>
        <p>{chosen.confirm}</p>
      </section>
      <section className="agent-connect-section agent-connect-caution">
        <p className="ws-kicker">
          <ShieldCheck size={15} /> Connection versus authorization
        </p>
        <h2>What “connected” really means</h2>
        <p>
          A successful <code>--check</code> verifies one local MCP protocol
          handshake. Only your agent application can show whether it has loaded
          PrigenFi's tools. Neither result proves an authenticated wallet
          connection or a confidential trade venue.
        </p>
        <p>
          When you instruct an external AI host, that host can read the goal you
          send. Public market providers can see the token symbols or addresses
          searched. Never paste wallet secrets, private balances or signing
          credentials into an agent.
        </p>
        <Link href="/privacy" className="ws-text-link">
          Review privacy boundaries <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}
