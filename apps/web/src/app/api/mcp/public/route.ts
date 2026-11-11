import { createMcpHandler } from "@modelcontextprotocol/server";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import {
  publicMcpEnabled,
  consumePublicMcpQuota,
} from "@/lib/agent-accounts/public-mcp";
import { createPublicResearchMcp } from "@/lib/agent-accounts/public-mcp-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function response(
  status: number,
  error: string,
  additional?: Record<string, string>,
) {
  return Response.json(
    { error, executionAllowed: false },
    { status, headers: { ...headers, ...additional } },
  );
}
/** Optional no-install, no-login MCP for public research; strict global DB quota. */
export async function POST(req: Request) {
  try {
    if (!publicMcpEnabled()) return response(503, "PUBLIC_MCP_DISABLED");
    const config = agentAccountsConfig();
    if (req.headers.get("host") !== config.domain)
      return response(403, "INVALID_HOST");
    const origin = req.headers.get("origin");
    if (origin && origin !== config.origin)
      return response(403, "INVALID_ORIGIN");
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return response(415, "INVALID_CONTENT_TYPE");
    if (Number(req.headers.get("content-length") ?? "0") > 8192)
      return response(413, "REQUEST_TOO_LARGE");
    if (!(await consumePublicMcpQuota()))
      return response(429, "PUBLIC_MCP_RATE_LIMIT", { "Retry-After": "60" });
    const handler = createMcpHandler(() => createPublicResearchMcp(), {
      legacy: "stateless",
      responseMode: "json",
      maxRequestBodySize: 8192,
      maxSubscriptions: 0,
    });
    try {
      const result = await handler.fetch(req);
      const responseHeaders = new Headers(result.headers);
      for (const [name, value] of Object.entries(headers))
        responseHeaders.set(name, value);
      return new Response(result.body, {
        status: result.status,
        headers: responseHeaders,
      });
    } finally {
      await handler.close();
    }
  } catch {
    return response(503, "PUBLIC_MCP_UNAVAILABLE");
  }
}
export async function GET() {
  return response(405, "POST_ONLY");
}
export async function DELETE() {
  return response(405, "POST_ONLY");
}
