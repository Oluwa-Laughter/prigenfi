import { describe, expect, it } from "vitest";
import {
  assessOperatorEnvironment,
  parseEnvFile,
} from "../scripts/env-check-core";

const SECRET_VALUES = [
  "postgres://user:SuperSecretPassw0rd@db.internal.example:5432/prigenfi",
  "a".repeat(64),
  "https://sepolia.provider.example/v3/PROVIDER_KEY_123456",
  "placeholder-not-a-real-signing-key",
];

const goodBackend = {
  PRIGENFI_DATABASE_URL: SECRET_VALUES[0],
  PRIGENFI_APP_ORIGIN: "https://app.prigenfi.example",
  PRIGENFI_AUTH_CHAIN_ID: "11155111",
  PRIGENFI_AUTH_RPC_URL: SECRET_VALUES[2],
  PRIGENFI_AUTH_PROOF_KEY: SECRET_VALUES[1],
};
const find = (
  checks: ReturnType<typeof assessOperatorEnvironment>,
  name: string,
) => checks.find((check) => check.name === name);

describe("operator environment check", () => {
  it("never echoes configured values, hosts or secrets", () => {
    const checks = assessOperatorEnvironment({
      ...goodBackend,
      DEPLOYER_PRIVATE_KEY: SECRET_VALUES[3],
      PRIGENFI_VENUE_PRIMARY_RPC: SECRET_VALUES[2],
      PRIGENFI_ASSESS_SEPOLIA_RPC: SECRET_VALUES[2],
    });
    const output = JSON.stringify(checks);
    for (const value of SECRET_VALUES) expect(output).not.toContain(value);
    expect(output).not.toContain("provider.example");
    expect(output).not.toContain("db.internal");
  });

  it("accepts a complete HTTPS testnet backend", () => {
    const checks = assessOperatorEnvironment(goodBackend);
    expect(find(checks, "account-service")?.status).toBe("ok");
    expect(find(checks, "PRIGENFI_AUTH_PROOF_KEY")?.status).toBe("ok");
    expect(
      checks.some((c) => c.status === "danger" || c.status === "invalid"),
    ).toBe(false);
  });

  it("flags signing secrets and NEXT_PUBLIC server secrets as danger", () => {
    const checks = assessOperatorEnvironment({
      SEPOLIA_PRIVATE_KEY: "x",
      WALLET_MNEMONIC: "x",
      NEXT_PUBLIC_DATABASE_URL: "x",
    });
    expect(
      checks
        .filter((c) => c.status === "danger")
        .map((c) => c.name)
        .sort(),
    ).toEqual([
      "NEXT_PUBLIC_DATABASE_URL",
      "SEPOLIA_PRIVATE_KEY",
      "WALLET_MNEMONIC",
    ]);
  });

  it("rejects what the app itself rejects", () => {
    for (const bad of [
      { PRIGENFI_APP_ORIGIN: "http://app.prigenfi.example" },
      { PRIGENFI_APP_ORIGIN: "https://app.prigenfi.example/path" },
      { PRIGENFI_AUTH_CHAIN_ID: "1" },
    ]) {
      expect(
        find(
          assessOperatorEnvironment({ ...goodBackend, ...bad }),
          "account-service",
        )?.status,
      ).toBe("invalid");
    }
    expect(
      find(
        assessOperatorEnvironment({
          ...goodBackend,
          PRIGENFI_AUTH_PROOF_KEY: "short",
        }),
        "PRIGENFI_AUTH_PROOF_KEY",
      )?.status,
    ).toBe("invalid");
    expect(
      find(
        assessOperatorEnvironment({
          ...goodBackend,
          PRIGENFI_AUTH_PROOF_KEY: undefined,
        }),
        "PRIGENFI_AUTH_PROOF_KEY",
      )?.status,
    ).toBe("warning");
  });

  it("requires independent venue RPC operators and HTTPS-only hosted MCP", () => {
    const sameHost = assessOperatorEnvironment({
      PRIGENFI_VENUE_PRIMARY_RPC: "https://rpc.example/a",
      PRIGENFI_VENUE_SECONDARY_RPC: "https://rpc.example/b",
    });
    expect(find(sameHost, "independence")?.status).toBe("invalid");
    const insecureMcp = assessOperatorEnvironment({
      PRIGENFI_MCP_HTTP_ENABLED: "true",
      PRIGENFI_APP_ORIGIN: "http://localhost:3000",
    });
    expect(find(insecureMcp, "PRIGENFI_MCP_HTTP_ENABLED")?.status).toBe(
      "danger",
    );
    expect(
      find(assessOperatorEnvironment({}), "PRIGENFI_PUBLIC_MCP_ENABLED")
        ?.status,
    ).toBe("ok");
  });

  it("parses env files without interpreting them", () => {
    expect(
      parseEnvFile(
        "# comment\nexport A=1\nB='two words'\nC=\"3\"\n  \nnot a line\nD=$(rm -rf /)",
      ),
    ).toEqual({ A: "1", B: "two words", C: "3", D: "$(rm -rf /)" });
  });
});
