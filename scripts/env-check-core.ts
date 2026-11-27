import { agentAccountsConfig } from "../apps/web/src/lib/agent-accounts/config";

/**
 * Operator configuration readiness. Reports ONLY status codes, never values,
 * hosts or lengths, so its output is safe to paste into an issue or an AI chat.
 */
export type CheckStatus = "ok" | "missing" | "invalid" | "warning" | "danger";
export type EnvCheck = {
  group: string;
  name: string;
  status: CheckStatus;
  detail: string;
};

const SECRET_NAME =
  /(PRIVATE_?KEY|MNEMONIC|SEED_?PHRASE|DEPLOYER_?KEY|SIGNER_?KEY)/i;
const SERVER_ONLY_HINT = /(DATABASE|PROOF_KEY|SECRET|PASSWORD|TOKEN)/i;

function httpsUrl(value: string | undefined): "missing" | "invalid" | "ok" {
  if (!value) return "missing";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password)
      return "invalid";
    return "ok";
  } catch {
    return "invalid";
  }
}

function host(value: string | undefined): string | null {
  try {
    return value ? new URL(value).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function assessOperatorEnvironment(
  env: Record<string, string | undefined>,
): EnvCheck[] {
  const checks: EnvCheck[] = [];
  const add = (
    group: string,
    name: string,
    status: CheckStatus,
    detail: string,
  ) => checks.push({ group, name, status, detail });

  // Hard safety checks first.
  for (const key of Object.keys(env)) {
    if (SECRET_NAME.test(key) && env[key])
      add(
        "safety",
        key,
        "danger",
        "Signing secrets must never be configured for PrigenFi. Remove it and use wallet-mediated signing.",
      );
    if (key.startsWith("NEXT_PUBLIC_") && SERVER_ONLY_HINT.test(key))
      add(
        "safety",
        key,
        "danger",
        "Server-only secret exposed through a NEXT_PUBLIC_ variable.",
      );
  }

  // Browser (public) configuration.
  for (const name of ["NEXT_PUBLIC_SEPOLIA_RPC_URL"]) {
    const status = httpsUrl(env[name]);
    add(
      "web-public",
      name,
      status === "ok" ? "ok" : status === "missing" ? "warning" : "invalid",
      status === "missing"
        ? "Defaults to a public Sepolia RPC."
        : "Public HTTPS RPC for browser reads.",
    );
  }

  // Wallet sign-in + research backend.
  const backendNames = [
    "PRIGENFI_DATABASE_URL",
    "PRIGENFI_APP_ORIGIN",
    "PRIGENFI_AUTH_CHAIN_ID",
    "PRIGENFI_AUTH_RPC_URL",
  ];
  const presentBackend = backendNames.filter((name) => env[name]);
  for (const name of backendNames)
    add(
      "accounts",
      name,
      env[name] ? "ok" : "missing",
      "Required for wallet sign-in and research profiles.",
    );
  if (presentBackend.length > 0) {
    let valid = false;
    let cookieSecure = false;
    try {
      const config = agentAccountsConfig(env as NodeJS.ProcessEnv);
      valid = true;
      cookieSecure = config.cookieSecure;
    } catch {
      valid = false;
    }
    add(
      "accounts",
      "account-service",
      valid ? "ok" : "invalid",
      valid
        ? cookieSecure
          ? "Configuration accepted (HTTPS origin, secure cookies)."
          : "Configuration accepted for localhost only (non-secure cookies)."
        : "Rejected by the app's own validator: origin must be https (or http://localhost), chain 31337 or 11155111, RPC an http(s) URL.",
    );
    const proof = env.PRIGENFI_AUTH_PROOF_KEY;
    add(
      "accounts",
      "PRIGENFI_AUTH_PROOF_KEY",
      !proof ? "warning" : /^[a-fA-F0-9]{64}$/.test(proof) ? "ok" : "invalid",
      !proof
        ? "Missing: smart-wallet (ERC-1271) sign-in will fail closed. Generate 32 random bytes in a secret manager."
        : "Must be exactly 64 hex characters (32 bytes).",
    );
    if (env.PRIGENFI_AUTH_CHAIN_ID === "31337" && cookieSecure)
      add(
        "accounts",
        "PRIGENFI_AUTH_CHAIN_ID",
        "warning",
        "Anvil chain with a public HTTPS origin; use 11155111 for hosted testnets.",
      );
  }

  // Hosted MCP surfaces: off unless deliberately enabled on HTTPS.
  for (const name of [
    "PRIGENFI_MCP_HTTP_ENABLED",
    "PRIGENFI_PUBLIC_MCP_ENABLED",
  ]) {
    const enabled = env[name] === "true";
    const origin = env.PRIGENFI_APP_ORIGIN ?? "";
    add(
      "hosted-mcp",
      name,
      !enabled ? "ok" : origin.startsWith("https://") ? "warning" : "danger",
      !enabled
        ? "Off (default)."
        : origin.startsWith("https://")
          ? "Enabled: requires operator review, monitoring and abuse protection; research-only."
          : "Enabled without an HTTPS origin.",
    );
  }

  // Read-only Sepolia verification CLIs.
  const primary = env.PRIGENFI_VENUE_PRIMARY_RPC;
  const secondary = env.PRIGENFI_VENUE_SECONDARY_RPC;
  for (const [name, value] of [
    ["PRIGENFI_VENUE_PRIMARY_RPC", primary],
    ["PRIGENFI_VENUE_SECONDARY_RPC", secondary],
  ] as const) {
    const status = httpsUrl(value);
    add(
      "venue-quorum",
      name,
      status === "ok" ? "ok" : status === "missing" ? "warning" : "invalid",
      status === "missing"
        ? "Falls back to the built-in public observer."
        : "HTTPS RPC from a separate operator.",
    );
  }
  if (primary && secondary && host(primary) === host(secondary))
    add(
      "venue-quorum",
      "independence",
      "invalid",
      "Primary and secondary RPCs must be different operators.",
    );
  const assess = httpsUrl(env.PRIGENFI_ASSESS_SEPOLIA_RPC);
  add(
    "account-assessment",
    "PRIGENFI_ASSESS_SEPOLIA_RPC",
    assess === "ok" ? "ok" : assess === "missing" ? "warning" : "invalid",
    assess === "missing"
      ? "Needed only for `pnpm assess:account --chain 11155111`."
      : "HTTPS Sepolia RPC.",
  );
  return checks;
}

/** Minimal KEY=VALUE parser for an env file; values are never returned to output. */
export function parseEnvFile(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    env[match[1] as string] = value;
  }
  return env;
}
