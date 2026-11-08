import { MarketFeedView } from "@/components/workspace/market-feed";
import { marketCategories, type MarketCategory } from "@/lib/markets";

export const metadata = { title: "Ethereum Markets" };
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
          <h1>Explore Ethereum markets.</h1>
          <p className="ws-page-subtitle">
            From DEX spot pairs and meme tokens to DeFi and stablecoins.
            Discover pools first, decide what agents may do later.
          </p>
        </div>
        <span className="ws-source-mark">Public feed · DEX Screener</span>
      </div>
      <div className="market-intro-notice">
        Market listings are public Ethereum mainnet observations, not verified
        safe tokens or private executable markets. Verify addresses, contract
        risk, liquidity and venues independently. Trading remains disabled.
      </div>
      <MarketFeedView initialCategory={category} />
    </div>
  );
}
