import { NextResponse } from "next/server";
import { z } from "zod";
export const runtime = "nodejs";

const querySchema = z
  .string()
  .trim()
  .min(2)
  .max(45)
  .regex(/^[a-zA-Z0-9 .+/_-]+$/);
const tokenSchema = z
  .object({ address: z.string(), name: z.string(), symbol: z.string() })
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = querySchema.safeParse(url.searchParams.get("q") || "ETH");
  if (!query.success)
    return NextResponse.json(
      { error: "Enter a short token or pair search.", pairs: [] },
      { status: 400 },
    );
  try {
    const options = {
      headers: { Accept: "application/json" },
      next: { revalidate: 75 },
      signal: AbortSignal.timeout(7000),
    };
    const response = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=" +
        encodeURIComponent(query.data),
      options,
    );
    if (!response.ok) throw new Error("Provider unavailable");
    const payload: unknown = await response.json();
    const rows = z
      .object({ pairs: z.array(z.unknown()).nullish() })
      .safeParse(payload);
    if (!rows.success) throw new Error("Unexpected provider response");
    const pairs = (rows.data.pairs ?? [])
      .map((row) => pairSchema.safeParse(row))
      .filter((result) => result.success)
      .map((result) => result.data!)
      .filter(
        (pair) =>
          pair.chainId === "ethereum" &&
          /^0x[a-fA-F0-9]{40}$/.test(pair.pairAddress),
      )
      .slice(0, 24)
      .map((pair) => ({
        pairAddress: pair.pairAddress,
        base: pair.baseToken.symbol.slice(0, 24),
        quote: pair.quoteToken.symbol.slice(0, 24),
        baseName: pair.baseToken.name.slice(0, 55),
        dex: pair.dexId.slice(0, 30),
        priceUsd: pair.priceUsd ?? null,
        change24h: Number.isFinite(pair.priceChange?.h24)
          ? pair.priceChange!.h24!
          : null,
        liquidityUsd: Number.isFinite(pair.liquidity?.usd)
          ? pair.liquidity!.usd!
          : null,
        volume24hUsd: Number.isFinite(pair.volume?.h24)
          ? pair.volume!.h24!
          : null,
      }));
    return NextResponse.json(
      {
        source: "DEX Screener",
        network: "Ethereum mainnet",
        query: query.data,
        pairs,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=75, stale-while-revalidate=75",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        source: "DEX Screener",
        error: "Ethereum market feed is temporarily unavailable.",
        pairs: [],
      },
      { status: 503 },
    );
  }
}
