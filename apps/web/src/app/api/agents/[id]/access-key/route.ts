import { z } from "zod";
import {
  randomToken,
  currentAuthSession,
  sha256,
} from "@/lib/agent-accounts/session";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { agentDb } from "@/lib/agent-accounts/db";
import { remoteMcpEnabled } from "@/lib/agent-accounts/mcp";
import { checkSameOrigin, reply, apiError } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
const idSchema = z.uuid();
type Context = { params: Promise<{ id: string }> };
async function permitted(request: Request, context: Context) {
  agentAccountsConfig();
  if (!remoteMcpEnabled())
    return { error: reply({ error: "REMOTE_MCP_DISABLED" }, 503) };
  if (!checkSameOrigin(request))
    return { error: reply({ error: "INVALID_ORIGIN" }, 403) };
  const auth = await currentAuthSession();
  if (!auth) return { error: reply({ error: "SIGN_IN_REQUIRED" }, 401) };
  const owner = { address: auth.address, chainId: auth.chainId };
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success)
    return { error: reply({ error: "INVALID_AGENT_ID" }, 400) };
  return { owner, id, auth };
}

export async function POST(req: Request, context: Context) {
  try {
    const access = await permitted(req, context);
    if (access.error) return access.error;
    const { owner, id, auth } = access;
    if (!owner || !id || !auth)
      return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const key = "prf_" + randomToken();
    const sql = agentDb();
    const issued = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const profile = await tx<{ expires_at: Date }[]>`
        SELECT expires_at FROM prigenfi_research_agents WHERE id=${id}
          AND owner_address=${owner.address} AND chain_id=${owner.chainId}
          AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`;
      if (!profile.length) return "PROFILE_NOT_AVAILABLE" as const;
      const recent = await tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM prigenfi_agent_mcp_keys
        WHERE agent_id=${id} AND issued_at>now()-interval '1 hour'`;
      if (recent[0].count >= 5) return "KEY_ISSUANCE_RATE_LIMIT" as const;
      await tx`UPDATE prigenfi_agent_mcp_keys SET revoked_at=now()
        WHERE agent_id=${id} AND revoked_at IS NULL`;
      const rows = await tx<{ expires_at: Date }[]>`
        INSERT INTO prigenfi_agent_mcp_keys(token_hash,agent_id,auth_kind,auth_session_hash,expires_at)
        VALUES (${sha256(key)},${id},${auth.authKind},
          ${auth.authKind === "erc1271" ? auth.tokenHash : null},
          least(${profile[0].expires_at},now()+interval '24 hours',
            ${auth.authKind === "erc1271" ? auth.expiresAt : new Date("9999-01-01T00:00:00.000Z")}))
        RETURNING expires_at`;
      return rows[0].expires_at.toISOString();
    });
    if (issued === "PROFILE_NOT_AVAILABLE")
      return reply({ error: issued }, 404);
    if (issued === "KEY_ISSUANCE_RATE_LIMIT")
      return reply({ error: issued }, 429);
    return reply(
      {
        bearerToken: key,
        issuedOnce: true,
        expiresAt: issued,
        endpoint: agentAccountsConfig().origin + "/api/mcp",
        tokenEnvironmentVariable: "PRIGENFI_MCP_TOKEN",
        permission: "public-market-research-only",
        executionAllowed: false,
        warning:
          "Keep token confidential. It is shown once, is never a wallet signature and cannot authorize transactions.",
      },
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request, context: Context) {
  try {
    const access = await permitted(req, context);
    if (access.error) return access.error;
    const { owner, id } = access;
    if (!owner || !id) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const rows = await agentDb()<[{ id: string }]>`
      UPDATE prigenfi_agent_mcp_keys AS k SET revoked_at=now()
      FROM prigenfi_research_agents a WHERE a.id=k.agent_id AND a.id=${id}
      AND a.owner_address=${owner.address} AND a.chain_id=${owner.chainId}
      AND k.revoked_at IS NULL RETURNING a.id`;
    return reply({
      revoked: true,
      revokedCount: rows.length,
      executionAllowed: false,
    });
  } catch (e) {
    return apiError(e);
  }
}
