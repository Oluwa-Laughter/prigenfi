import type { MarketFeed, MarketPair } from "@prigenfi/shared/market-research";
export type { MarketFeed, MarketPair } from "@prigenfi/shared/market-research";
export const marketCategories = [
  {
    id: "spot",
    label: "DEX & spot",
    query: "ETH",
    description: "ETH and ERC-20 pairs across selected EVM networks",
  },
  {
    id: "defi",
    label: "DeFi tokens",
    query: "UNI",
    description: "Lending, governance and protocol token markets",
  },
  {
    id: "stable",
    label: "Stablecoins",
    query: "USDC",
    description: "Public stablecoin pool research, not confidential trading",
  },
  {
    id: "meme",
    label: "Emerging tokens",
    query: "PEPE",
    description:
      "Emerging and meme-token discovery — verify contract and liquidity risks",
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
