import { z } from "zod";

const configSchema = z.object({
  PRIGENFI_DATABASE_URL: z.string().min(1),
  PRIGENFI_APP_ORIGIN: z.url(),
  PRIGENFI_AUTH_CHAIN_ID: z.coerce
    .number()
    .int()
    .refine((n) => n === 11155111 || n === 31337),
  PRIGENFI_AUTH_RPC_URL: z.url(),
});

export class AgentAccountsUnavailable extends Error {
  constructor() {
    super("AGENT_ACCOUNTS_NOT_CONFIGURED");
  }
}

/** Fixed, operator-approved origin and testnet chain; never infer auth domain from forwarded headers. */
export function agentAccountsConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) throw new AgentAccountsUnavailable();
  const cfg = parsed.data;
  const origin = new URL(cfg.PRIGENFI_APP_ORIGIN);
  if (
    (origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      )) ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  ) {
    throw new AgentAccountsUnavailable();
  }
  if (
    !["https:", "http:"].includes(new URL(cfg.PRIGENFI_AUTH_RPC_URL).protocol)
  )
    throw new AgentAccountsUnavailable();
  return {
    databaseUrl: cfg.PRIGENFI_DATABASE_URL,
    origin: origin.origin,
    domain: origin.host,
    chainId: cfg.PRIGENFI_AUTH_CHAIN_ID,
    rpcUrl: cfg.PRIGENFI_AUTH_RPC_URL,
    cookieSecure: origin.protocol === "https:",
  };
}
