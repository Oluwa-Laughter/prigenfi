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
        <h2>Connect an agent in three commands</h2>
        <pre className="code-panel">
          {
            "pnpm install --frozen-lockfile\npnpm agent:connect --check\npnpm agent:connect --write"
          }
        </pre>
        <p>
          Run these from your local PrigenFi checkout. The check starts the
          research-only stdio server and independently negotiates an MCP
          handshake. Local host configuration templates are created inside
          ignored <code>.local/agent-connection</code>; your other MCP settings
          are not overwritten.
        </p>
        <h2>Connect Codex or Claude Desktop</h2>
        <pre className="code-panel">
          {
            "pnpm agent:connect --print codex\npnpm agent:connect --print claude"
          }
        </pre>
        <p>
          Add only the generated PrigenFi entry to your chosen host's
          configuration, then verify its tools inside the host. Paths in those
          entries are generated from the installed local checkout. Neither the
          website nor a successful local check claims to have authenticated your
          agent or granted permission to move funds.
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
