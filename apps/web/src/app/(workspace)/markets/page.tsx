import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketFeedView } from "@/components/workspace/market-feed";
import { marketCategories, type MarketCategory } from "@/lib/markets";

export const metadata = { title: "EVM Market Research" };
export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category: MarketCategory = marketCategories.some(
    (c) => c.id === params.category,
  )
    ? (params.category as MarketCategory)
    : "spot";
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Real on-chain market data</p>
          <h1>Explore EVM markets.</h1>
          <p className="ws-page-subtitle">
            Research live public pools across selected EVM networks—spot, DeFi,
            stablecoins and emerging tokens. Agent trading permissions remain
            separate.
          </p>
        </div>
        <span className="ws-source-mark">Public feed · DEX Screener</span>
      </div>
      <div className="market-intro-notice">
        These are externally sourced public market observations, not verified
        safe tokens or executable confidential routes. Verify contract risk,
        liquidity, token addresses and venues independently. Private trading
        remains disabled across all listed networks.
      </div>
      <div className="market-watchlist-entry">
        <span>
          Research a public pool and save it to your wallet-owned workspace for
          later.
        </span>
        <Link href="/dashboard#workspace-summary" className="ws-text-link">
          My saved markets <ArrowUpRight size={16} />
        </Link>
      </div>
      <MarketFeedView initialCategory={category} />
    </div>
  );
}
