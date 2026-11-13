import {
  createPublicClient,
  http,
  getAddress,
  recoverMessageAddress,
} from "viem";
import { parseSiweMessage } from "viem/siwe";
import { authVerifyInput } from "@/lib/agent-accounts/policy";
import { agentAccountsConfig } from "@/lib/agent-accounts/config";
import { agentDb } from "@/lib/agent-accounts/db";
import {
  checkSameOrigin,
  reply,
  jsonBody,
  apiError,
} from "@/lib/agent-accounts/http";
import { createOwnerSession, sha256 } from "@/lib/agent-accounts/session";
export const runtime = "nodejs";

/** Consumes nonce atomically before signature check: replay and concurrent verify fail. */
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
    const input = authVerifyInput.safeParse(body);
    if (!input.success) return reply({ error: "INVALID_REQUEST" }, 400);
    const { message, signature } = input.data;
    const data = parseSiweMessage(message);
    if (
      !data.nonce ||
      !data.address ||
      !data.issuedAt ||
      !data.expirationTime ||
      data.version !== "1" ||
      data.domain !== cfg.domain ||
      data.uri !== cfg.origin + "/agents" ||
      data.chainId !== cfg.chainId ||
      Number.isNaN(new Date(data.issuedAt).getTime()) ||
      new Date(data.issuedAt).getTime() > Date.now() + 30_000 ||
      new Date(data.issuedAt).getTime() < Date.now() - 6 * 60_000 ||
      new Date(data.expirationTime).getTime() < Date.now() ||
      new Date(data.expirationTime).getTime() > Date.now() + 6 * 60_000
    )
      return reply({ error: "INVALID_SIGN_IN_MESSAGE" }, 401);
    const address = getAddress(data.address).toLowerCase();
    const sql = agentDb();
    const rows = await sql<
      { owner_address: string; chain_id: number; message_hash: string }[]
    >`
      UPDATE prigenfi_auth_challenges SET used_at=now() WHERE nonce_hash=${sha256(data.nonce)}
      AND used_at IS NULL AND expires_at>now() RETURNING owner_address,chain_id,message_hash`;
    if (
      rows.length !== 1 ||
      rows[0].owner_address !== address ||
      rows[0].chain_id !== cfg.chainId ||
      rows[0].message_hash !== sha256(message)
    )
      return reply({ error: "SIGN_IN_CHALLENGE_EXPIRED_OR_USED" }, 401);
    const chain = createPublicClient({
      transport: http(cfg.rpcUrl, { timeout: 6000, retryCount: 0 }),
    });
    const remoteChain = await chain.getChainId();
    if (remoteChain !== cfg.chainId)
      return reply({ error: "WRONG_SIGN_IN_CHAIN" }, 503);
    let verified = false;
    try {
      verified = await chain.verifyMessage({
        address: getAddress(address),
        message,
        signature: `0x${signature.slice(2)}`,
      });
    } catch {
      verified = false;
    }
    if (!verified) return reply({ error: "INVALID_SIGNATURE" }, 401);
    // Classify by the CURRENT chain account bytecode, not by a client flag.
    // ERC-1271 sessions keep an AES-GCM protected proof and are revalidated
    // on EVERY account/MCP access. An EOA session never stores a signature.
    const code = await chain.getBytecode({ address: getAddress(address) });
    let eoaSigned = false;
    try {
      // Never classify a contract wallet as EOA just because a provider
      // temporarily returns empty code. The EOA itself MUST cryptographically
      // recover as the claimed address; an ERC-1271 signature often recovers
      // a different owner address or cannot be ECDSA-recovered at all.
      eoaSigned =
        (
          await recoverMessageAddress({
            message,
            signature: signature as `0x${string}`,
          })
        ).toLowerCase() === address;
    } catch {
      eoaSigned = false;
    }
    const contractAccount = (!!code && code !== "0x") || !eoaSigned;
    await createOwnerSession(
      { address, chainId: cfg.chainId },
      contractAccount
        ? { message, signature: signature as `0x${string}` }
        : null,
    );
    return reply({
      authenticated: true,
      address,
      chainId: cfg.chainId,
      expiresInSeconds: 7200,
    });
  } catch (error) {
    return apiError(error);
  }
}
