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
  decodeEventLog,
  encodeFunctionData,
  encodePacked,
  getAddress,
  http,
  parseEther,
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

async function artifact(
  file: string,
  name: string,
): Promise<{ abi: Abi; bytecode: Hex }> {
  const json = JSON.parse(
    await readFile(resolve("contracts/out", file, `${name}.json`), "utf8"),
  ) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: json.abi, bytecode: json.bytecode.object };
}

describe.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "Prototype account session lifecycle on live Anvil",
  () => {
    beforeAll(async () => {
      node = await startEphemeralAnvil();
      RPC = node.url;
    }, 30_000);
    afterAll(async () => {
      await node?.stop();
    });

    it("grants, uses, bounds and revokes an agent session without keys", async () => {
      if (!["127.0.0.1", "localhost"].includes(new URL(RPC).hostname))
        throw new Error("Local RPC required");
      const transport = http(RPC);
      const publicClient = createPublicClient({
        chain: anvil,
        transport,
        pollingInterval: 100,
      });
      expect(await publicClient.getChainId()).toBe(31337);
      const wallet = createWalletClient({ chain: anvil, transport });
      const testClient = createTestClient({
        chain: anvil,
        mode: "anvil",
        transport,
      });
      const [deployer, owner, agent, outsider] = await wallet.getAddresses();
      if (!deployer || !owner || !agent || !outsider)
        throw new Error("Four unlocked local accounts required");

      const account = await artifact(
        "PrigenAccountPrototype.sol",
        "PrigenAccountPrototype",
      );
      const executor = await artifact(
        "SessionCallExecutor.sol",
        "SessionCallExecutor",
      );
      const target = await artifact(
        "SessionCallExecutor.t.sol",
        "LocalSessionTarget",
      );

      async function mined(hash: Hex) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success")
          throw new Error("Transaction reverted");
        return receipt;
      }
      async function deploy(
        item: { abi: Abi; bytecode: Hex },
        args: unknown[] = [],
      ): Promise<Address> {
        const receipt = await mined(
          await wallet.deployContract({ account: deployer, ...item, args }),
        );
        if (!receipt.contractAddress) throw new Error("No contract address");
        return getAddress(receipt.contractAddress);
      }

      const accountAddress = await deploy(account, [owner]);
      const executorAddress = await deploy(executor);
      const targetAddress = await deploy(target);
      const entryPoint = (await publicClient.readContract({
        address: accountAddress,
        abi: account.abi,
        functionName: "entryPoint",
      })) as Address;

      // Stand-in for an owner-signed UserOperation: the local node lets the
      // canonical EntryPoint address call execute(). No key is involved.
      await testClient.impersonateAccount({ address: entryPoint });
      await testClient.setBalance({
        address: entryPoint,
        value: parseEther("1"),
      });
      const ownerExecute = async (to: Address, data: Hex) =>
        mined(
          await wallet.writeContract({
            account: entryPoint,
            address: accountAddress,
            abi: account.abi,
            functionName: "execute",
            args: [
              `0x${"0".repeat(64)}`,
              encodePacked(["address", "uint256", "bytes"], [to, 0n, data]),
            ],
          }),
        );

      const assessed = await assessErc7579Account(
        erc7579ReaderFromClient(publicClient),
        {
          chainId: 31337,
          account: accountAddress,
          modules: [{ kind: "executor", address: executorAddress }],
        },
      );
      expect(assessed.classification).toBe("self-reported-erc7579");
      expect(assessed.selfReported.accountId).toBe(
        "prigenfi.account-prototype.0.1.0",
      );
      expect(assessed.selfReported.modules.hook).toBe(true);
      expect(assessed.selfReported.executionModes["delegatecall/revert"]).toBe(
        false,
      );
      expect(assessed.riskFlags).not.toContain(
        "DELEGATECALL_EXECUTION_SUPPORTED",
      );
      expect(assessed.moduleChecks[0]?.reportedInstalled).toBe(false);

      // An outsider cannot install the executor.
      await expect(
        publicClient.simulateContract({
          account: outsider,
          address: accountAddress,
          abi: account.abi,
          functionName: "installModule",
          args: [2n, executorAddress, "0x"],
        }),
      ).rejects.toThrow();

      await ownerExecute(
        accountAddress,
        encodeFunctionData({
          abi: account.abi,
          functionName: "installModule",
          args: [2n, executorAddress, "0x"],
        }),
      );
      const now = (await publicClient.getBlock()).timestamp;
      const pingSelector = encodeFunctionData({
        abi: target.abi,
        functionName: "ping",
        args: [0n],
      }).slice(0, 10) as Hex;
      const grant = await ownerExecute(
        executorAddress,
        encodeFunctionData({
          abi: executor.abi,
          functionName: "grantSession",
          args: [
            agent,
            targetAddress,
            pingSelector,
            Number(now),
            Number(now) + 3600,
            2,
          ],
        }),
      );
      const granted = grant.logs
        .filter((log) => getAddress(log.address) === executorAddress)
        .map((log) => decodeEventLog({ abi: executor.abi, ...log }))
        .find((event) => event.eventName === "SessionGranted");
      const sessionId = (granted?.args as { sessionId: Hex } | undefined)
        ?.sessionId;
      if (!sessionId) throw new Error("SessionGranted event missing");

      const pingData = (value: bigint) =>
        encodeFunctionData({
          abi: target.abi,
          functionName: "ping",
          args: [value],
        });
      const agentCall = (from: Address, data: Hex) =>
        wallet.writeContract({
          account: from,
          address: executorAddress,
          abi: executor.abi,
          functionName: "executeSession",
          args: [accountAddress, sessionId, data],
        });

      await mined(await agentCall(agent, pingData(1n)));
      expect(
        await publicClient.readContract({
          address: targetAddress,
          abi: target.abi,
          functionName: "lastCaller",
        }),
      ).toBe(accountAddress);

      // Wrong caller, wrong selector, forbidden grant: all rejected on-chain.
      await expect(
        publicClient.simulateContract({
          account: outsider,
          address: executorAddress,
          abi: executor.abi,
          functionName: "executeSession",
          args: [accountAddress, sessionId, pingData(2n)],
        }),
      ).rejects.toThrow(/NotSessionAgent/);
      await expect(
        publicClient.simulateContract({
          account: agent,
          address: executorAddress,
          abi: executor.abi,
          functionName: "executeSession",
          args: [
            accountAddress,
            sessionId,
            encodeFunctionData({ abi: target.abi, functionName: "other" }),
          ],
        }),
      ).rejects.toThrow(/SelectorMismatch/);
      await expect(
        ownerExecute(
          executorAddress,
          encodeFunctionData({
            abi: executor.abi,
            functionName: "grantSession",
            args: [
              agent,
              targetAddress,
              "0x095ea7b3",
              Number(now),
              Number(now) + 3600,
              1,
            ],
          }),
        ),
      ).rejects.toThrow();

      await mined(await agentCall(agent, pingData(2n)));
      await expect(
        publicClient.simulateContract({
          account: agent,
          address: executorAddress,
          abi: executor.abi,
          functionName: "executeSession",
          args: [accountAddress, sessionId, pingData(3n)],
        }),
      ).rejects.toThrow(/CallLimitReached/);

      // Revoke-all takes effect immediately.
      await ownerExecute(
        executorAddress,
        encodeFunctionData({
          abi: executor.abi,
          functionName: "revokeAllSessions",
        }),
      );
      expect(
        await publicClient.readContract({
          address: executorAddress,
          abi: executor.abi,
          functionName: "isSessionActive",
          args: [accountAddress, sessionId],
        }),
      ).toBe(false);
      expect(
        await publicClient.readContract({
          address: targetAddress,
          abi: target.abi,
          functionName: "pings",
        }),
      ).toBe(2n);

      await testClient.stopImpersonatingAccount({ address: entryPoint });
    }, 60_000);
  },
);
