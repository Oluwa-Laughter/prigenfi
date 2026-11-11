import Link from "next/link";
import {
  ArrowUpRight,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  WalletCards,
  Bookmark,
} from "lucide-react";
export const metadata = { title: "Safety & Settings" };
export default function SettingsPage() {
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Your boundaries</p>
          <h1>Safety is the product.</h1>
          <p className="ws-page-subtitle">
            Agent autonomy does not mean surrendering wallet authority. Review
            the capabilities that exist today.
          </p>
        </div>
      </div>
      <div className="settings-list">
        <div>
          <span className="ws-guidance-icon lilac">
            <Bookmark size={23} />
          </span>
          <div>
            <h2>Saved market research</h2>
            <p>
              Public EVM pool addresses you choose to follow can be saved to
              your wallet-owned workspace. This is a watchlist, not a portfolio,
              an order or an authorized agent mandate.
            </p>
          </div>
          <Link href="/dashboard#workspace-summary">
            Open saved workspace <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <span className="ws-guidance-icon purple">
            <KeyRound size={23} />
          </span>
          <div>
            <h2>Manage agent permissions</h2>
            <p>
              Agent spending limits, session expiry and revocation will be
              enforced independently of what an AI agent requests. Private
              trading permissions are not yet available.
            </p>
          </div>
          <Link href="/agents">
            Review agent instructions <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <span className="ws-guidance-icon blue">
            <EyeOff size={23} />
          </span>
          <div>
            <h2>Confidential balance access</h2>
            <p>
              Wallet-owner permits authorize confidential balance decryption on
              Zama-supported test wrappers. Private values are not shared with
              MCP tools.
            </p>
          </div>
          <Link href="/portfolio">
            Open assets <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <span className="ws-guidance-icon peach">
            <WalletCards size={23} />
          </span>
          <div>
            <h2>Wallet security</h2>
            <p>
              Use a dedicated funded testnet wallet. Never provide seed phrases
              or signing keys to an agent, the MCP server or this website.
            </p>
          </div>
          <Link href="/privacy">
            Understand privacy <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="settings-warning">
        <ShieldAlert size={23} />
        <div>
          <h2>Execution boundaries</h2>
          <p>
            PrigenFi has optional research-only remote MCP, no unattended swap
            engine and no verified confidential trading venue yet. P&L and win
            rates require reconciled fills and closed positions. Mainnet trading
            is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
