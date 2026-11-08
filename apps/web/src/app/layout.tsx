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
    "PrigenFi is building private, agent-native DeFi: direct AI agents, explore EVM markets and keep control of capital with smart-account permissions and Zama FHE.",
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
