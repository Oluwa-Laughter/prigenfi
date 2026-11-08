import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PrigenFi — Autonomous finance, on your terms",
    template: "%s | PrigenFi",
  },
  description:
    "Explore Ethereum markets, create financial agent mandates and manage restricted wallet permissions. Confidential asset tooling powered by Zama on testnet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
