/**
 * Isolated local Anvil + PostgreSQL HTTP integration checks; never run on
 * production wallets, mainnet or a live user database.
 */
import assert from "node:assert/strict";
import { createWalletClient, createPublicClient, http } from "viem";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { foundry } from "viem/chains";
import { agentDb } from "../apps/web/src/lib/agent-accounts/db";
import { createHash } from "node:crypto";

const base = process.env.AGENT_AUTH_TEST_URL;
if (!base || !/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base)) {
  throw new Error("AGENT_AUTH_TEST_URL must be a localhost test server");
}
if (process.env.PRIGENFI_AUTH_CHAIN_ID !== "31337")
  throw new Error("Only local Anvil chain allowed");
const provider = createWalletClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545", { timeout: 5000, retryCount: 0 }),
});
const addresses = await provider.getAddresses();
if (addresses.length < 2)
  throw new Error("Two unlocked local Anvil identities required");

type ApiResult = {
  status: number;
  payload: Record<string, unknown>;
  cookie: string;
};
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = base,
): Promise<ApiResult> {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(origin ? { origin } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  const set = response.headers.get("set-cookie") ?? "";
  return { status: response.status, payload, cookie: set.split(";")[0] };
}
function status(result: ApiResult, expected: number, context: string) {
  assert.equal(
    result.status,
    expected,
    `${context}: unexpected HTTP ${result.status}`,
  );
  return result;
}
async function signIn(
  address: (typeof addresses)[number],
  signingAccount = address,
) {
  const challenge = status(
    await call("/api/auth/challenge", "POST", { address, chainId: 31337 }),
    200,
    "challenge",
  );
  assert.equal(typeof challenge.payload.message, "string");
  const message = challenge.payload.message as string;
  const signature = await provider.signMessage({
    account: signingAccount,
    message,
  });
  const verified = status(
    await call("/api/auth/verify", "POST", { message, signature }),
    200,
    "verify",
  );
  assert.equal(verified.payload.authenticated, true);
  assert.match(verified.cookie, /^prigenfi_research_session=[a-f0-9]{64}$/);
  return { cookie: verified.cookie, message, signature };
}

async function main() {
  status(await call("/api/agents"), 401, "public agents read denied");
  status(await call("/api/watchlist"), 401, "public watchlist read denied");
  status(
    await call("/api/workspace/overview"),
    401,
    "public workspace read denied",
  );

  status(
    await call(
      "/api/auth/challenge",
      "POST",
      { address: addresses[0], chainId: 31337 },
      "",
      "https://forged.invalid",
    ),
    403,
    "cross-origin challenge",
  );
  status(
    await call("/api/auth/challenge", "POST", {
      address: addresses[0],
      chainId: 1,
    }),
    400,
    "mainnet chain refused",
  );
  status(
    await call(
      "/api/auth/challenge",
      "POST",
      { address: addresses[0], chainId: 31337 },
      "",
      "",
    ),
    403,
    "missing Origin",
  );
  status(
    await call("/api/agents", "POST", {
      label: "Unauthenticated",
      host: "codex",
      allowedNetworks: ["base"],
      allowedMarkets: ["defi"],
      durationDays: 1,
    }),
    401,
    "unauthenticated registration denied",
  );
  const attempt = status(
    await call("/api/auth/challenge", "POST", {
      address: addresses[0],
      chainId: 31337,
    }),
    200,
    "signed challenge requested",
  );
  const challengeMessage = attempt.payload.message as string;
  const forgedSig = await provider.signMessage({
    account: addresses[1],
    message: challengeMessage,
  });
  status(
    await call("/api/auth/verify", "POST", {
      message: challengeMessage,
      signature: forgedSig,
    }),
    401,
    "wrong key signature refused",
  );
  const originalSig = await provider.signMessage({
    account: addresses[0],
    message: challengeMessage,
  });
  status(
    await call("/api/auth/verify", "POST", {
      message: challengeMessage,
      signature: originalSig,
    }),
    401,
    "used nonce refused",
  );

  const a = await signIn(addresses[0]);
  status(
    await call("/api/auth/verify", "POST", {
      message: a.message,
      signature: a.signature,
    }),
    401,
    "signed nonce replay refused",
  );
  const own = status(
    await call("/api/auth/session", "GET", undefined, a.cookie),
    200,
    "wallet session",
  );
  assert.equal(own.payload.authenticated, true);
  assert.equal(own.payload.executionAllowed, false);
  const emptyWorkspace = status(
    await call("/api/workspace/overview", "GET", undefined, a.cookie),
    200,
    "authenticated empty dashboard",
  );
  assert.equal(emptyWorkspace.payload.source, "owner-authenticated-postgres");
  assert.equal((emptyWorkspace.payload.agents as { active: number }).active, 0);
  assert.equal(
    (emptyWorkspace.payload.watchlist as { total: number }).total,
    0,
  );
  assert.equal(emptyWorkspace.payload.executionAllowed, false);
  const poolA = "0x" + "a".repeat(40);
  for (const invalid of [
    { chain: "solana", pairAddress: poolA },
    { chain: "base", pairAddress: "0x123" },
    { chain: "base", pairAddress: poolA, positionAmount: "secret" },
    { chain: "base", pairAddress: poolA, executionAllowed: true },
  ])
    status(
      await call("/api/watchlist", "POST", invalid, a.cookie),
      400,
      "invalid watchlist record denied",
    );
  status(
    await call(
      "/api/watchlist",
      "POST",
      { chain: "base", pairAddress: poolA },
      a.cookie,
      "https://foreign.invalid",
    ),
    403,
    "cross-origin watchlist denied",
  );
  status(
    await call(
      "/api/watchlist",
      "POST",
      { chain: "base", pairAddress: poolA },
      "",
    ),
    401,
    "unsigned watchlist write denied",
  );
  status(
    await call(
      "/api/watchlist",
      "POST",
      { chain: "base", pairAddress: poolA },
      a.cookie,
    ),
    200,
    "public market saved to owner database",
  );
  // Re-saving a pool is idempotent and cannot bypass the bounded set.
  status(
    await call(
      "/api/watchlist",
      "POST",
      { chain: "base", pairAddress: poolA.toUpperCase().replace("0X", "0x") },
      a.cookie,
    ),
    200,
    "case-insensitive duplicate target",
  );
  const overviewAfterSave = status(
    await call("/api/workspace/overview", "GET", undefined, a.cookie),
    200,
    "saved market appears in dashboard",
  );
  assert.equal(
    (overviewAfterSave.payload.watchlist as { total: number }).total,
    1,
  );
  assert.equal(
    (
      overviewAfterSave.payload.watchlist as {
        saved: { chain: string; pairAddress: string }[];
      }
    ).saved[0].pairAddress,
    poolA,
  );
  const existing = status(
    await call("/api/agents", "GET", undefined, a.cookie),
    200,
    "owner scoped agent read",
  );
  assert.ok(Array.isArray(existing.payload.agents));
  status(
    await call(
      "/api/agents",
      "POST",
      {
        label: "Bad network",
        host: "codex",
        allowedNetworks: ["solana"],
        allowedMarkets: ["defi"],
        durationDays: 1,
      },
      a.cookie,
    ),
    400,
    "unsupported network rejected",
  );
  status(
    await call(
      "/api/agents",
      "POST",
      {
        label: "Duplicate network",
        host: "codex",
        allowedNetworks: ["base", "base"],
        allowedMarkets: ["defi"],
        durationDays: 1,
      },
      a.cookie,
    ),
    400,
    "duplicate scope rejected",
  );
  status(
    await call(
      "/api/agents",
      "POST",
      {
        label: "Cross-origin",
        host: "codex",
        allowedNetworks: ["base"],
        allowedMarkets: ["defi"],
        durationDays: 1,
      },
      a.cookie,
      "https://forged.invalid",
    ),
    403,
    "cross-origin mutation denied",
  );
  const created = status(
    await call(
      "/api/agents",
      "POST",
      {
        label: "Research scope integration check",
        host: "codex",
        allowedNetworks: ["ethereum", "base"],
        allowedMarkets: ["defi", "stablecoins"],
        durationDays: 1,
      },
      a.cookie,
    ),
    201,
    "owner creates research profile",
  );
  const record = created.payload.agent as Record<string, unknown>;
  assert.equal(record.executionAllowed, false);
  assert.equal(record.permissionType, "research-profile");
  assert.deepEqual(record.allowedNetworks, ["ethereum", "base"]);
  assert.deepEqual(record.allowedMarkets, ["defi", "stablecoins"]);
  assert.equal("walletKey" in record, false);
  const id = record.id as string;
  const b = await signIn(addresses[1]);
  const bRead = status(
    await call("/api/agents", "GET", undefined, b.cookie),
    200,
    "other wallet list",
  );
  assert.deepEqual(bRead.payload.agents, []);
  const bOverview = status(
    await call("/api/workspace/overview", "GET", undefined, b.cookie),
    200,
    "other owner dashboard isolated",
  );
  assert.equal((bOverview.payload.watchlist as { total: number }).total, 0);
  const bWatchlist = status(
    await call("/api/watchlist", "GET", undefined, b.cookie),
    200,
    "other owner market list isolated",
  );
  assert.deepEqual(bWatchlist.payload.markets, []);
  status(
    await call(
      "/api/watchlist",
      "DELETE",
      { chain: "base", pairAddress: poolA },
      b.cookie,
    ),
    404,
    "other owner cannot remove saved market",
  );
  status(
    await call(
      "/api/watchlist",
      "DELETE",
      { chain: "base", pairAddress: poolA },
      a.cookie,
      "https://foreign.invalid",
    ),
    403,
    "cross-origin watchlist removal denied",
  );
  status(
    await call(
      "/api/watchlist",
      "DELETE",
      { chain: "base", pairAddress: poolA },
      a.cookie,
    ),
    200,
    "owner deletes saved market",
  );
  status(
    await call(
      "/api/watchlist",
      "DELETE",
      { chain: "base", pairAddress: poolA },
      a.cookie,
    ),
    404,
    "absent saved market cannot be removed twice",
  );
  const ownerAfterDelete = status(
    await call("/api/workspace/overview", "GET", undefined, a.cookie),
    200,
    "owner dashboard refreshed after watchlist removal",
  );
  assert.equal(
    (ownerAfterDelete.payload.watchlist as { total: number }).total,
    0,
  );
  assert.equal(
    (ownerAfterDelete.payload.agents as { active: number }).active,
    1,
  );
  status(
    await call("/api/agents/" + id, "DELETE", undefined, b.cookie),
    404,
    "cross-wallet revocation denied",
  );
  const aRead = status(
    await call("/api/agents", "GET", undefined, a.cookie),
    200,
    "owner sees own research record",
  );
  assert.ok(
    (aRead.payload.agents as { id: string }[]).some((entry) => entry.id === id),
  );
  status(
    await call("/api/agents/" + id, "DELETE", undefined, a.cookie),
    200,
    "owner revokes profile",
  );
  status(
    await call("/api/agents/" + id, "DELETE", undefined, a.cookie),
    404,
    "second revocation rejected",
  );
  const after = status(
    await call("/api/agents", "GET", undefined, a.cookie),
    200,
    "revocation persisted",
  );
  assert.ok(
    (after.payload.agents as { revokedAt: string | null }[])[0].revokedAt,
  );
  status(
    await call("/api/auth/logout", "POST", undefined, a.cookie),
    200,
    "logout",
  );
  status(
    await call("/api/agents", "GET", undefined, a.cookie),
    401,
    "revoked session access denied",
  );
  status(
    await call("/api/workspace/overview", "GET", undefined, a.cookie),
    401,
    "signed-out workspace denied",
  );
  status(
    await call("/api/watchlist", "GET", undefined, a.cookie),
    401,
    "signed-out watchlist denied",
  );
  // Concurrent requests cannot bypass the 20-live-profile owner cap.
  const competing = await Promise.all(
    Array.from({ length: 23 }, (_, index) =>
      call(
        "/api/agents",
        "POST",
        {
          label: "Concurrent research policy " + index,
          host: "codex",
          allowedNetworks: ["base"],
          allowedMarkets: ["defi"],
          durationDays: 1,
        },
        b.cookie,
      ),
    ),
  );
  assert.equal(competing.filter((r) => r.status === 201).length, 20);
  assert.equal(competing.filter((r) => r.status === 409).length, 3);
  // Concurrent writes cannot exceed the owner-bound 25 public pair bookmarks.
  const savedInParallel = await Promise.all(
    Array.from({ length: 29 }, (_, index) =>
      call(
        "/api/watchlist",
        "POST",
        {
          chain: "ethereum",
          pairAddress: "0x" + (index + 1).toString(16).padStart(40, "0"),
        },
        b.cookie,
      ),
    ),
  );
  assert.equal(savedInParallel.filter((x) => x.status === 200).length, 25);
  assert.equal(savedInParallel.filter((x) => x.status === 409).length, 4);
  const watchedCap = status(
    await call("/api/watchlist", "GET", undefined, b.cookie),
    200,
    "bounded owner watchlist",
  );
  assert.equal((watchedCap.payload.markets as unknown[]).length, 25);
  const overviewCap = status(
    await call("/api/workspace/overview", "GET", undefined, b.cookie),
    200,
    "owner aggregate read from database",
  );
  assert.equal((overviewCap.payload.watchlist as { total: number }).total, 25);
  assert.equal(
    (overviewCap.payload.watchlist as { saved: unknown[] }).saved.length,
    5,
  );
  // Explicit deletion requires both owner session and exact confirmation.
  for (const invalid of [
    { clearAll: true },
    { clearAll: true, confirmation: "CLEAR" },
    {
      clearAll: true,
      confirmation: "CLEAR MY MARKETS",
      includePrivateBalances: true,
    },
    { clearAll: false, confirmation: "CLEAR MY MARKETS" },
  ]) {
    status(
      await call("/api/watchlist", "DELETE", invalid, b.cookie),
      400,
      "unconfirmed or extra-field bulk removal rejected",
    );
  }
  const clearPayload = {
    clearAll: true,
    confirmation: "CLEAR MY MARKETS",
  };
  status(
    await call("/api/watchlist", "DELETE", clearPayload, ""),
    401,
    "anonymous full watchlist deletion denied",
  );
  status(
    await call(
      "/api/watchlist",
      "DELETE",
      clearPayload,
      b.cookie,
      "https://forged.invalid",
    ),
    403,
    "cross-origin full watchlist deletion denied",
  );
  const removedAll = status(
    await call("/api/watchlist", "DELETE", clearPayload, b.cookie),
    200,
    "wallet owner clears full public watchlist",
  );
  assert.equal(removedAll.payload.removed, 25);
  assert.equal(removedAll.payload.executionAllowed, false);
  const afterClear = status(
    await call("/api/watchlist", "GET", undefined, b.cookie),
    200,
    "watchlist clear persisted",
  );
  assert.deepEqual(afterClear.payload.markets, []);
  const clearedOverview = status(
    await call("/api/workspace/overview", "GET", undefined, b.cookie),
    200,
    "overview reflects saved market deletion",
  );
  assert.equal(
    (clearedOverview.payload.watchlist as { total: number }).total,
    0,
  );
  // Clearing research bookmarks must not revoke separate agent profiles.
  assert.equal(
    (clearedOverview.payload.agents as { active: number }).active,
    20,
  );
  const clearedTwice = status(
    await call("/api/watchlist", "DELETE", clearPayload, b.cookie),
    200,
    "second explicit clear is idempotent",
  );
  assert.equal(clearedTwice.payload.removed, 0);
  status(
    await call(
      "/api/watchlist",
      "POST",
      { chain: "ethereum", pairAddress: poolA },
      b.cookie,
    ),
    200,
    "save resumes after clear without stale budget",
  );
  assert.equal(
    (
      status(
        await call("/api/watchlist", "GET", undefined, b.cookie),
        200,
        "post-clear re-save",
      ).payload.markets as unknown[]
    ).length,
    1,
  );
  const capped = status(
    await call("/api/agents", "GET", undefined, b.cookie),
    200,
    "per-owner profile cap",
  );
  assert.equal((capped.payload.agents as unknown[]).length, 20);
  status(
    await call("/api/auth/logout", "POST", undefined, b.cookie),
    200,
    "second owner logout",
  );
  // Test-only ERC-1271 smart wallet verified on local Anvil. The identity
  // belongs to this contract while the signature comes from its trusted EOA.
  const artifact = JSON.parse(
    await readFile(
      resolve("contracts/out/LocalAuth1271.sol/LocalAuth1271.json"),
      "utf8",
    ),
  ) as { abi: unknown; bytecode: { object: string } };
  const deployed = await provider.deployContract({
    account: addresses[0],
    abi: artifact.abi as never,
    bytecode: artifact.bytecode.object as `0x${string}`,
    args: [addresses[0]],
  });
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployed,
  });
  assert.ok(
    receipt.contractAddress,
    "Anvil EIP-1271 fixture deployment must confirm",
  );
  const contractAccount = receipt.contractAddress;
  const smart = await signIn(contractAccount, addresses[0]);
  const smartSession = status(
    await call("/api/auth/session", "GET", undefined, smart.cookie),
    200,
    "smart account session",
  );
  assert.equal(
    (smartSession.payload.address as string).toLowerCase(),
    contractAccount.toLowerCase(),
  );
  const smartRecords = status(
    await call("/api/agents", "GET", undefined, smart.cookie),
    200,
    "smart account registry isolated",
  );
  assert.deepEqual(smartRecords.payload.agents, []);
  const encryptedRows = await agentDb()<
    {
      auth_kind: string;
      authority_proof: string | null;
    }[]
  >`
    SELECT auth_kind,authority_proof FROM prigenfi_auth_sessions
      WHERE owner_address=${contractAccount.toLowerCase()} AND auth_kind='erc1271' LIMIT 1`;
  assert.equal(encryptedRows.length, 1);
  assert.match(
    encryptedRows[0].authority_proof ?? "",
    /^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.[a-f0-9]+$/,
  );
  assert.ok(
    !(encryptedRows[0].authority_proof ?? "").includes(
      smart.signature.slice(2),
    ),
  );
  assert.ok(!(encryptedRows[0].authority_proof ?? "").includes(smart.message));
  // The wallet-authenticated read-only MCP bearer must re-check its issuing
  // contract-account signature before each use; neither bearer may trade.
  const smartProfile = status(
    await call(
      "/api/agents",
      "POST",
      {
        label: "Smart account research continuity",
        host: "codex",
        allowedNetworks: ["ethereum"],
        allowedMarkets: ["defi"],
        durationDays: 1,
      },
      smart.cookie,
    ),
    201,
    "smart research profile",
  );
  const smartProfileId = (smartProfile.payload.agent as { id: string }).id;
  const smartKey = status(
    await call(
      `/api/agents/${smartProfileId}/access-key`,
      "POST",
      undefined,
      smart.cookie,
    ),
    201,
    "smart session-bound research key",
  );
  const smartBearer = smartKey.payload.bearerToken as string;
  const checkMcpBearer = (bearer: string) =>
    fetch(base + "/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 888, method: "tools/list" }),
    });
  assert.equal((await checkMcpBearer(smartBearer)).status, 200);
  // Rotating the signer must immediately make an old bearer unusable, even
  // without a subsequent browser request. The invalidation cascades through
  // all linked cookie sessions and scoped research MCP keys.
  const rotationTx = await provider.writeContract({
    account: addresses[0],
    address: contractAccount,
    abi: artifact.abi as never,
    functionName: "setSigner",
    args: [addresses[1]],
  });
  assert.equal(
    (await publicClient.waitForTransactionReceipt({ hash: rotationTx })).status,
    "success",
  );
  assert.equal(
    (await checkMcpBearer(smartBearer)).status,
    401,
    "rotated signer MCP bearer denied immediately",
  );
  const oldSession = status(
    await call("/api/auth/session", "GET", undefined, smart.cookie),
    200,
    "rotated signer browser session status",
  );
  assert.equal(oldSession.payload.authenticated, false);
  status(
    await call("/api/agents", "GET", undefined, smart.cookie),
    401,
    "old signer cannot read research",
  );
  const revokedRows = await agentDb()<{ revoked_at: Date | null }[]>`
    SELECT revoked_at FROM prigenfi_agent_mcp_keys WHERE token_hash=${createHash("sha256").update(smartBearer).digest("hex")}`;
  assert.ok(
    revokedRows[0]?.revoked_at,
    "linked research bearer revoked in Postgres",
  );
  const newSmart = await signIn(contractAccount, addresses[1]);
  assert.equal(
    (await call("/api/auth/session", "GET", undefined, newSmart.cookie)).payload
      .authenticated,
    true,
  );
  assert.equal(
    (await checkMcpBearer(smartBearer)).status,
    401,
    "old key remains denied after new owner sign-in",
  );
  // A new wallet owner can still access the existing research profile, while
  // the old signer cannot reuse its old session or obtain a fresh signature.
  const inherited = status(
    await call("/api/agents", "GET", undefined, newSmart.cookie),
    200,
    "rotated signer research continuity",
  );
  assert.equal((inherited.payload.agents as unknown[]).length, 1);
  const badChallenge = status(
    await call("/api/auth/challenge", "POST", {
      address: contractAccount,
      chainId: 31337,
    }),
    200,
    "old signer cannot authenticate rotated smart wallet",
  );
  const badSignature = await provider.signMessage({
    account: addresses[0],
    message: badChallenge.payload.message as string,
  });
  status(
    await call("/api/auth/verify", "POST", {
      message: badChallenge.payload.message,
      signature: badSignature,
    }),
    401,
    "rotated signer forbidden from new session",
  );
  status(
    await call("/api/auth/logout", "POST", undefined, newSmart.cookie),
    200,
    "new smart owner logout",
  );

  const concurrentChallenges = await Promise.all(
    Array.from({ length: 8 }, () =>
      call("/api/auth/challenge", "POST", {
        address: addresses[0],
        chainId: 31337,
      }),
    ),
  );
  assert.ok(concurrentChallenges.every((r) => [200, 429].includes(r.status)));
  assert.ok(concurrentChallenges.some((r) => r.status === 429));
  assert.ok(concurrentChallenges.filter((r) => r.status === 200).length <= 4);
  process.stdout.write(
    "PASS: Real Anvil EOA and dynamically rotated ERC-1271 signer, encrypted proof at rest, continuous session/MCP revalidation and key revocation, nonce replay, Postgres owner isolation, caps, logout and strict origins. No trades or wallet permissions.\n",
  );
}
await main();
