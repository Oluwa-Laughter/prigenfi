import { describe, it, expect } from "vitest";
import {
  publicMcpEnabled,
  PUBLIC_MCP_MAX_REQUESTS_PER_MINUTE,
} from "../apps/web/src/lib/agent-accounts/public-mcp";
import {
  agentAccountsConfig,
  AgentAccountsUnavailable,
} from "../apps/web/src/lib/agent-accounts/config";
import {
  agentRegistrationInput,
  authChallengeInput,
  authVerifyInput,
} from "../apps/web/src/lib/agent-accounts/policy";

const local = {
  PRIGENFI_DATABASE_URL: "postgres://test:test@localhost:5432/test_only",
  PRIGENFI_APP_ORIGIN: "http://127.0.0.1:3000",
  PRIGENFI_AUTH_CHAIN_ID: "31337",
  PRIGENFI_AUTH_RPC_URL: "http://127.0.0.1:8545",
};
const example = {
  label: "Owner-approved research",
  host: "codex",
  allowedNetworks: ["ethereum", "base"],
  allowedMarkets: ["defi", "stablecoins"],
  durationDays: 7,
};
describe("wallet ownership and agent research policy configuration", () => {
  it("rejects unconfigured persistence and unsafe web origins", () => {
    expect(() => agentAccountsConfig({})).toThrow(AgentAccountsUnavailable);
    expect(() =>
      agentAccountsConfig({
        ...local,
        PRIGENFI_APP_ORIGIN: "http://prigenfi.example",
      }),
    ).toThrow();
    expect(() =>
      agentAccountsConfig({
        ...local,
        PRIGENFI_APP_ORIGIN: "https://prigenfi.example/path",
      }),
    ).toThrow();
    expect(() =>
      agentAccountsConfig({ ...local, PRIGENFI_AUTH_CHAIN_ID: "1" }),
    ).toThrow();
    expect(() =>
      agentAccountsConfig({
        ...local,
        PRIGENFI_AUTH_RPC_URL: "file:///etc/secrets",
      }),
    ).toThrow();
    expect(agentAccountsConfig(local)).toMatchObject({
      origin: "http://127.0.0.1:3000",
      chainId: 31337,
      cookieSecure: false,
    });
    expect(
      agentAccountsConfig({
        ...local,
        PRIGENFI_APP_ORIGIN: "https://prigenfi.example",
      }).cookieSecure,
    ).toBe(true);
  });
  it("accepts real owner-scoped research metadata and rejects invented permissions", () => {
    expect(agentRegistrationInput.safeParse(example).success).toBe(true);
    for (const invalid of [
      { ...example, label: "" },
      { ...example, label: "<script>alert(1)</script>" },
      { ...example, label: "My\nAgent" },
      { ...example, host: "anonymous-trader" },
      { ...example, allowedNetworks: ["solana"] },
      { ...example, allowedNetworks: ["base", "base"] },
      { ...example, allowedMarkets: ["spot", "spot"] },
      { ...example, allowedMarkets: ["defi", "unsupported"] },
      { ...example, allowedNetworks: [] },
      { ...example, allowedMarkets: [] },
      { ...example, durationDays: 365 },
      { ...example, privateExecutionAllowed: true },
      { ...example, walletSigningKey: "secret" },
    ])
      expect(agentRegistrationInput.safeParse(invalid).success).toBe(false);
  });
  it("requires a full signature, exact account address and chain", () => {
    expect(
      authChallengeInput.safeParse({
        address: "0x" + "1".repeat(40),
        chainId: 31337,
      }).success,
    ).toBe(true);
    expect(
      authChallengeInput.safeParse({
        address: "0xnot-an-address",
        chainId: 31337,
      }).success,
    ).toBe(false);
    expect(
      authVerifyInput.safeParse({
        message: "not-a-siwe-message",
        signature: "0xdeadbeef",
      }).success,
    ).toBe(false);
    expect(
      authVerifyInput.safeParse({
        message: "x".repeat(160),
        signature: "0x123",
      }).success,
    ).toBe(false);
  });
});

describe("anonymous hosted research operator gate", () => {
  it("is disabled unless explicitly opted into and maintains an atomic global quota", () => {
    expect(publicMcpEnabled({})).toBe(false);
    expect(publicMcpEnabled({ PRIGENFI_PUBLIC_MCP_ENABLED: "false" })).toBe(
      false,
    );
    expect(publicMcpEnabled({ PRIGENFI_PUBLIC_MCP_ENABLED: "true" })).toBe(
      true,
    );
    expect(PUBLIC_MCP_MAX_REQUESTS_PER_MINUTE).toBe(60);
  });
});
