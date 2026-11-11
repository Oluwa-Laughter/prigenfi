import { z } from "zod";
import { marketNetworkSchema } from "@prigenfi/shared/market-research";
import { marketDomains } from "@prigenfi/shared/confidential-policy";

export const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const authChallengeInput = z
  .object({
    address: walletAddressSchema,
    chainId: z.number().int().positive(),
  })
  .strict();
export const authVerifyInput = z
  .object({
    message: z.string().min(140).max(2200),
    signature: z.string().regex(/^0x(?:[0-9a-fA-F]{2}){1,4096}$/),
  })
  .strict();
export const agentRegistrationInput = z
  .object({
    label: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .refine(
        (value) =>
          !value.includes("<") &&
          !value.includes(">") &&
          [...value].every(
            (character) =>
              character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
          ),
      ),
    host: z.enum(["codex", "claude", "other"]),
    allowedNetworks: z.array(marketNetworkSchema).min(1).max(6),
    allowedMarkets: z.array(z.enum(marketDomains)).min(1).max(12),
    durationDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.allowedNetworks).size !== value.allowedNetworks.length) {
      ctx.addIssue({
        code: "custom",
        path: ["allowedNetworks"],
        message: "Duplicate networks",
      });
    }
    if (new Set(value.allowedMarkets).size !== value.allowedMarkets.length) {
      ctx.addIssue({
        code: "custom",
        path: ["allowedMarkets"],
        message: "Duplicate markets",
      });
    }
  });
export type AgentRegistrationInput = z.infer<typeof agentRegistrationInput>;
