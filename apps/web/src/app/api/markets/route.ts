import { NextResponse } from "next/server";
import {
  marketSearchSchema,
  searchPublicMarkets,
} from "@prigenfi/shared/market-research";
export const runtime = "nodejs";

/** Public research only: no user balances, agent prompts, wallets or trading instructions. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const input = marketSearchSchema.safeParse({
    chain: params.get("chain") ?? "ethereum",
    query: params.get("q") ?? "ETH",
  });
  if (!input.success) {
    return NextResponse.json(
      {
        error: "Select a supported network and short token/pair query.",
        pairs: [],
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const feed = await searchPublicMarkets(input.data);
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "public, s-maxage=75, stale-while-revalidate=75",
      },
    });
  } catch {
    return NextResponse.json(
      {
        source: "DEX Screener",
        error: "Public market feed unavailable.",
        pairs: [],
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
