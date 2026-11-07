import Link from "next/link";
import {
  ShieldCheck,
  Wallet,
  Workflow,
  LockKeyhole,
  KeyRound,
  Code2,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export default function Home() {
  return (
    <main id="main">
      <section className="wrap hero">
        <div>
          <Badge variant="outline">
            Built for user control · Sepolia development
          </Badge>
          <h1>
            Private finance.
            <br />
            Powered by agents.
          </h1>
          <p>
            Give your agents room to act. Keep the boundaries in your hands.
          </p>
          <p>
            PrigenFi brings isolated capital, explicit permissions, and
            confidential assets into one financial workspace.
          </p>
          <div className="actions">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Explore the app <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">Build with PrigenFi</Link>
            </Button>
          </div>
          <div className="small-note">
            Testnet only. Agent proposals are simulation-only.
          </div>
        </div>
        <div
          className="diagram"
          role="img"
          aria-label="How user control connects to agent vaults"
        >
          <div className="diagram-title">
            <h2>Autonomy with boundaries</h2>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="flow-node">
            <Wallet aria-hidden="true" />
            <div>
              <strong>Your wallet</strong>
              <small>You hold the authority.</small>
            </div>
          </div>
          <div className="flow-connector" />
          <div className="flow-node">
            <KeyRound aria-hidden="true" />
            <div>
              <strong>Explicit permissions</strong>
              <small>Token. Recipient. Budget. Expiry.</small>
            </div>
          </div>
          <div className="flow-connector" />
          <div className="flow-node">
            <Workflow aria-hidden="true" />
            <div>
              <strong>An isolated agent vault</strong>
              <small>Only allocated capital is in scope.</small>
            </div>
          </div>
          <div className="flow-bottom">
            <span>
              <Check size={14} style={{ display: "inline" }} /> Revoke access
            </span>
            <span>
              <Check size={14} style={{ display: "inline" }} /> Pause anytime
            </span>
            <span>Protocol architecture</span>
          </div>
        </div>
      </section>
      <section className="feature-section" id="how-it-works">
        <div className="wrap">
          <div className="section-intro">
            <h2>
              Delegate the work.
              <br />
              Define the limits.
            </h2>
            <p>
              Agents can help you understand your portfolio and propose actions.
              Your wallet defines authority, and the vault independently
              enforces what an agent can spend.
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <Wallet />
              <h3>Separate the capital</h3>
              <p>
                Create a vault you own. Fund it deliberately, with no access to
                the rest of your wallet.
              </p>
            </article>
            <article>
              <KeyRound />
              <h3>Set the boundaries</h3>
              <p>
                Choose a token, recipient, operation cap, daily budget, and
                expiry. Pause or revoke access from your wallet.
              </p>
            </article>
            <article>
              <Workflow />
              <h3>Review every proposal</h3>
              <p>
                Inspect policy results before any action. The current MCP path
                simulates mock transfers and never signs transactions.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="feature-section" id="privacy">
        <div className="wrap section-intro">
          <div>
            <LockKeyhole
              style={{ color: "var(--primary)", marginBottom: 22 }}
            />
            <h2>
              A private balance.
              <br />A clearer boundary.
            </h2>
          </div>
          <div>
            <p>
              Zama’s confidential token tooling keeps ERC-7984 balances and
              transfer values encrypted. Reveal your balance only when you
              authorize it in your wallet.
            </p>
            <p style={{ marginTop: 22 }}>
              Addresses, transaction timing, and public deposits and withdrawals
              remain visible. Confidential tokens are separate from your agent
              vault in this first release.
            </p>
            <div className="actions">
              <Button variant="outline" asChild>
                <Link href="/dashboard#confidential">
                  Explore confidential assets
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="feature-section">
        <div className="wrap developer">
          <div>
            <Code2 style={{ color: "var(--primary)", marginBottom: 22 }} />
            <h2>
              A financial interface
              <br />
              for your agents.
            </h2>
            <p>
              Connect external agents through MCP. Read public vault state,
              inspect permissions, and simulate structured proposals through a
              typed SDK.
            </p>
            <Button variant="outline" asChild>
              <Link href="/docs">Read the integration guide</Link>
            </Button>
          </div>
          <div className="code-panel">
            <div className="muted">Local MCP tools</div>
            <code>
              {
                "wallet_get_info\nagent_get_permissions\nportfolio_get\ntrade_simulate\ntrade_propose\n\n// No signing tools. No arbitrary calls.\n// Confidential balances stay with the user."
              }
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
