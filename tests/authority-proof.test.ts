import { describe, it, expect } from "vitest";
import {
  encryptAuthorityProof,
  decryptAuthorityProof,
} from "../apps/web/src/lib/agent-accounts/authority-proof";

const key = "ab".repeat(32);
const tokenHash = "1f".repeat(32);
const owner = "0x" + "b".repeat(40);
const otherOwner = "0x" + "c".repeat(40);
const message = `prigenfi.test wants you to sign in with your Ethereum account:\n${owner}\n\nResearch-only login, no asset approvals.${"!".repeat(96)}`;
const signature = `0x${"ab".repeat(65)}` as `0x${string}`;
const value = { message, signature };

describe("ERC-1271 SIWE authority material stays encrypted", () => {
  it("roundtrips only in its original session, wallet and chain context", () => {
    const first = encryptAuthorityProof(value, key, tokenHash, owner, 31337);
    const second = encryptAuthorityProof(value, key, tokenHash, owner, 31337);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^v1\.[0-9a-f]{24}\.[0-9a-f]{32}\.[0-9a-f]+$/);
    expect(first).not.toContain(message);
    expect(first).not.toContain(signature.slice(2));
    expect(decryptAuthorityProof(first, key, tokenHash, owner, 31337)).toEqual(
      value,
    );
    expect(
      decryptAuthorityProof(first, key, tokenHash, otherOwner, 31337),
    ).toBeNull();
    expect(
      decryptAuthorityProof(first, key, "2e".repeat(32), owner, 31337),
    ).toBeNull();
    expect(
      decryptAuthorityProof(first, key, tokenHash, owner, 11155111),
    ).toBeNull();
    expect(
      decryptAuthorityProof(first, "cc".repeat(32), tokenHash, owner, 31337),
    ).toBeNull();
  });
  it("rejects tampering with the version, IV, authentication tag and ciphertext", () => {
    const encoded = encryptAuthorityProof(value, key, tokenHash, owner, 31337);
    const parts = encoded.split(".");
    for (const item of [
      "plain." + parts.slice(1).join("."),
      `v1.${"0".repeat(24)}.${parts[2]}.${parts[3]}`,
      `v1.${parts[1]}.${"0".repeat(32)}.${parts[3]}`,
      `v1.${parts[1]}.${parts[2]}.${"0".repeat(parts[3].length)}`,
      "v1.not-a-credential",
      "",
    ])
      expect(
        decryptAuthorityProof(item, key, tokenHash, owner, 31337),
      ).toBeNull();
  });
  it("never accepts an absent operator key, malformed signing proof or oversized payload", () => {
    expect(() =>
      encryptAuthorityProof(value, undefined, tokenHash, owner, 31337),
    ).toThrow();
    expect(() =>
      encryptAuthorityProof(
        { message: "short", signature },
        key,
        tokenHash,
        owner,
        31337,
      ),
    ).toThrow();
    expect(() =>
      encryptAuthorityProof(
        { message, signature: "not-a-signature" as `0x${string}` },
        key,
        tokenHash,
        owner,
        31337,
      ),
    ).toThrow();
    const encoded = encryptAuthorityProof(value, key, tokenHash, owner, 31337);
    expect(() =>
      decryptAuthorityProof(encoded, undefined, tokenHash, owner, 31337),
    ).toThrow();
    expect(
      decryptAuthorityProof("x".repeat(18000), key, tokenHash, owner, 31337),
    ).toBeNull();
  });
});
