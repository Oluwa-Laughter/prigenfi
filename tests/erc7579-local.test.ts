import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startEphemeralAnvil } from "./helpers/ephemeral-anvil";
import {
  type Abi,
  type Address,
  type Hex,
  createPublicClient,
  createTestClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
} from "viem";
import { anvil } from "viem/chains";
import {
  assessErc7579Account,
  erc7579ReaderFromClient,
} from "../packages/shared/src/erc7579-assessment";

// Private throwaway chain: impersonation and timestamp control here must not
// disturb the shared Anvil used by the vault/MCP integration tests.
let RPC = "";
let node: Awaited<ReturnType<typeof startEphemeralAnvil>> | undefined;
const FIXTURES = "contracts/out/Erc7579Fixtures.sol";

async function artifact(name: string): Promise<{ abi: Abi; bytecode: Hex }> {
  const json = JSON.parse(
    await readFile(resolve(FIXTURES, `${name}.json`), "utf8"),
  ) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: json.abi, bytecode: json.bytecode.object };
}

describe.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "ERC-7579 assessment against live Anvil fixtures",
  () => {
    beforeAll(async () => {
      node = await startEphemeralAnvil();
      RPC = node.url;
    }, 30_000);
    afterAll(async () => {
      await node?.stop();
    });

    it("classifies real deployed bytecode without sending any account transaction", async () => {
      if (!["127.0.0.1", "localhost"].includes(new URL(RPC).hostname))
        throw new Error("Local RPC required");
      const publicClient = createPublicClient({
        chain: anvil,
        transport: http(RPC),
        pollingInterval: 100,
      });
      expect(await publicClient.getChainId()).toBe(31337);
      const wallet = createWalletClient({ chain: anvil, transport: http(RPC) });
      const testClient = createTestClient({
        chain: anvil,
        mode: "anvil",
        transport: http(RPC),
      });
      const [deployer] = await wallet.getAddresses();
      if (!deployer) throw new Error("Unlocked local deployer required");

      async function deploy(
        name: string,
        args: unknown[] = [],
      ): Promise<Address> {
        const { abi, bytecode } = await artifact(name);
        const hash = await wallet.deployContract({
          account: deployer,
          abi,
          bytecode,
          args,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success" || !receipt.contractAddress)
          throw new Error(`Fixture ${name} deployment failed`);
        return getAddress(receipt.contractAddress);
      }

      const validator = await deploy("LocalDenyAllValidator");
      const ozAccount = await deploy("LocalOzErc7579Account", [validator]);
      const overclaimer = await deploy("LocalOverclaimingAccount");
      const malformed = await deploy("LocalMalformedAccount");
      const plain = await deploy("LocalPlainContract");
      const reader = erc7579ReaderFromClient(publicClient);
      const nonceBefore = await publicClient.getTransactionCount({
        address: deployer,
      });

      const oz = await assessErc7579Account(reader, {
        chainId: 31337,
        account: ozAccount,
        modules: [
          { kind: "validator", address: validator },
          { kind: "executor", address: validator },
        ],
      });
      expect(oz.classification).toBe("self-reported-erc7579");
      expect(oz.codeKind).toBe("contract");
      expect(oz.selfReported.accountId).toBe(
        "@openzeppelin/contracts.AccountERC7579.v1.0.0",
      );
      expect(oz.selfReported.accountIdWellFormed).toBe(true);
      expect(oz.selfReported.modules).toEqual({
        validator: true,
        executor: true,
        fallback: true,
        hook: false,
      });
      expect(oz.selfReported.executionModes).toEqual({
        "single/revert": true,
        "single/try": true,
        "batch/revert": true,
        "batch/try": true,
        "staticcall/revert": false,
        "delegatecall/revert": true,
        "delegatecall/try": true,
      });
      expect(oz.selfReported.erc1271).toBe("rejects-probe");
      expect(oz.moduleChecks).toEqual([
        {
          kind: "validator",
          address: validator,
          hasCode: true,
          declaresType: true,
          reportedInstalled: true,
        },
        {
          kind: "executor",
          address: validator,
          hasCode: true,
          declaresType: false,
          reportedInstalled: false,
        },
      ]);
      expect(oz.riskFlags).toContain("DELEGATECALL_EXECUTION_SUPPORTED");
      expect(oz.findings).toEqual(["IMPLEMENTATION_NOT_IN_REVIEWED_REGISTRY"]);
      const ozCode = await publicClient.getCode({ address: ozAccount });
      expect(oz.identityCodeHash).toBe(keccak256(ozCode as Hex));

      const lying = await assessErc7579Account(reader, {
        chainId: 31337,
        account: overclaimer,
      });
      expect(lying.classification).toBe("self-reported-unreliable");
      expect(lying.findings).toEqual(
        expect.arrayContaining([
          "CLAIMS_UNDEFINED_CAPABILITY",
          "REPORTS_CODELESS_MODULE_INSTALLED",
          "ERC1271_ACCEPTS_EMPTY_SIGNATURE",
        ]),
      );

      const broken = await assessErc7579Account(reader, {
        chainId: 31337,
        account: malformed,
      });
      expect(broken.classification).toBe("self-reported-unreliable");
      expect(broken.findings).toEqual(
        expect.arrayContaining([
          "CONFIG_RETURNED_NON_BOOLEAN",
          "CONFIG_FUNCTION_REVERTED",
        ]),
      );

      const ordinary = await assessErc7579Account(reader, {
        chainId: 31337,
        account: plain,
      });
      expect(ordinary.classification).toBe("not-erc7579");
      expect(ordinary.findings).toContain("ACCOUNT_ID_UNAVAILABLE");

      const eoa = await assessErc7579Account(reader, {
        chainId: 31337,
        account: deployer,
      });
      expect(eoa.classification).toBe("no-contract-code");

      // EIP-7702 designator written by the local node, not by any key holder.
      const delegated = getAddress(
        "0x7702000000000000000000000000000000007702",
      );
      await testClient.setCode({
        address: delegated,
        bytecode: `0xef0100${ozAccount.slice(2).toLowerCase()}`,
      });
      const seven = await assessErc7579Account(reader, {
        chainId: 31337,
        account: delegated,
      });
      expect(seven.codeKind).toBe("eip7702-delegated-eoa");
      expect(seven.implementationAddress).toBe(ozAccount);
      expect(seven.identityCodeHash).toBe(oz.identityCodeHash);
      expect(seven.riskFlags).toContain("EIP7702_EOA_KEY_RETAINS_FULL_CONTROL");

      const wrong = await assessErc7579Account(reader, {
        chainId: 11155111,
        account: ozAccount,
      });
      expect(wrong.findings).toEqual(["WRONG_CHAIN"]);

      // A dead transport must never be read as "unsupported".
      const dead = createPublicClient({
        chain: anvil,
        transport: http("http://127.0.0.1:9", { retryCount: 0, timeout: 1000 }),
      });
      const offline = await assessErc7579Account(
        erc7579ReaderFromClient(dead),
        {
          chainId: 31337,
          account: ozAccount,
        },
      );
      expect(offline.classification).toBe("assessment-failed");

      for (const result of [
        oz,
        lying,
        broken,
        ordinary,
        eoa,
        seven,
        wrong,
        offline,
      ]) {
        expect(result.executionAllowed).toBe(false);
        expect(result.canSign).toBe(false);
        expect(result.canInstallModule).toBe(false);
        expect(result.canGrantSession).toBe(false);
      }
      // Assessment itself sent nothing.
      expect(
        await publicClient.getTransactionCount({ address: deployer }),
      ).toBe(nonceBefore);
    }, 60_000);
  },
);
