import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { currentOwner } from "@/lib/agent-accounts/session";
import { agentDb } from "@/lib/agent-accounts/db";
import { agentRegistrationInput } from "@/lib/agent-accounts/policy";
import {
  checkSameOrigin,
  reply,
  apiError,
  jsonBody,
} from "@/lib/agent-accounts/http";
export const runtime = "nodejs";

type AgentRow = {
  id: string;
  label: string;
  host: string;
  allowed_networks: string[];
  allowed_markets: string[];
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};
function publicRecord(row: AgentRow) {
  return {
    id: row.id,
    label: row.label,
    host: row.host,
    allowedNetworks: row.allowed_networks,
    allowedMarkets: row.allowed_markets,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
    executionAllowed: false,
    permissionType: "research-profile" as const,
  };
}
export async function GET() {
  try {
    agentAccountsConfig();
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const rows = await agentDb()<AgentRow[]>`
      SELECT id,label,host,allowed_networks,allowed_markets,created_at,expires_at,revoked_at
      FROM prigenfi_research_agents
      WHERE owner_address=${owner.address} AND chain_id=${owner.chainId}
      ORDER BY created_at DESC LIMIT 100`;
    return reply({ agents: rows.map(publicRecord), executionAllowed: false });
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
    const parsed = agentRegistrationInput.safeParse(body);
    if (!parsed.success) return reply({ error: "INVALID_AGENT_PROFILE" }, 400);
    const v = parsed.data;
    const sql = agentDb();
    // Serialize one owner's profile writes so concurrent requests cannot
    // exceed the capped set of live research profiles.
    const rows = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${owner.address + ":" + owner.chainId}))`;
      const active = await tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM prigenfi_research_agents
        WHERE owner_address=${owner.address} AND chain_id=${owner.chainId}
        AND revoked_at IS NULL AND expires_at>now()`;
      if (active[0].count >= 20) return null;
      return tx<AgentRow[]>`
        INSERT INTO prigenfi_research_agents
        (owner_address,chain_id,label,host,allowed_networks,allowed_markets,expires_at)
        VALUES (${owner.address},${owner.chainId},${v.label},${v.host},
          ${v.allowedNetworks},${v.allowedMarkets},now()+(${v.durationDays}::integer*interval '1 day'))
        RETURNING id,label,host,allowed_networks,allowed_markets,created_at,expires_at,revoked_at`;
    });
    if (!rows) return reply({ error: "AGENT_PROFILE_LIMIT" }, 409);
    return reply({ agent: publicRecord(rows[0]) }, 201);
  } catch (error) {
    return apiError(error);
  }
}
