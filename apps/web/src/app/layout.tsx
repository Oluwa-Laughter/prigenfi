import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import "./globals.css";
export const metadata: Metadata = {
  title: "PrigenFi — Private finance. Powered by agents.",
  description:
    "User-controlled agent vaults and confidential finance. Explore the Ethereum Sepolia development application.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <footer>
          <div className="wrap footer-inner">
            <span>PrigenFi · Private finance. Powered by agents.</span>
            <span>Testnet development · No real funds</span>
            <a href="/docs">Documentation</a>
            <a href="https://github.com/Oluwa-Laughter/prigenfi">GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
