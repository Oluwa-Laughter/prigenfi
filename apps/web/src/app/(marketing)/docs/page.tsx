import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function Docs() {
  return (
    <main id="main" className="wrap">
      <article className="docs">
        <h1>Build with explicit financial boundaries.</h1>
        <p>
          PrigenFi is in testnet development. The first slice connects
          owner-controlled ERC-20 vaults, a typed policy SDK, local MCP
          proposals, and wallet-based confidential token operations.
        </p>
        <h2>Run locally</h2>
        <pre className="code-panel">
          {
            "pnpm install --frozen-lockfile\npnpm contracts:build\nanvil --silent\npnpm local:deploy\npnpm dev"
          }
        </pre>
        <p>
          The deploy command uses unlocked local Anvil accounts. It refuses
          non-local RPC hosts and any chain other than 31337. It does not load
          signing secrets.
        </p>
        <h2>Connect an MCP client</h2>
        <pre className="code-panel">
          {
            '{\n  "mcpServers": {\n    "prigenfi": {\n      "command": "pnpm",\n      "args": ["exec", "tsx", "services/mcp-server/src/stdio.ts"],\n      "env": {\n        "CHAIN_ID": "31337",\n        "RPC_URL": "http://127.0.0.1:8545",\n        "VAULT_ADDRESS": "YOUR_LOCAL_VAULT",\n        "AGENT_ADDRESS": "YOUR_AGENT_ADDRESS",\n        "TOKEN_ADDRESS": "YOUR_LOCAL_MOCK_TOKEN"\n      }\n    }\n  }\n}'
          }
        </pre>
        <p>
          Run from the repository root. The operator binds one vault, agent, and
          token at server startup. Tools cannot change that scope. Stdio
          inherits local operating-system access; a remote MCP endpoint is not
          available.
        </p>
        <h2>Policy is independently enforced</h2>
        <p>
          The vault checks the caller, token, recipient, amount, UTC daily
          spending, expiry, nonce, and pause state. The SDK also checks a short
          proposal deadline. That deadline is a simulation freshness rule, not
          an on-chain signed-intent guarantee.
        </p>
        <h2>Confidential token boundaries</h2>
        <p>
          Sepolia cUSDCMock and cUSDTMock are separate wallet assets. The app
          verifies deployed code, underlying addresses, rates, and decimals
          before enabling operations. Decryption is opt-in and stays in browser
          memory. No confidential token operator is granted to an agent.
        </p>
        <p>
          Shielding and unshielding expose public amounts. Encrypted transfers
          still expose addresses and timing. No confidential swap venue or
          agent-managed confidential spending policy is integrated.
        </p>
        <h2>Current availability</h2>
        <ul>
          <li>
            Local isolated vault creation, permissions, revocation, pause, and
            mock token transfers.
          </li>
          <li>Public chain reads and simulation-only MCP proposals.</li>
          <li>
            Official Zama SDK and React SDK integration; real Sepolia operations
            require a connected funded test wallet and reachable Zama services.
          </li>
          <li>
            Remote OAuth, persistent user accounts, PostgreSQL, ERC-4337 smart
            accounts, and production execution are pending.
          </li>
        </ul>
        <div className="actions">
          <Button asChild>
            <Link href="/vault">Manage testnet vault</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://github.com/Oluwa-Laughter/prigenfi/tree/main/docs">
              Engineering documentation
            </a>
          </Button>
        </div>
      </article>
    </main>
  );
}
