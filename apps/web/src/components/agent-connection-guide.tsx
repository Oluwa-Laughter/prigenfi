"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardCopy,
  Globe2,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import skillIndex from "../../public/skills/index.json";

type Host = "codex" | "claude" | "other";
type ConnectionStatus = {
  publicResearch: {
    enabled: boolean;
    endpoint: string | null;
    authentication: string;
  };
  walletScopedResearch: {
    enabled: boolean;
    endpoint: string | null;
    authentication: string;
  };
  executionAllowed: false;
};
const localCommands = [
  {
    label: "Install the project's pinned dependencies",
    command: "pnpm install --frozen-lockfile",
  },
  {
    label: "Verify the local MCP handshake",
    command: "pnpm agent:connect --check",
  },
  {
    label: "Generate your existing host's local configuration",
    command: "pnpm agent:connect --write",
  },
] as const;
function CopyButton({
  value,
  label,
  disabled,
}: {
  value: string;
  label: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
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
      disabled={disabled || !value}
      onClick={() => void copy()}
    >
      {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
function Command({ code, label }: { code: string; label: string }) {
  return (
    <div className="agent-command">
      <code>{code}</code>
      <CopyButton value={code} label={label} />
    </div>
  );
}
export function AgentConnectionGuide() {
  const [host, setHost] = useState<Host>("codex");
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    const controller = new AbortController();
    fetch("/api/mcp/connect", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Connection status unavailable");
        return response.json() as Promise<ConnectionStatus>;
      })
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);
  const publicUrl = status?.publicResearch.enabled
    ? status.publicResearch.endpoint
    : null;
  const scopedUrl = status?.walletScopedResearch.enabled
    ? status.walletScopedResearch.endpoint
    : null;
  const publicCodex = publicUrl
    ? `codex mcp add prigenfi-public --url ${publicUrl}`
    : "";
  const ownerCodex = scopedUrl
    ? `codex mcp add prigenfi-profile --url ${scopedUrl} --bearer-token-env-var PRIGENFI_MCP_TOKEN`
    : "";
  return (
    <div className="agent-connect-guide">
      <section
        className="agent-connect-intro"
        aria-label="Agent connection capabilities"
      >
        <div>
          <Globe2 size={24} />
          <strong>No repository checkout</strong>
          <span>
            Connect your existing AI host to a deployed PrigenFi research
            endpoint.
          </span>
        </div>
        <div>
          <BookOpen size={24} />
          <strong>Portable agent skills</strong>
          <span>
            Install small, readable research playbooks directly from this site.
          </span>
        </div>
        <div>
          <LockKeyhole size={24} />
          <strong>Your wallet stays yours</strong>
          <span>
            Public and profile-scoped MCP tools cannot sign, decrypt or trade.
          </span>
        </div>
      </section>

      <section
        className="agent-connect-section agent-hosted-section"
        aria-labelledby="hosted-research-heading"
      >
        <p className="ws-kicker">
          <PlugZap size={15} /> Hosted MCP · no install
        </p>
        <h2 id="hosted-research-heading">One endpoint. Your own agent.</h2>
        <p>
          Use PrigenFi with an existing MCP-compatible host, without installing
          Node or cloning the PrigenFi source. Public research can read live,
          sourced crypto market observations; it cannot trade or access wallets.
        </p>
        <fieldset className="agent-host-switch" aria-label="Choose an MCP host">
          {(["codex", "claude", "other"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={host === item}
              onClick={() => setHost(item)}
            >
              {item === "codex"
                ? "Codex"
                : item === "claude"
                  ? "Claude"
                  : "Other MCP hosts"}
            </button>
          ))}
        </fieldset>
        <div className="agent-live-status" role="status" aria-live="polite">
          <span
            className={
              publicUrl ? "agent-status-dot is-active" : "agent-status-dot"
            }
          />
          <span>
            {!loaded
              ? "Checking this deployment's MCP configuration…"
              : publicUrl
                ? "Public research endpoint configured for this deployment"
                : "Public hosted research is not enabled on this deployment yet"}
          </span>
        </div>
        {publicUrl ? (
          <>
            <p className="agent-connect-inline-label">MCP server URL</p>
            <Command code={publicUrl} label="Copy public research MCP URL" />
            {host === "codex" ? (
              <>
                <p>
                  Run this in your terminal to register the public research
                  server with Codex:
                </p>
                <Command
                  code={publicCodex}
                  label="Copy Codex remote MCP command"
                />
                <p>
                  Open Codex and verify with{" "}
                  <code>codex mcp get prigenfi-public</code> or{" "}
                  <code>/mcp</code>.
                </p>
              </>
            ) : host === "claude" ? (
              <p>
                In Claude, open{" "}
                <strong>Customize → Connectors → Add custom connector</strong>,
                paste the URL above and choose <strong>No sign in</strong> for
                public research. Check that the connector exposes only read-only
                tools.
              </p>
            ) : (
              <p>
                Add the URL as a <strong>Streamable HTTP MCP</strong> server in
                your client's remote-connector settings. No API key is needed
                for this public research service.
              </p>
            )}
          </>
        ) : (
          <p className="agent-connect-unavailable">
            The public endpoint is deliberately disabled until the PrigenFi
            operator provisions database-backed quotas and enables it. There is
            no fake connection button or unauthenticated trading fallback. The
            research tools on the website remain available independently.
          </p>
        )}
      </section>

      <section
        className="agent-connect-section"
        aria-labelledby="owner-profile-heading"
      >
        <p className="ws-kicker">
          <ShieldCheck size={15} /> Wallet-scoped research
        </p>
        <h2 id="owner-profile-heading">
          Private research profile. No private balance access.
        </h2>
        <p>
          To restrict your agent's research networks and market categories, sign
          in with your wallet on My agents, create a research profile, and issue
          a one-time access key. The server checks the saved scope and
          revocation on every request.
        </p>
        <Link href="/agents" className="ws-text-link">
          Manage your research agents <ArrowUpRight size={16} />
        </Link>
        <div className="agent-live-status" role="status">
          <span
            className={
              scopedUrl ? "agent-status-dot is-active" : "agent-status-dot"
            }
          />
          {scopedUrl
            ? "Wallet-scoped MCP is configured for this deployment"
            : "Wallet-scoped hosted MCP is not enabled here"}
        </div>
        {scopedUrl ? (
          <>
            <p className="agent-connect-inline-label">
              Owner-scoped MCP server URL
            </p>
            <Command code={scopedUrl} label="Copy owner-scoped MCP URL" />
            {host === "codex" ? (
              <>
                <p>
                  After creating a key, store it in your host's secure
                  environment as <code>PRIGENFI_MCP_TOKEN</code>. Never paste
                  the token directly into this command:
                </p>
                <Command
                  code={ownerCodex}
                  label="Copy owner-scoped Codex MCP command"
                />
              </>
            ) : host === "claude" ? (
              <p>
                For a custom Claude remote connector, set the URL above and add{" "}
                <code>Authorization: Bearer &lt;your-issued-key&gt;</code>{" "}
                through its trusted <strong>Request headers</strong>{" "}
                configuration. Do not put the token in the URL or a chat
                message.
              </p>
            ) : (
              <p>
                Supply the owner-issued key as an{" "}
                <code>Authorization: Bearer …</code> HTTP header from your
                host's secrets configuration. Never embed it in source code,
                prompts, URLs or logs.
              </p>
            )}
          </>
        ) : (
          <p className="agent-connect-unavailable">
            This is an optional owner-authenticated feature. Profile creation
            needs a configured account service; key issuance remains disabled
            until the hosted MCP operator explicitly enables it.
          </p>
        )}
      </section>

      <section
        className="agent-connect-section"
        aria-labelledby="agent-skills-heading"
      >
        <p className="ws-kicker">
          <BookOpen size={15} /> Open agent skills
        </p>
        <h2 id="agent-skills-heading">Research skills your agent can read.</h2>
        <p>
          Download an Agent Skills-standard <code>SKILL.md</code> and add it to
          your host's skill directory. No PrigenFi repository clone, wallet
          secret or executable installation script is required. A skill is a set
          of instructions; it doesn't start an agent or grant financial
          permissions.
        </p>
        <div className="agent-skill-grid">
          {skillIndex.skills.map((skill) => (
            <article className="agent-skill-card" key={skill.name}>
              <BookOpen size={22} aria-hidden="true" />
              <strong>{skill.title}</strong>
              <p>{skill.description}</p>
              <div className="agent-skill-actions">
                <a href={skill.path} download="SKILL.md">
                  Get SKILL.md <ArrowUpRight size={15} />
                </a>
                <CopyButton
                  value={origin ? origin + skill.path : ""}
                  label={`Copy ${skill.title} skill URL`}
                  disabled={!origin}
                />
              </div>
            </article>
          ))}
        </div>
        <p>
          In Codex, add the downloaded file to{" "}
          <code>~/.agents/skills/&lt;skill-name&gt;/SKILL.md</code>; in other
          hosts use their documented skill directory or URL-based skill loader.
          Review every skill's instructions before using it.{" "}
          <a href="/skills/index.json" className="ws-text-link">
            View the skill catalog <ArrowUpRight size={15} />
          </a>
        </p>
      </section>

      <details className="agent-connect-section agent-local-details">
        <summary>
          <Terminal size={18} /> Maintainers: local stdio MCP from source
        </summary>
        <p>
          The original local MCP workflow remains available for developers
          working on PrigenFi itself. Ordinary users do not need it. This
          workflow runs only on your machine and is different from the hosted
          service.
        </p>
        <ol className="agent-connect-steps">
          {localCommands.map(({ command, label }, index) => (
            <li key={command}>
              <span className="agent-step-number">{index + 1}</span>
              <div>
                <strong>{label}</strong>
                <Command code={command} label={`Copy ${command}`} />
              </div>
            </li>
          ))}
        </ol>
      </details>

      <section className="agent-connect-section agent-connect-caution">
        <p className="ws-kicker">
          <LockKeyhole size={15} /> What an agent can and can't see
        </p>
        <h2>Research is not permission to trade.</h2>
        <p>
          An external AI host can read a research goal you choose to share.
          Public market-data providers see queried token symbols or contract
          addresses. Do not send wallet credentials, decrypted balances or
          private investment instructions to those providers. A connected MCP
          server does not prove a private trading venue or authorize a wallet
          transaction.
        </p>
        <Link href="/privacy" className="ws-text-link">
          Understand confidential execution limits <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}
