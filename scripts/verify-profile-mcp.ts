/** Disposable Anvil+Postgres+Next.js integration. No real user wallets or trades. */
import assert from "node:assert/strict";
import { createWalletClient, http } from "viem";
import { foundry } from "viem/chains";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const base = process.env.AGENT_AUTH_TEST_URL;
if (
  !base ||
  !/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base) ||
  process.env.PRIGENFI_AUTH_CHAIN_ID !== "31337" ||
  process.env.PRIGENFI_MCP_HTTP_ENABLED !== "true"
)
  throw new Error(
    "Local Anvil, localhost and remote MCP test flag are required",
  );
const wallet = createWalletClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
});
const accounts = await wallet.getAddresses();
if (accounts.length < 5) throw new Error("Five local Anvil wallets needed");
type Json = { status: number; value: Record<string, unknown> };
async function api(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = base,
): Promise<Json & { cookie: string }> {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...(origin ? { origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return {
    status: res.status,
    value: json,
    cookie: (res.headers.get("set-cookie") ?? "").split(";")[0],
  };
}
async function signedIn(address: (typeof accounts)[number]) {
  const challenge = await api("/api/auth/challenge", "POST", {
    address,
    chainId: 31337,
  });
  assert.equal(challenge.status, 200);
  const message = challenge.value.message as string;
  const signature = await wallet.signMessage({ account: address, message });
  const verified = await api("/api/auth/verify", "POST", {
    message,
    signature,
  });
  assert.equal(verified.status, 200);
  assert.match(verified.cookie, /^prigenfi_research_session=[a-f0-9]{64}$/);
  return verified.cookie;
}
async function rpc(token: string, origin?: string) {
  return fetch(base + "/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "Bearer " + token,
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
}
const cookie = await signedIn(accounts[4]);
const other = await signedIn(accounts[3]);
const generated = await api(
  "/api/agents",
  "POST",
  {
    label: "Authenticated scoped HTTP MCP research",
    host: "codex",
    allowedNetworks: ["base"],
    allowedMarkets: ["stablecoins"],
    durationDays: 1,
  },
  cookie,
);
assert.equal(generated.status, 201);
const profileId = (generated.value.agent as Record<string, unknown>)
  .id as string;
const keyPath = "/api/agents/" + profileId + "/access-key";
const notOwner = await api(keyPath, "POST", undefined, other);
assert.equal(notOwner.status, 404);
const noCookie = await api(keyPath, "POST");
assert.equal(noCookie.status, 401);
const crossOrigin = await api(
  keyPath,
  "POST",
  undefined,
  cookie,
  "https://foreign.invalid",
);
assert.equal(crossOrigin.status, 403);
const first = await api(keyPath, "POST", undefined, cookie);
assert.equal(first.status, 201);
assert.equal(first.value.executionAllowed, false);
assert.equal(first.value.permission, "public-market-research-only");
assert.match(first.value.bearerToken as string, /^prf_[0-9a-f]{64}$/);
const token = first.value.bearerToken as string;
assert.equal(await (await rpc("prf_" + "0".repeat(64))).status, 401);
assert.equal(await (await rpc(token, "https://foreign.invalid")).status, 403);
assert.equal(await (await fetch(base + "/api/mcp")).status, 405);
assert.equal(await (await rpc(token)).status, 200);
const transport = new StreamableHTTPClientTransport(
  new URL(base + "/api/mcp"),
  {
    requestInit: { headers: { authorization: "Bearer " + token } },
  },
);
const client = new Client({
  name: "prigenfi-scoped-mcp-real-http-integration",
  version: "0.1.0",
});
await client.connect(transport);
try {
  const tools = (await client.listTools()).tools.map((t) => t.name);
  assert.deepEqual(
    [...tools].sort(),
    [
      "research_scope_get",
      "research_market_search",
      "research_pair_lookup",
      "agent_execution_status",
    ].sort(),
  );
  assert.ok(
    !tools.some(
      (t) =>
        t.startsWith("dev_") || t.includes("wallet") || t.includes("transfer"),
    ),
  );
  const scope = await client.callTool({
    name: "research_scope_get",
    arguments: {},
  });
  const scopeResponse = JSON.parse(
    (scope.content as { text: string }[])[0].text,
  );
  assert.deepEqual(scopeResponse.allowedNetworks, ["base"]);
  assert.deepEqual(scopeResponse.allowedMarkets, ["stablecoins"]);
  assert.equal(scopeResponse.executionAllowed, false);
  const blocked = await client.callTool({
    name: "research_market_search",
    arguments: { chain: "ethereum", market: "stablecoins", query: "USDC" },
  });
  assert.equal(blocked.isError, true);
  assert.ok(JSON.stringify(blocked).includes("RESEARCH_SCOPE_DENIED"));
  const blockedMarket = await client.callTool({
    name: "research_market_search",
    arguments: { chain: "base", market: "derivatives", query: "USDC" },
  });
  assert.equal(blockedMarket.isError, true);
  const deniedPrompt = await client.getPrompt({
    name: "interpret_scoped_research_goal",
    arguments: {
      goal: "Research Ethereum leveraged derivatives",
      network: "ethereum",
      market: "derivatives",
    },
  });
  assert.ok(JSON.stringify(deniedPrompt).includes("RESEARCH_SCOPE_DENIED"));
  const execution = await client.callTool({
    name: "agent_execution_status",
    arguments: {},
  });
  const executionStatus = JSON.parse(
    (execution.content as { text: string }[])[0].text,
  );
  assert.equal(executionStatus.privateExecution, false);
  assert.equal(executionStatus.walletAuthorization, "none");
} finally {
  await client.close().catch(() => {});
}

const rotated = await api(keyPath, "POST", undefined, cookie);
assert.equal(rotated.status, 201);
assert.equal(await (await rpc(token)).status, 401);
const newToken = rotated.value.bearerToken as string;
assert.equal(await (await rpc(newToken)).status, 200);
// Every MCP exchange consumes the atomic per-key one-minute budget.
for (let i = 0; i < 29; i++)
  assert.equal(await (await rpc(newToken)).status, 200);
assert.equal(
  await (
    await rpc(newToken)
  ).status,
  401,
  "31st request per minute is rejected",
);
const revoked = await api(keyPath, "DELETE", undefined, cookie);
assert.equal(revoked.status, 200);
assert.equal(await (await rpc(newToken)).status, 401);
const newer = await api(keyPath, "POST", undefined, cookie);
assert.equal(newer.status, 201);
const thirdToken = newer.value.bearerToken as string;
const revokeProfile = await api(
  "/api/agents/" + profileId,
  "DELETE",
  undefined,
  cookie,
);
assert.equal(revokeProfile.status, 200);
assert.equal(await (await rpc(thirdToken)).status, 401);
await api("/api/auth/logout", "POST", undefined, cookie);
await api("/api/auth/logout", "POST", undefined, other);
process.stdout.write(
  "PASS: Real Streamable HTTP MCP handshake, persisted wallet research profile, forbidden networks/markets, cross-origin denial, token rotation/revocation/profile revocation and no trading tools.\n",
);
