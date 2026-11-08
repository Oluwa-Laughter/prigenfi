import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrigenFi — Private agent finance",
  description:
    "Define markets, delegate restricted agent permissions, and explore Zama-powered confidential assets on PrigenFi. Ethereum Sepolia development.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="wrap footer-inner">
            <div>
              <strong>PrigenFi</strong>
              <span>Private finance. Powered by agents.</span>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/#how-it-works">The product</Link>
              <Link href="/#privacy">Privacy</Link>
              <Link href="/#agent-mcp">Agent MCP</Link>
              <Link href="/dashboard">Workspace</Link>
            </nav>
            <small>Ethereum Sepolia development · Test assets only · No live autonomous trades</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
