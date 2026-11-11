import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { agentDb } from "./db";
import { agentAccountsConfig } from "./config";

export const sessionCookieName = "prigenfi_research_session";
export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");

export type SignedInOwner = { address: string; chainId: number };
export async function currentOwner(): Promise<SignedInOwner | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const sql = agentDb();
  const config = agentAccountsConfig();
  const rows = await sql<{ owner_address: string; chain_id: number }[]>`
    SELECT owner_address,chain_id FROM prigenfi_auth_sessions
    WHERE token_hash=${sha256(token)} AND expires_at>now() AND chain_id=${config.chainId}
    LIMIT 1`;
  return rows.length
    ? { address: rows[0].owner_address, chainId: rows[0].chain_id }
    : null;
}
export async function createOwnerSession(owner: SignedInOwner) {
  const token = randomToken();
  const sql = agentDb();
  await sql`INSERT INTO prigenfi_auth_sessions (token_hash,owner_address,chain_id,expires_at)
    VALUES (${sha256(token)},${owner.address},${owner.chainId},now()+interval '2 hours')`;
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    secure: agentAccountsConfig().cookieSecure,
    sameSite: "strict",
    maxAge: 7200,
    path: "/",
  });
}
export async function revokeOwnerSession() {
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    await agentDb()`DELETE FROM prigenfi_auth_sessions WHERE token_hash=${sha256(token)}`;
  }
  store.delete(sessionCookieName);
}
