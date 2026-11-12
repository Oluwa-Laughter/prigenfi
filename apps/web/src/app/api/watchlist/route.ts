import { z } from "zod";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { currentOwner } from "@/lib/agent-accounts/session";
import {
  watchedMarkets,
  saveWatchedMarket,
  forgetWatchedMarket,
  MAX_WATCHED_PAIRS,
  clearWatchedMarkets,
} from "@/lib/agent-accounts/watchlist";
import {
  apiError,
  checkSameOrigin,
  jsonBody,
  reply,
} from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    agentAccountsConfig();
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const markets = await watchedMarkets(owner);
    return reply({
      markets,
      maxSaved: MAX_WATCHED_PAIRS,
      executionAllowed: false,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    agentAccountsConfig();
    if (!checkSameOrigin(req)) return reply({ error: "INVALID_ORIGIN" }, 403);
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    let body: unknown;
    try {
      body = await jsonBody(req);
    } catch {
      return reply({ error: "INVALID_REQUEST" }, 400);
    }
    const result = await saveWatchedMarket(owner, body);
    if (result.status === "invalid")
      return reply({ error: "INVALID_MARKET" }, 400);
    if (result.status === "full")
      return reply({ error: "WATCHLIST_LIMIT" }, 409);
    return reply({ market: result.entry, executionAllowed: false });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    agentAccountsConfig();
    if (!checkSameOrigin(req)) return reply({ error: "INVALID_ORIGIN" }, 403);
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    let body: unknown;
    try {
      body = await jsonBody(req);
    } catch {
      return reply({ error: "INVALID_REQUEST" }, 400);
    }
    const clearRequest = z
      .object({
        clearAll: z.literal(true),
        confirmation: z.literal("CLEAR MY MARKETS"),
      })
      .strict()
      .safeParse(body);
    if (clearRequest.success) {
      const removed = await clearWatchedMarkets(owner);
      return reply({ removed, executionAllowed: false });
    }
    const result = await forgetWatchedMarket(owner, body);
    if (result.status === "invalid")
      return reply({ error: "INVALID_MARKET" }, 400);
    if (result.status === "missing")
      return reply({ error: "WATCHED_MARKET_NOT_FOUND" }, 404);
    return reply({ removed: true, executionAllowed: false });
  } catch (error) {
    return apiError(error);
  }
}
