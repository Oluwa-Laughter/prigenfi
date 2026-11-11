import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "PrigenFi Developer Tools" };
export default function Docs() {
  return (
    <main id="main" className="wrap">
      <article className="docs">
        <h1>Build agents with real capabilities.</h1>
        <p>
          Connect an existing MCP-enabled AI host to PrigenFi's live, public EVM
          market-research tools and strictly validated confidential-only
          planning. Private trades, smart-account sessions and autonomous
          investments are not enabled.
        </p>
        <h2>Hosted MCP — no repo clone</h2>
        <p>
          PrigenFi has a hosted read-only research endpoint that operators can
          enable after configuring persistent global rate limits. Connect an
          existing AI host by URL, with no local server or dependencies. The
          wallet-scoped remote endpoint uses a revocable, owner-issued research
          key for network and market restrictions. Both features are optional
          and disabled until securely configured for a deployment.
        </p>
        <p>
          Open the <Link href="/agents/connect">connection desk</Link> for the
          actual endpoint status, copyable Codex setup, Claude connector
          instructions and three downloadable Agent Skills-standard files.
        </p>
        <pre className="code-panel">{`# Example only — use the actual enabled URL shown in your connection desk
codex mcp add prigenfi-public --url https://YOUR_PRIGENFI_DOMAIN/api/mcp/public`}</pre>
        <p>
          The public MCP has five research/availability tools, never keys or
          signing operations. The scoped endpoint requires an owner-approved
          profile and a one-time access key. Public tools may contact DEX
          Screener and disclose the searched public symbols or addresses.
        </p>
        <h2>Install a research skill directly</h2>
        <p>
          Pick an instruction-only workflow for onchain market diligence, DeFi
          risk screening or confidentiality readiness from the{" "}
          <Link href="/agents/connect">skill library</Link>. Download a plain
          <code>SKILL.md</code> to your AI host's supported skills directory; no
          repository cloning is needed. The public catalog is at
          <a href="/skills/index.json"> /skills/index.json</a>.
        </p>
        <h2>Local source setup for maintainers</h2>
        <pre className="code-panel">
          {
            "pnpm install --frozen-lockfile\npnpm agent:connect --check\npnpm agent:connect --write"
          }
        </pre>
        <p>
          Only maintainers developing PrigenFi from its repository need the
          older stdio workflow. Generated host configuration stays in the
          ignored <code>.local/agent-connection</code> folder.
        </p>
        <h2>What the connected host can do</h2>
        <ul>
          <li>
            Read market observations from the public DEX Screener source on
            selected EVM networks.
          </li>
          <li>
            Discover a host-facing interpretation prompt for a user-shared DeFi
            research goal.
          </li>
          <li>
            Check network, token and market scope before calling public research
            tools.
          </li>
          <li>
            Inspect Sepolia confidential token capabilities without decrypting
            balances.
          </li>
          <li>
            Receive a clear unavailable status for private trade execution.
          </li>
        </ul>
        <h2>Development environment is separate</h2>
        <p>
          Only developers intentionally running the local Anvil workflow should
          use <code>pnpm mcp:dev</code> and explicitly configured local vault
          identifiers. Those tools simulate public ERC-20 test transfers and
          cannot be mistaken for actual private DeFi trades. Customer-facing
          agent connections use <code>pnpm mcp</code>, which exposes no vault
          actions even when development environment variables are inherited.
        </p>
        <h2>Privacy boundaries</h2>
        <p>
          External AI hosts receive goals explicitly shared with them, and
          public market providers can see searched token symbols or addresses.
          Do not share wallet seeds or decrypted balances. Full private
          execution requires separately verified Zama-compatible venues,
          independently enforced wallet consent and settlement reconciliation.
        </p>
        <div className="actions">
          <Button asChild>
            <Link href="/agents/connect">Agent connection guide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/agents">Back to your agents</Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
