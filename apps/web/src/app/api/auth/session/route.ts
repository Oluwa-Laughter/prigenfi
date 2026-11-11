import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { currentOwner } from "@/lib/agent-accounts/session";
import { reply, apiError } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    agentAccountsConfig();
    const owner = await currentOwner();
    return reply(
      owner
        ? { authenticated: true, ...owner, executionAllowed: false }
        : { authenticated: false, executionAllowed: false },
    );
  } catch (error) {
    return apiError(error);
  }
}
