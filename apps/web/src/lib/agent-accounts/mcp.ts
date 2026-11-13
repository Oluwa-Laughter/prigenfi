import { agentAccountsConfig } from "./config";
import { agentDb } from "./db";
import { sha256, validateContractSession } from "./session";

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
  // Reject legacy bearer keys that predate the verified authentication
  // lineage. A contract account's bearer is bound to the issuing session's
  // STILL-VALID ERC-1271 signature, not merely to its cached Postgres scope.
  const issuers = await sql<
    {
      auth_kind: string;
      auth_session_hash: string | null;
      owner_address: string;
      chain_id: number;
    }[]
  >`
    SELECT k.auth_kind,k.auth_session_hash,a.owner_address,a.chain_id
    FROM prigenfi_agent_mcp_keys k JOIN prigenfi_research_agents a ON k.agent_id=a.id
    WHERE k.token_hash=${sha256(bearer)} AND k.revoked_at IS NULL
      AND k.expires_at>now() AND a.revoked_at IS NULL AND a.expires_at>now()
      AND a.chain_id=${config.chainId} LIMIT 1`;
  const issuer = issuers[0];
  if (!issuer || (issuer.auth_kind !== "eoa" && issuer.auth_kind !== "erc1271"))
    return null;
  if (issuer.auth_kind === "erc1271") {
    if (
      !issuer.auth_session_hash ||
      !(await validateContractSession(issuer.auth_session_hash, {
        address: issuer.owner_address,
        chainId: issuer.chain_id,
      }))
    )
      return null;
  }
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
      AND k.auth_kind=${issuer.auth_kind}
      AND (k.auth_kind='eoa' OR k.auth_session_hash=${issuer.auth_session_hash})
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
