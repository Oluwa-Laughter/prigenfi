import { it, expect } from "vitest";
import type { ZamaSDK } from "@zama-fhe/sdk";
import { createPublicClient, http } from "viem";
import {
  ConfidentialWallet,
  verifyConfidentialAsset,
} from "../packages/zama/src";
import { confidentialAssets } from "../packages/shared/src";
it("refuses plaintext balance access without explicit consent before touching SDK or RPC", async () => {
  const wallet = new ConfidentialWallet(
    {} as ZamaSDK,
    createPublicClient({ transport: http("http://127.0.0.1:1") }),
  );
  await expect(
    wallet.balance(
      confidentialAssets[0].address,
      "0x0000000000000000000000000000000000000001",
      false,
    ),
  ).rejects.toThrow("EXPLICIT_DECRYPTION_CONSENT_REQUIRED");
});
it.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "refuses confidential wrapper operations on Anvil",
  async () => {
    const client = createPublicClient({
      transport: http("http://127.0.0.1:8545"),
    });
    await expect(
      verifyConfidentialAsset(client, confidentialAssets[0].address),
    ).rejects.toThrow("Sepolia required");
  },
);
