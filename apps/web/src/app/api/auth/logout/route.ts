import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { revokeOwnerSession } from "@/lib/agent-accounts/session";
import { checkSameOrigin, reply, apiError } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    agentAccountsConfig();
    if (!checkSameOrigin(req)) return reply({ error: "INVALID_ORIGIN" }, 403);
    await revokeOwnerSession();
    return reply({ authenticated: false });
  } catch (error) {
    return apiError(error);
  }
}
