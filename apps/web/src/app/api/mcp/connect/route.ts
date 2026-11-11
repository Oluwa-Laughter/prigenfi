import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { remoteMcpEnabled } from "@/lib/agent-accounts/mcp";
import { publicMcpEnabled } from "@/lib/agent-accounts/public-mcp";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const config = agentAccountsConfig();
    return Response.json(
      {
        publicResearch: {
          enabled: publicMcpEnabled(),
          endpoint: publicMcpEnabled()
            ? `${config.origin}/api/mcp/public`
            : null,
          authentication: "none",
        },
        walletScopedResearch: {
          enabled: remoteMcpEnabled(),
          endpoint: remoteMcpEnabled() ? `${config.origin}/api/mcp` : null,
          authentication: "expiring-owner-issued-bearer",
        },
        skillsPath: "/skills/index.json",
        executionAllowed: false,
      },
      { headers },
    );
  } catch {
    return Response.json(
      {
        publicResearch: {
          enabled: false,
          endpoint: null,
          authentication: "none",
        },
        walletScopedResearch: {
          enabled: false,
          endpoint: null,
          authentication: "expiring-owner-issued-bearer",
        },
        skillsPath: "/skills/index.json",
        executionAllowed: false,
      },
      { headers },
    );
  }
}
