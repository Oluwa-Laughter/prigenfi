import { createSiweMessage } from "viem/siwe";
import { getAddress } from "viem";
import { randomBytes } from "node:crypto";
import { authChallengeInput } from "@/lib/agent-accounts/policy";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { agentDb } from "@/lib/agent-accounts/db";
import {
  checkSameOrigin,
  reply,
  jsonBody,
  apiError,
} from "@/lib/agent-accounts/http";
import { sha256 } from "@/lib/agent-accounts/session";
export const runtime = "nodejs";

/** One-time SIWE challenge bound to the operator's approved origin + chain. */
export async function POST(req: Request) {
  try {
    const cfg = agentAccountsConfig();
    if (!checkSameOrigin(req)) return reply({ error: "INVALID_ORIGIN" }, 403);
    let body: unknown;
    try {
      body = await jsonBody(req);
    } catch {
      return reply({ error: "INVALID_REQUEST" }, 400);
    }
    const parsed = authChallengeInput.safeParse(body);
    if (!parsed.success || parsed.data.chainId !== cfg.chainId)
      return reply({ error: "UNSUPPORTED_ACCOUNT_CHAIN" }, 400);
    const address = getAddress(parsed.data.address).toLowerCase();
    const sql = agentDb();
    const nonce = randomBytes(16).toString("hex");
    const issuedAt = new Date();
    const expirationTime = new Date(issuedAt.getTime() + 5 * 60 * 1000);
    const message = createSiweMessage({
      address: getAddress(address),
      domain: cfg.domain,
      uri: cfg.origin + "/agents",
      version: "1",
      chainId: cfg.chainId,
      nonce,
      issuedAt,
      expirationTime,
      statement:
        "Sign in to PrigenFi to manage your research agents. No asset transfer or trading authorization.",
    });
    // Serialize challenge issuance per owner to enforce the per-address cap
    // even when an untrusted client fires concurrent requests.
    const issued = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${address}))`;
      // Retain consumed nonce records for rate limiting; purge old entries.
      await tx`DELETE FROM prigenfi_auth_challenges
        WHERE owner_address=${address} AND created_at<now()-interval '1 day'`;
      const recent = await tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM prigenfi_auth_challenges
        WHERE owner_address=${address} AND created_at>now()-interval '15 minutes'`;
      if (recent[0].count >= 6) return false;
      await tx`INSERT INTO prigenfi_auth_challenges
        (nonce_hash,owner_address,chain_id,message_hash,expires_at)
        VALUES (${sha256(nonce)},${address},${cfg.chainId},${sha256(message)},${expirationTime})`;
      return true;
    });
    if (!issued) return reply({ error: "SIGN_IN_RATE_LIMITED" }, 429);
    return reply({ message, expiresAt: expirationTime.toISOString() });
  } catch (error) {
    return apiError(error);
  }
}
