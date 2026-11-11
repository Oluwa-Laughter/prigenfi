import { agentDb } from "./db";

export const PUBLIC_MCP_MAX_REQUESTS_PER_MINUTE = 60;
/** Not an authenticated research profile; no personal data or financial authority. */
export function publicMcpEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.PRIGENFI_PUBLIC_MCP_ENABLED === "true";
}

/** Shared, atomic Postgres quota. Never use an in-memory serverless counter. */
export async function consumePublicMcpQuota() {
  const sql = agentDb();
  const rows = await sql<{ request_count: number }[]>`
    INSERT INTO prigenfi_public_mcp_quota (singleton,window_started_at,request_count)
    VALUES (true,now(),1)
    ON CONFLICT (singleton) DO UPDATE SET
      request_count=CASE
        WHEN prigenfi_public_mcp_quota.window_started_at<=now()-interval '1 minute'
        THEN 1 ELSE prigenfi_public_mcp_quota.request_count+1 END,
      window_started_at=CASE
        WHEN prigenfi_public_mcp_quota.window_started_at<=now()-interval '1 minute'
        THEN now() ELSE prigenfi_public_mcp_quota.window_started_at END
    WHERE prigenfi_public_mcp_quota.window_started_at<=now()-interval '1 minute'
      OR prigenfi_public_mcp_quota.request_count<${PUBLIC_MCP_MAX_REQUESTS_PER_MINUTE}
    RETURNING request_count`;
  return rows.length === 1;
}
