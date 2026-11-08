import Link from "next/link";
import type { ReactNode } from "react";
import { Header, Brand } from "@/components/header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-shell">
      <Header />
      {children}
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-grid">
          <div>
            <Brand />
            <p>Intelligent markets. Your permissions.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#markets">Markets</Link>
            <Link href="/docs">For developers</Link>
            <Link href="/dashboard">Open PrigenFi</Link>
          </nav>
          <p className="footer-disclosure">
            Ethereum Sepolia preview. Assets are unbacked test tokens. Automated
            trading and confidential swaps are not enabled.
          </p>
        </div>
      </footer>
    </div>
  );
}
