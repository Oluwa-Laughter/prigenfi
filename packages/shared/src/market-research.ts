import { z } from "zod";

/** Provider-specific search identifiers; these are research scopes, not Zama deployments. */
export const publicMarketNetworks = [
  { id: "ethereum", name: "Ethereum", evmChainId: 1 },
  { id: "base", name: "Base", evmChainId: 8453 },
  { id: "arbitrum", name: "Arbitrum", evmChainId: 42161 },
  { id: "optimism", name: "Optimism", evmChainId: 10 },
  { id: "polygon", name: "Polygon", evmChainId: 137 },
  { id: "bsc", name: "BNB Chain", evmChainId: 56 },
] as const;

const networkIds = publicMarketNetworks.map((network) => network.id);
export const marketNetworkSchema = z.enum(
  networkIds as [(typeof networkIds)[number], ...typeof networkIds],
);
export const marketQuerySchema = z
  .string()
  .trim()
  .min(2)
  .max(45)
  .regex(/^(?:0x[a-fA-F0-9]{40}|[a-zA-Z0-9][a-zA-Z0-9./_-]{1,20})$/);
export const marketSearchSchema = z
  .object({
    chain: marketNetworkSchema,
    query: marketQuerySchema,
  })
  .strict();
export const marketPairLookupSchema = z
  .object({
    chain: marketNetworkSchema,
    pairAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  })
  .strict();

const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const tokenSchema = z
  .object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
  })
  .passthrough();
const pairSchema = z
  .object({
    chainId: z.string(),
    dexId: z.string(),
    pairAddress: z.string(),
    baseToken: tokenSchema,
    quoteToken: tokenSchema,
    priceUsd: z.string().nullish(),
    priceChange: z.object({ h24: z.number().optional() }).nullish(),
    liquidity: z.object({ usd: z.number().optional() }).nullish(),
    volume: z.object({ h24: z.number().optional() }).nullish(),
  })
  .passthrough();

export type MarketPair = {
  chain: string;
  pairAddress: string;
  baseAddress: string;
  quoteAddress: string;
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
  dataClass: "public-market-research";
  network: string;
  chain: string;
  evmChainId: number;
  fetchedAt: string;
  query: string;
  privateTradingAvailable: false;
  searchMethod: "global-symbol" | "chain-token-address";
  pairs: MarketPair[];
};

function finiteNonnegative(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
function validPrice(value: string | null | undefined) {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value) || value.length > 60)
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? value : null;
}

function extractPairs(
  input: unknown,
  chain: z.infer<typeof marketNetworkSchema>,
): MarketPair[] {
  const arrayResult = z.array(z.unknown()).safeParse(input);
  const wrapped = z
    .object({ pairs: z.array(z.unknown()).nullish() })
    .safeParse(input);
  if (!arrayResult.success && !wrapped.success)
    throw new Error("UNEXPECTED_MARKET_PROVIDER_RESPONSE");
  const candidatePairs = arrayResult.success
    ? arrayResult.data
    : wrapped.success
      ? (wrapped.data.pairs ?? [])
      : [];
  const seen = new Set<string>();
  const output: MarketPair[] = [];
  for (const row of candidatePairs) {
    const result = pairSchema.safeParse(row);
    if (!result.success) continue;
    const pair = result.data;
    if (
      pair.chainId !== chain ||
      !addressPattern.test(pair.pairAddress) ||
      !addressPattern.test(pair.baseToken.address) ||
      !addressPattern.test(pair.quoteToken.address)
    )
      continue;
    const key = pair.pairAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const change = pair.priceChange?.h24;
    output.push({
      chain,
      pairAddress: pair.pairAddress,
      baseAddress: pair.baseToken.address,
      quoteAddress: pair.quoteToken.address,
      base: pair.baseToken.symbol.slice(0, 24),
      quote: pair.quoteToken.symbol.slice(0, 24),
      baseName: pair.baseToken.name.slice(0, 55),
      dex: pair.dexId.slice(0, 30),
      priceUsd: validPrice(pair.priceUsd),
      change24h:
        change !== undefined && Number.isFinite(change) ? change : null,
      liquidityUsd: finiteNonnegative(pair.liquidity?.usd),
      volume24hUsd: finiteNonnegative(pair.volume?.h24),
    });
    if (output.length === 24) break;
  }
  return output;
}

function network(chain: z.infer<typeof marketNetworkSchema>) {
  const result = publicMarketNetworks.find((item) => item.id === chain);
  if (!result) throw new Error("UNSUPPORTED_PUBLIC_MARKET_NETWORK");
  return result;
}

export async function searchPublicMarkets(
  input: unknown,
  request: typeof fetch = fetch,
): Promise<MarketFeed> {
  const { chain, query } = marketSearchSchema.parse(input);
  const source = network(chain);
  const addressSearch = addressPattern.test(query);
  const endpoint = addressSearch
    ? `https://api.dexscreener.com/token-pairs/v1/${chain}/${query}`
    : "https://api.dexscreener.com/latest/dex/search?q=" +
      encodeURIComponent(query);
  const response = await request(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("MARKET_PROVIDER_UNAVAILABLE");
  const raw = (await response.json()) as unknown;
  return {
    source: "DEX Screener",
    dataClass: "public-market-research",
    chain,
    network: source.name,
    evmChainId: source.evmChainId,
    query,
    fetchedAt: new Date().toISOString(),
    privateTradingAvailable: false,
    searchMethod: addressSearch ? "chain-token-address" : "global-symbol",
    pairs: extractPairs(raw, chain),
  };
}

/** Verify a concrete public pool on one selected chain; never produces an executable quote. */
export async function inspectPublicMarketPair(
  input: unknown,
  request: typeof fetch = fetch,
) {
  const { chain, pairAddress } = marketPairLookupSchema.parse(input);
  const source = network(chain);
  const response = await request(
    `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    },
  );
  if (!response.ok) throw new Error("MARKET_PROVIDER_UNAVAILABLE");
  const raw = (await response.json()) as unknown;
  const pairs = extractPairs(raw, chain);
  return {
    source: "DEX Screener" as const,
    dataClass: "public-market-research" as const,
    chain,
    network: source.name,
    evmChainId: source.evmChainId,
    fetchedAt: new Date().toISOString(),
    privateTradingAvailable: false as const,
    pair:
      pairs.find(
        (pair) => pair.pairAddress.toLowerCase() === pairAddress.toLowerCase(),
      ) ?? null,
  };
}
