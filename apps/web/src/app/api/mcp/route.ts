import { createMcpHandler } from "@modelcontextprotocol/server";
import { authorizeRemoteMcp, remoteMcpEnabled } from "@/lib/agent-accounts/mcp";
import { createProfileScopedMcp } from "@/lib/agent-accounts/scoped-mcp-server";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function response(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...noStore, "Content-Type": "application/json" },
  });
}
/**
 * Opt-in service-token MCP preview; does not implement OAuth2.1 discovery yet.
 * Native hosts may omit Origin; browser Origins must match the fixed app origin.
 * The bearer is freshly checked against Postgres on EVERY POST, including
 * handshake, notifications, list tools and every tool call.
 */
export async function POST(req: Request) {
  try {
    if (!remoteMcpEnabled()) return response(503, "REMOTE_MCP_DISABLED");
    const cfg = agentAccountsConfig();
    const origin = req.headers.get("origin");
    if (origin && origin !== cfg.origin) return response(403, "INVALID_ORIGIN");
    if (req.headers.get("host") !== cfg.domain)
      return response(403, "INVALID_HOST");
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return response(415, "INVALID_CONTENT_TYPE");
    const bearer = req.headers
      .get("authorization")
      ?.match(/^Bearer (prf_[a-f0-9]{64})$/)?.[1];
    if (!bearer) return response(401, "AUTHORIZATION_REQUIRED");
    const scope = await authorizeRemoteMcp(bearer);
    if (!scope) return response(401, "RESEARCH_ACCESS_DENIED");
    const handler = createMcpHandler(() => createProfileScopedMcp(scope), {
      legacy: "stateless",
      responseMode: "json",
      maxRequestBodySize: 8192,
      maxSubscriptions: 0,
    });
    try {
      const result = await handler.fetch(req);
      const headers = new Headers(result.headers);
      for (const [key, value] of Object.entries(noStore))
        headers.set(key, value);
      return new Response(result.body, { status: result.status, headers });
    } finally {
      await handler.close();
    }
  } catch {
    return response(503, "MCP_UNAVAILABLE");
  }
}
export async function GET() {
  return response(405, "POST_ONLY");
}
export async function DELETE() {
  return response(405, "POST_ONLY");
}
