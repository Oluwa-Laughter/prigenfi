import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { currentOwner } from "@/lib/agent-accounts/session";
import { remoteMcpEnabled } from "@/lib/agent-accounts/mcp";
import { reply, apiError } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    agentAccountsConfig();
    const owner = await currentOwner();
    return reply(
      owner
        ? {
            authenticated: true,
            ...owner,
            remoteMcpAvailable: remoteMcpEnabled(),
            executionAllowed: false,
          }
        : {
            authenticated: false,
            remoteMcpAvailable: remoteMcpEnabled(),
            executionAllowed: false,
          },
    );
  } catch (error) {
    return apiError(error);
  }
}
