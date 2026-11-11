import { z } from "zod";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { currentOwner } from "@/lib/agent-accounts/session";
import { agentDb } from "@/lib/agent-accounts/db";
import { checkSameOrigin, reply, apiError } from "@/lib/agent-accounts/http";
export const runtime = "nodejs";
const idSchema = z.uuid();
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    agentAccountsConfig();
    if (!checkSameOrigin(req)) return reply({ error: "INVALID_ORIGIN" }, 403);
    const owner = await currentOwner();
    if (!owner) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    const { id } = await context.params;
    if (!idSchema.safeParse(id).success)
      return reply({ error: "INVALID_AGENT_ID" }, 400);
    const rows = await agentDb()<[{ id: string }]>`
      UPDATE prigenfi_research_agents SET revoked_at=now()
      WHERE id=${id} AND owner_address=${owner.address} AND chain_id=${owner.chainId}
      AND revoked_at IS NULL RETURNING id`;
    return rows.length === 1
      ? reply({ revoked: true, id, executionAllowed: false })
      : reply({ error: "AGENT_PROFILE_NOT_FOUND" }, 404);
  } catch (error) {
    return apiError(error);
  }
}
