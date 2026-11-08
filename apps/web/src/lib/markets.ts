export type MarketPair = {
  pairAddress: string;
  base: string;
  quote: string;
  baseName: string;
  dex: string;
  priceUsd: string | null;
  change24h: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
};
export type MarketFeed = {
  source: "DEX Screener";
  network: string;
  fetchedAt: string;
  query: string;
  pairs: MarketPair[];
};
export const marketCategories = [
  {
    id: "spot",
    label: "DEX & spot",
    query: "ETH",
    description: "ETH and ERC-20 pairs across Ethereum decentralized exchanges",
  },
  {
    id: "meme",
    label: "Meme coins",
    query: "PEPE",
    description:
      "Meme-token pair discovery — verify token contracts and liquidity independently",
  },
  {
    id: "defi",
    label: "DeFi tokens",
    query: "UNI",
    description: "DEX governance, lending and protocol tokens",
  },
  {
    id: "stable",
    label: "Stablecoins",
    query: "USDC",
    description:
      "Public stablecoin pairs, separate from Zama confidential test assets",
  },
] as const;
export type MarketCategory = (typeof marketCategories)[number]["id"];
export const usd = (
  value: number | null,
  options: Intl.NumberFormatOptions = {},
) =>
  value === null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
        ...options,
      }).format(value);
export function priceUsd(value: string | null) {
  if (!value) return "—";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  const decimals = n < 0.0001 ? 9 : n < 1 ? 6 : 3;
  return usd(n, {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  });
}
