import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ShieldAlert } from "lucide-react";
import {
  inspectPublicMarketPair,
  marketPairLookupSchema,
} from "@prigenfi/shared/market-research";
import { assessMarketIntegrity } from "@prigenfi/shared/market-integrity";
import { priceUsd, usd } from "@/lib/markets";
import { WatchlistToggle } from "@/components/workspace/watchlist-toggle";

export const metadata = { title: "Onchain pair research | PrigenFi" };
export const dynamic = "force-dynamic";
export default async function MarketPairPage({
  params,
}: {
  params: Promise<{ chain: string; pairAddress: string }>;
}) {
  const raw = await params;
  const parsed = marketPairLookupSchema.safeParse(raw);
  if (!parsed.success) notFound();
  const { chain, pairAddress } = parsed.data;
  let result: Awaited<ReturnType<typeof inspectPublicMarketPair>> | null = null;
  try {
    result = await inspectPublicMarketPair({ chain, pairAddress });
  } catch {
    // A third-party outage is not a found market and must never be filled with synthetic prices.
  }
  const pair = result?.pair;
  const screen = result
    ? assessMarketIntegrity(pair ?? null, result.fetchedAt, {
        chain,
        pairAddress,
      })
    : null;
  return (
    <div className="workspace-page pair-detail-page">
      <Link href="/markets" className="ws-text-link pair-back-link">
        <ArrowLeft size={16} /> Back to market research
      </Link>
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Onchain market research</p>
          <h1>
            {pair ? `${pair.base} / ${pair.quote}` : "Public pair details"}
          </h1>
          <p className="ws-page-subtitle">
            Public market observations are separate from your private assets,
            wallet permissions and confidential execution.
          </p>
        </div>
        {pair && <WatchlistToggle chain={chain} pairAddress={pairAddress} />}
      </div>
      <section
        className="pair-evidence"
        aria-labelledby="pair-evidence-heading"
      >
        <div className="pair-evidence-heading">
          <div>
            <h2 id="pair-evidence-heading">Market evidence</h2>
            <p>Chain: {result?.network ?? chain}</p>
          </div>
          <span className="ws-source-mark">Source: DEX Screener</span>
        </div>
        <p className="pair-contract-identity">
          Pool address: <code>{pairAddress}</code>
        </p>
        {!pair ? (
          <div className="insight-empty" role="status">
            Verified public pair data is unavailable for this contract and
            network. Check the address or return to market research. No price or
            risk score will be inferred.
          </div>
        ) : (
          <>
            <div className="pair-data-grid">
              <div>
                <span>Reported price</span>
                <strong>{priceUsd(pair.priceUsd)}</strong>
              </div>
              <div>
                <span>Reported 24h volume</span>
                <strong>{usd(pair.volume24hUsd)}</strong>
              </div>
              <div>
                <span>Reported liquidity</span>
                <strong>{usd(pair.liquidityUsd)}</strong>
              </div>
              <div>
                <span>24h movement</span>
                <strong>
                  {pair.change24h === null
                    ? "Unavailable"
                    : `${pair.change24h.toFixed(2)}%`}
                </strong>
              </div>
            </div>
            <p className="pair-evidence-meta">
              DEX: {pair.dex} · Retrieved:{" "}
              {new Date(result!.fetchedAt).toLocaleString("en-GB", {
                timeZone: "UTC",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              UTC
            </p>
            <a
              className="ws-text-link"
              href={`https://dexscreener.com/${chain}/${pairAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              Open source record <ArrowUpRight size={15} />
            </a>
          </>
        )}
      </section>
      <section
        className="pair-integrity"
        aria-labelledby="pair-integrity-heading"
      >
        <ShieldAlert size={21} aria-hidden="true" />
        <div>
          <h2 id="pair-integrity-heading">
            Risk review is not a trading approval
          </h2>
          <p>
            {screen
              ? `Research screen: ${screen.classification.replaceAll("-", " ")}. Provider-reported values require independent verification.`
              : "Risk screening unavailable without a real source observation."}
          </p>
          {screen && (
            <ul>
              {screen.signals.map((signal) => (
                <li key={signal.code}>
                  {signal.code.replaceAll("_", " ").toLowerCase()}
                </li>
              ))}
            </ul>
          )}
          <p>
            No verified confidential venue, agent order or user-funded trade is
            connected to this page.
          </p>
        </div>
      </section>
    </div>
  );
}
