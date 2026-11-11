import { NextResponse } from "next/server";
import { AgentAccountsUnavailable, agentAccountsConfig } from "./config";

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: securityHeaders });
}
export function checkSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return origin !== null && origin === agentAccountsConfig().origin;
}
export function apiError(error: unknown) {
  if (error instanceof AgentAccountsUnavailable)
    return reply({ error: "AGENT_ACCOUNTS_UNAVAILABLE" }, 503);
  // Never leak DB details, signatures, private strategy metadata or infrastructure URLs.
  return reply({ error: "REQUEST_UNAVAILABLE" }, 503);
}
export async function jsonBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json"))
    throw new Error("UNSUPPORTED_CONTENT_TYPE");
  if (Number(req.headers.get("content-length") ?? 0) > 4096)
    throw new Error("BODY_TOO_LARGE");
  const text = await req.text();
  if (text.length > 4096) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(text) as unknown;
}
