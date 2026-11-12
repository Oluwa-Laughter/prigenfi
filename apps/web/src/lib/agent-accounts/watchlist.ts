import { marketPairLookupSchema } from "@prigenfi/shared/market-research";
import type { SignedInOwner } from "./session";
import { agentDb } from "./db";

export const MAX_WATCHED_PAIRS = 25;
export const watchlistInput = marketPairLookupSchema;
export type SavedMarket = {
  chain: string;
  pairAddress: string;
  savedAt: string;
};
type SavedRow = {
  network: string;
  pair_address: string;
  saved_at: Date;
};
const record = (row: SavedRow): SavedMarket => ({
  chain: row.network,
  pairAddress: row.pair_address,
  savedAt: row.saved_at.toISOString(),
});

export async function watchedMarkets(
  owner: SignedInOwner,
  limit = MAX_WATCHED_PAIRS,
) {
  const rows = await agentDb()<SavedRow[]>`
    SELECT network,pair_address,saved_at FROM prigenfi_market_watchlist
    WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}
    ORDER BY saved_at DESC,network,pair_address LIMIT ${limit}`;
  return rows.map(record);
}

/** Serialize each wallet's updates so 25-item cap cannot be bypassed by racing POSTs. */
export async function saveWatchedMarket(owner: SignedInOwner, input: unknown) {
  const parsed = watchlistInput.safeParse(input);
  if (!parsed.success) return { status: "invalid" as const };
  const chain = parsed.data.chain;
  const pair = parsed.data.pairAddress.toLowerCase();
  const sql = agentDb();
  const result = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${owner.address + ":" + owner.chainId + ":watchlist"}))`;
    const existing = await tx<SavedRow[]>`
      SELECT network,pair_address,saved_at FROM prigenfi_market_watchlist
      WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}
        AND network=${chain} AND pair_address=${pair} LIMIT 1`;
    if (existing.length)
      return { status: "saved" as const, entry: record(existing[0]) };
    const count = await tx<{ count: number }[]>`
      SELECT count(*)::int AS count FROM prigenfi_market_watchlist
      WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}`;
    if (count[0].count >= MAX_WATCHED_PAIRS) return { status: "full" as const };
    const rows = await tx<SavedRow[]>`
      INSERT INTO prigenfi_market_watchlist
      (owner_address,account_chain_id,network,pair_address)
      VALUES (${owner.address},${owner.chainId},${chain},${pair})
      RETURNING network,pair_address,saved_at`;
    return { status: "saved" as const, entry: record(rows[0]) };
  });
  return result;
}

export async function forgetWatchedMarket(
  owner: SignedInOwner,
  input: unknown,
) {
  const parsed = watchlistInput.safeParse(input);
  if (!parsed.success) return { status: "invalid" as const };
  const removed = await agentDb()<SavedRow[]>`
    DELETE FROM prigenfi_market_watchlist
    WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}
      AND network=${parsed.data.chain}
      AND pair_address=${parsed.data.pairAddress.toLowerCase()}
    RETURNING network,pair_address,saved_at`;
  return removed.length
    ? { status: "removed" as const }
    : { status: "missing" as const };
}

/** User-directed deletion, serialized against new saves using the same owner lock. */
export async function clearWatchedMarkets(owner: SignedInOwner) {
  const sql = agentDb();
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${owner.address + ":" + owner.chainId + ":watchlist"}))`;
    const removed = await tx<{ pair_address: string }[]>`
      DELETE FROM prigenfi_market_watchlist
      WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}
      RETURNING pair_address`;
    return removed.length;
  });
}
