import { createHash, randomBytes } from "node:crypto";
import { createPublicClient, getAddress, http } from "viem";
import { cookies } from "next/headers";
import { agentDb } from "./db";
import { AgentAccountsUnavailable, agentAccountsConfig } from "./config";
import {
  decryptAuthorityProof,
  encryptAuthorityProof,
  type AuthorityProof,
} from "./authority-proof";

export const sessionCookieName = "prigenfi_research_session";
export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");

export type SignedInOwner = { address: string; chainId: number };
type SessionRow = {
  token_hash: string;
  owner_address: string;
  chain_id: number;
  auth_kind: string;
  authority_proof: string | null;
  expires_at: Date;
};
export type CurrentAuthSession = SignedInOwner & {
  authKind: "eoa" | "erc1271";
  tokenHash: string;
  expiresAt: Date;
};

/**
 * Detect a stale contract-owner signature and atomically revoke every browser
 * session and every hosted research MCP bearer for that owner/chain.
 * Guard with the original row's existence: a concurrent NEW owner's login must
 * not be revoked by a delayed check on an already-deleted old session.
 */
async function revokeContractOwnerAuthority(row: SessionRow) {
  const sql = agentDb();
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${row.owner_address + ":" + row.chain_id + ":contract-auth"}))`;
    const existing = await tx<{ token_hash: string }[]>`
      SELECT token_hash FROM prigenfi_auth_sessions
      WHERE token_hash=${row.token_hash} AND owner_address=${row.owner_address}
        AND chain_id=${row.chain_id} AND auth_kind='erc1271' FOR UPDATE`;
    if (existing.length === 0) return;
    await tx`DELETE FROM prigenfi_auth_sessions
      WHERE owner_address=${row.owner_address} AND chain_id=${row.chain_id}
        AND auth_kind='erc1271'`;
    await tx`UPDATE prigenfi_agent_mcp_keys k SET revoked_at=now()
      FROM prigenfi_research_agents a WHERE k.agent_id=a.id
        AND a.owner_address=${row.owner_address} AND a.chain_id=${row.chain_id}
        AND k.revoked_at IS NULL`;
  });
}

/**
 * Re-evaluate the original authenticated ERC-1271 signature at the account's
 * CURRENT chain state. No cached signature validity and no plaintext proof in
 * database, API responses, MCP prompts or logs.
 */
export async function validateContractSession(
  tokenHash: string,
  expectedOwner?: SignedInOwner,
): Promise<CurrentAuthSession | null> {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) return null;
  const cfg = agentAccountsConfig();
  const sql = agentDb();
  const rows = await sql<SessionRow[]>`
    SELECT token_hash,owner_address,chain_id,auth_kind,authority_proof,expires_at
    FROM prigenfi_auth_sessions WHERE token_hash=${tokenHash}
      AND expires_at>now() AND chain_id=${cfg.chainId} LIMIT 1`;
  const row = rows[0];
  if (
    !row ||
    row.auth_kind !== "erc1271" ||
    (expectedOwner &&
      (row.owner_address !== expectedOwner.address ||
        row.chain_id !== expectedOwner.chainId))
  )
    return null;
  if (!cfg.authProofKey) throw new AgentAccountsUnavailable();
  const proof = decryptAuthorityProof(
    row.authority_proof,
    cfg.authProofKey,
    row.token_hash,
    row.owner_address,
    row.chain_id,
  );
  if (!proof) {
    await revokeContractOwnerAuthority(row);
    return null;
  }
  const chain = createPublicClient({
    transport: http(cfg.rpcUrl, { timeout: 6000, retryCount: 0 }),
  });
  // On RPC outages return 503, not an unverified authenticated owner; keep
  // saved state intact until actual on-chain revocation can be established.
  let valid: boolean;
  try {
    if ((await chain.getChainId()) !== row.chain_id)
      throw new Error("CHAIN_MISMATCH");
    const account = getAddress(row.owner_address);
    const code = await chain.getBytecode({ address: account });
    valid =
      !!code &&
      code !== "0x" &&
      (await chain.verifyMessage({
        address: account,
        message: proof.message,
        signature: proof.signature,
      }));
  } catch {
    throw new AgentAccountsUnavailable();
  }
  if (!valid) {
    await revokeContractOwnerAuthority(row);
    return null;
  }
  // A concurrent logout, security revocation, expiry or account re-login
  // must invalidate the response even if the RPC validation just passed.
  const stillActive = await sql<{ token_hash: string }[]>`
    SELECT token_hash FROM prigenfi_auth_sessions WHERE token_hash=${row.token_hash}
    AND auth_kind='erc1271' AND expires_at>now() LIMIT 1`;
  if (!stillActive.length) return null;
  return {
    address: row.owner_address,
    chainId: row.chain_id,
    authKind: "erc1271",
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
  };
}

/** Internal session identity, never returned with a token hash to the browser. */
export async function currentAuthSession(): Promise<CurrentAuthSession | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const cfg = agentAccountsConfig();
  const tokenHash = sha256(token);
  const rows = await agentDb()<SessionRow[]>`
    SELECT token_hash,owner_address,chain_id,auth_kind,authority_proof,expires_at
    FROM prigenfi_auth_sessions WHERE token_hash=${tokenHash}
      AND expires_at>now() AND chain_id=${cfg.chainId} LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  if (row.auth_kind === "eoa")
    return {
      address: row.owner_address,
      chainId: row.chain_id,
      authKind: "eoa",
      tokenHash,
      expiresAt: row.expires_at,
    };
  if (row.auth_kind !== "erc1271") return null;
  return validateContractSession(tokenHash, {
    address: row.owner_address,
    chainId: row.chain_id,
  });
}

export async function currentOwner(): Promise<SignedInOwner | null> {
  const session = await currentAuthSession();
  return session
    ? { address: session.address, chainId: session.chainId }
    : null;
}

/**
 * Fresh contract-wallet login atomically invalidates old cookies and hosted
 * MCP keys, including keys minted by a signer now removed from that wallet.
 */
export async function createOwnerSession(
  owner: SignedInOwner,
  proof: AuthorityProof | null = null,
) {
  const token = randomToken();
  const tokenHash = sha256(token);
  const cfg = agentAccountsConfig();
  const encodedProof = proof
    ? encryptAuthorityProof(
        proof,
        cfg.authProofKey,
        tokenHash,
        owner.address,
        owner.chainId,
      )
    : null;
  await agentDb().begin(async (tx) => {
    if (proof) {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${owner.address + ":" + owner.chainId + ":contract-auth"}))`;
      await tx`DELETE FROM prigenfi_auth_sessions WHERE owner_address=${owner.address}
        AND chain_id=${owner.chainId} AND auth_kind='erc1271'`;
      await tx`UPDATE prigenfi_agent_mcp_keys k SET revoked_at=now()
        FROM prigenfi_research_agents a WHERE k.agent_id=a.id
          AND a.owner_address=${owner.address} AND a.chain_id=${owner.chainId}
          AND k.revoked_at IS NULL`;
    }
    await tx`INSERT INTO prigenfi_auth_sessions
      (token_hash,owner_address,chain_id,auth_kind,authority_proof,expires_at)
      VALUES (${tokenHash},${owner.address},${owner.chainId},${proof ? "erc1271" : "eoa"},
        ${encodedProof},now()+interval '2 hours')`;
  });
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    secure: cfg.cookieSecure,
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
