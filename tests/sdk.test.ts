import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createPublicClient, http, getAddress } from "viem";
import { verifyVault, PrigenFiClient } from "../packages/sdk/src";
it.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "checks actual vault runtime and rejects token pretending to be vault",
  async () => {
    const d = JSON.parse(await readFile(".local/deployment.json", "utf8"));
    const client = createPublicClient({ transport: http(d.rpcUrl) });
    expect(getAddress(await verifyVault(client, d.vault))).toBe(
      getAddress(d.owner),
    );
    await expect(verifyVault(client, d.token)).rejects.toThrow(
      "UNVERIFIED_VAULT",
    );
    const wrong = new PrigenFiClient({
      rpcUrl: d.rpcUrl,
      chainId: 11155111,
      vault: d.vault,
      agent: d.agent,
      token: d.token,
    });
    await expect(wrong.policy()).rejects.toThrow("RPC_CHAIN_MISMATCH");
  },
);
