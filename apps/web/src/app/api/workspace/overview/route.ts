import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { agentDb } from "@/lib/agent-accounts/db";
import { currentOwner } from "@/lib/agent-accounts/session";
import {
  watchedMarkets,
  MAX_WATCHED_PAIRS,
} from "@/lib/agent-accounts/watchlist";
import { apiError, reply } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Counts = { active: number; expiring: number; inactive: number };
type Profile = { id: string; label: string; host: string; expires_at: Date };
/** Owner-only database state; no fake earnings, trades or wallet balances. */
export async function GET() {
  try {
    agentAccountsConfig();
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const sql = agentDb();
    const [counts, profiles, markets, watchedCount] = await Promise.all([
      sql<Counts[]>`
        SELECT
          count(*) FILTER (WHERE revoked_at IS NULL AND expires_at>now())::int AS active,
          count(*) FILTER (WHERE revoked_at IS NULL AND expires_at>now()
            AND expires_at<=now()+interval '48 hours')::int AS expiring,
          count(*) FILTER (WHERE revoked_at IS NOT NULL OR expires_at<=now())::int AS inactive
        FROM prigenfi_research_agents
        WHERE owner_address=${owner.address} AND chain_id=${owner.chainId}`,
      sql<Profile[]>`
        SELECT id,label,host,expires_at FROM prigenfi_research_agents
        WHERE owner_address=${owner.address} AND chain_id=${owner.chainId}
          AND revoked_at IS NULL AND expires_at>now()
        ORDER BY created_at DESC LIMIT 3`,
      watchedMarkets(owner, 5),
      sql<{ total: number }[]>`
        SELECT count(*)::int AS total FROM prigenfi_market_watchlist
        WHERE owner_address=${owner.address} AND account_chain_id=${owner.chainId}`,
    ]);
    return reply({
      source: "owner-authenticated-postgres",
      owner: { address: owner.address, chainId: owner.chainId },
      agents: {
        active: counts[0].active,
        expiringSoon: counts[0].expiring,
        inactive: counts[0].inactive,
        latest: profiles.map((p) => ({
          id: p.id,
          label: p.label,
          host: p.host,
          expiresAt: p.expires_at.toISOString(),
        })),
      },
      watchlist: {
        saved: markets,
        total: watchedCount[0].total,
        maxSaved: MAX_WATCHED_PAIRS,
      },
      executionAllowed: false,
      performanceAvailable: false,
    });
  } catch (error) {
    return apiError(error);
  }
}
