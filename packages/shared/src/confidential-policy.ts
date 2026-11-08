import { z } from "zod";
import { confidentialAssets } from "./index";

/** Privacy is a requirement, never a preference the executor can ignore. */
export const marketDomains = [
  "spot",
  "defi",
  "staking",
  "stablecoins",
  "derivatives",
  "emerging-tokens",
  "portfolio",
  "other",
] as const;
export const confidentialMandateSchema = z
  .object({
    market: z.enum(marketDomains),
    instruction: z.string().trim().min(12).max(1200),
    watchAssets: z.string().trim().min(1).max(90),
    suggestedCapitalLimit: z.string().regex(/^\d+(?:\.\d{1,8})?$/),
    privacy: z.literal("confidential-only"),
  })
  .strict()
  .refine(
    (value) =>
      Number(value.suggestedCapitalLimit) > 0 &&
      Number(value.suggestedCapitalLimit) <= 1e9,
    {
      message:
        "Capital ceiling must be positive and within the supported draft range",
      path: ["suggestedCapitalLimit"],
    },
  );
export type ConfidentialMandate = z.infer<typeof confidentialMandateSchema>;

export const confidentialCapabilities = {
  network: "Ethereum Sepolia",
  chainId: 11155111,
  confidentialAssets: confidentialAssets.map((a) => ({
    symbol: a.displaySymbol,
    category: a.category,
    chainId: a.chainId,
    address: a.address,
    testOnly: a.isTestAsset,
  })),
  walletOperations: [
    "shield",
    "wallet-authorized-balance-decryption",
    "confidential-transfer",
    "unshield",
  ],
  privateAgentExecution: false,
  verifiedConfidentialSwapVenues: 0,
  publicExecutionFallback: false,
  marketDomains,
} as const;

/** Called at any boundary that considers converting an intent to a transaction.
 * A validated research mandate cannot bypass the absence of a verified private venue.
 */
export function assessConfidentialTrade(mandate: unknown) {
  const parsed = confidentialMandateSchema.safeParse(mandate);
  if (!parsed.success)
    return {
      acceptedAsResearch: false,
      executionAllowed: false,
      privacy: "confidential-only" as const,
      reasons: ["INVALID_MANDATE"],
    };
  return {
    acceptedAsResearch: true,
    executionAllowed: false,
    privacy: "confidential-only" as const,
    market: parsed.data.market,
    reasons: [
      "NO_VERIFIED_CONFIDENTIAL_TRADE_VENUE",
      "NO_AUTHENTICATED_AGENT_EXECUTION",
      "PUBLIC_FALLBACK_FORBIDDEN",
    ],
    authorizedWalletActions: "none" as const,
  };
}
