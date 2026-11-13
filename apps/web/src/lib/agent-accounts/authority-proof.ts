import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Stored encrypted: a SIWE signature is a reusable authentication credential. */
export type AuthorityProof = { message: string; signature: `0x${string}` };
const validHash = /^[a-f0-9]{64}$/;
const validAddress = /^0x[a-f0-9]{40}$/;
const validSignature = /^0x(?:[0-9a-fA-F]{2}){1,4096}$/;

function keyFromHex(hex: string | undefined): Buffer {
  if (!hex || !validHash.test(hex.toLowerCase()))
    throw new Error("AUTHORITY_PROOF_KEY_UNAVAILABLE");
  return Buffer.from(hex, "hex");
}
function aad(tokenHash: string, owner: string, chainId: number): Buffer {
  if (
    !validHash.test(tokenHash) ||
    !validAddress.test(owner) ||
    !Number.isSafeInteger(chainId)
  )
    throw new Error("INVALID_AUTHORITY_CONTEXT");
  return Buffer.from(`${tokenHash}:${owner}:${chainId}`, "utf8");
}

/** v1 AES-256-GCM, unique random 96-bit IV, owner+chain+session hash bound as AAD. */
export function encryptAuthorityProof(
  value: AuthorityProof,
  proofKey: string | undefined,
  tokenHash: string,
  owner: string,
  chainId: number,
): string {
  if (
    value.message.length < 140 ||
    value.message.length > 2200 ||
    !validSignature.test(value.signature)
  )
    throw new Error("INVALID_AUTHORITY_PROOF");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromHex(proofKey), iv);
  cipher.setAAD(aad(tokenHash, owner, chainId));
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return `v1.${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${payload.toString("hex")}`;
}

/** Never return or log ciphertext errors, recovered credentials or provider URLs. */
export function decryptAuthorityProof(
  encoded: string | null,
  proofKey: string | undefined,
  tokenHash: string,
  owner: string,
  chainId: number,
): AuthorityProof | null {
  if (!encoded || encoded.length > 15000) return null;
  const match =
    /^v1\.([a-f0-9]{24})\.([a-f0-9]{32})\.([a-f0-9]{2,15000})$/.exec(encoded);
  if (!match || match[3].length % 2 !== 0) return null;
  // A missing/invalid operator key must fail closed, never fall back to plaintext.
  const key = keyFromHex(proofKey);
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(match[1], "hex"),
    );
    decipher.setAAD(aad(tokenHash, owner, chainId));
    decipher.setAuthTag(Buffer.from(match[2], "hex"));
    const raw = Buffer.concat([
      decipher.update(Buffer.from(match[3], "hex")),
      decipher.final(),
    ]).toString("utf8");
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const fields = value as Partial<AuthorityProof>;
    if (
      typeof fields.message !== "string" ||
      fields.message.length < 140 ||
      fields.message.length > 2200 ||
      typeof fields.signature !== "string" ||
      !validSignature.test(fields.signature)
    )
      return null;
    return {
      message: fields.message,
      signature: fields.signature as `0x${string}`,
    };
  } catch {
    return null;
  }
}
