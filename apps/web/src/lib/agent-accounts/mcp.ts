import { agentAccountsConfig } from "./config";
import { agentDb } from "./db";
import { sha256 } from "./session";

export const mcpTokenPattern = /^prf_[a-f0-9]{64}$/;
export type RemoteResearchScope = {
  agentId: string;
  label: string;
  host: string;
  allowedNetworks: string[];
  allowedMarkets: string[];
  expiresAt: string;
};

/** Explicitly opt-in while this is a service-token developer preview, NOT OAuth. */
export function remoteMcpEnabled() {
  return process.env.PRIGENFI_MCP_HTTP_ENABLED === "true";
}

/** Every HTTP exchange obtains a fresh, scoped authorization from Postgres.
 * Revocations, expiry, 30-request/minute budget and owner chain are checked
 * in the same atomic update. Token is never printed, logged or stored raw.
 */
export async function authorizeRemoteMcp(
  bearer: string,
): Promise<RemoteResearchScope | null> {
  if (!remoteMcpEnabled() || !mcpTokenPattern.test(bearer)) return null;
  const config = agentAccountsConfig();
  const sql = agentDb();
  const rows = await sql<
    {
      agent_id: string;
      label: string;
      host: string;
      allowed_networks: string[];
      allowed_markets: string[];
      expires_at: Date;
    }[]
  >`
    UPDATE prigenfi_agent_mcp_keys k
    SET last_used_at=now(),
      window_count=CASE WHEN k.window_started_at>now()-interval '1 minute'
        THEN k.window_count+1 ELSE 1 END,
      window_started_at=CASE WHEN k.window_started_at>now()-interval '1 minute'
        THEN k.window_started_at ELSE now() END
    FROM prigenfi_research_agents a
    WHERE k.token_hash=${sha256(bearer)} AND k.agent_id=a.id
      AND k.revoked_at IS NULL AND k.expires_at>now()
      AND a.revoked_at IS NULL AND a.expires_at>now()
      AND a.chain_id=${config.chainId}
      AND (k.window_started_at<=now()-interval '1 minute' OR k.window_count<30)
    RETURNING a.id AS agent_id, a.label, a.host, a.allowed_networks,
      a.allowed_markets, a.expires_at`;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    agentId: r.agent_id,
    label: r.label,
    host: r.host,
    allowedNetworks: r.allowed_networks,
    allowedMarkets: r.allowed_markets,
    expiresAt: r.expires_at.toISOString(),
  };
}
