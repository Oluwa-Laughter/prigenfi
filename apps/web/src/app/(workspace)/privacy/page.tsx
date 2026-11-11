import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { confidentialCapabilities } from "@prigenfi/shared/confidential-policy";
import { PrivateRouteCheck } from "@/components/workspace/private-route-check";

export const metadata = { title: "Confidential execution" };
export default function PrivacyPage() {
  return (
    <div className="workspace-page privacy-workspace">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">PrigenFi confidentiality</p>
          <h1>Privacy is a requirement. Never a fallback.</h1>
          <p className="ws-page-subtitle">
            Every agent mandate is intended for confidential execution. No
            ordinary public DEX swap will be presented as a private trade.
          </p>
        </div>
        <Link href="/agents" className="ws-pill-button">
          Instruct an agent <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="privacy-status-banner">
        <ShieldAlert size={24} />
        <div>
          <strong>Private autonomous trading is not enabled yet</strong>
          <p>
            You can explore supported assets and research markets. Automated
            confidential trades will become available only after approved
            execution routes and wallet permissions are independently verified.
          </p>
        </div>
      </div>
      <PrivateRouteCheck />
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Crypto-focused Sepolia test wrappers</p>
          <h2>Confidential asset universe</h2>
          <p>
            Eligible wallet-level confidential token tools for evaluation. These
            test assets are unbacked and not a live investment market.
          </p>
        </div>
        <Link className="ws-text-link" href="/portfolio">
          Open wallet asset tools <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="privacy-asset-grid">
        {confidentialCapabilities.confidentialAssets.map((asset) => (
          <article key={asset.address} className="privacy-asset">
            <div className="privacy-asset-symbol">
              <LockKeyhole size={19} />
              <strong>{asset.symbol}</strong>
            </div>
            <p>{asset.category}</p>
            <span>Sepolia test wrapper</span>
          </article>
        ))}
      </div>
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Your privacy and control</p>
          <h2>What stays private, and what doesn't</h2>
          <p>
            Encrypted amounts and public Ethereum metadata are different
            concerns.
          </p>
        </div>
      </div>
      <div className="privacy-explain-grid">
        <article>
          <span className="ws-guidance-icon purple">
            <EyeOff size={24} />
          </span>
          <h3>Encrypted values</h3>
          <p>
            FHE-enabled contracts can compute over supported ciphertexts without
            revealing eligible amounts. Access is constrained by FHE
            permissions.
          </p>
        </article>
        <article>
          <span className="ws-guidance-icon blue">
            <Fingerprint size={24} />
          </span>
          <h3>Explicit owner consent</h3>
          <p>
            Access to confidential balances and wallet signing require separate
            cryptographic authorization. Instructions alone cannot grant either.
          </p>
        </article>
        <article>
          <span className="ws-guidance-icon peach">
            <ScanSearch size={24} />
          </span>
          <h3>Public metadata remains</h3>
          <p>
            Addresses, gas, timing, token wrapping deposits, withdrawals and
            public market queries can remain visible.
          </p>
        </article>
      </div>
      <div className="privacy-checklist">
        <div>
          <ShieldCheck size={23} />
          <div>
            <h3>What must be verified before private trading</h3>
            <p>
              Before an agent can trade, PrigenFi must verify confidential
              execution, enforce your account's limits and revocation rules, and
              reconcile actual settled transactions. You remain in control; no
              automatic trading is enabled in this preview.
            </p>
          </div>
        </div>
        <Link href="/strategies">
          Explore all strategy areas <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="privacy-sources">
        <BadgeCheck size={16} /> Token metadata comes from the{" "}
        <a
          href="https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md"
          target="_blank"
          rel="noreferrer"
        >
          official Zama Sepolia wrapper registry
        </a>
        . The cZAMA test wrapper is not the real ZAMA token.
      </p>
    </div>
  );
}
