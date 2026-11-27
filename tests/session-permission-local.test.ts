import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startEphemeralAnvil } from "./helpers/ephemeral-anvil";
import {
  type Abi,
  type Address,
  type Hex,
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  getAddress,
  http,
  parseEther,
} from "viem";
import { anvil } from "viem/chains";
import {
  SESSION_MAX_CALLS,
  SESSION_MAX_DURATION_SECONDS,
  previewSessionPermission,
  type SessionPermissionRequest,
} from "../packages/shared/src/session-permission";

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

/** Deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe.skipIf(process.env.LOCAL_INTEGRATION !== "1")(
  "Session permission preview vs deployed SessionCallExecutor",
  () => {
    beforeAll(async () => {
      node = await startEphemeralAnvil();
      RPC = node.url;
    }, 30_000);
    afterAll(async () => {
      await node?.stop();
    });

    it("agrees with the contract on every sampled grant", async () => {
      if (!["127.0.0.1", "localhost"].includes(new URL(RPC).hostname))
        throw new Error("Local RPC required");
      const transport = http(RPC);
      const publicClient = createPublicClient({
        chain: anvil,
        transport,
        pollingInterval: 50,
      });
      const wallet = createWalletClient({ chain: anvil, transport });
      const testClient = createTestClient({
        chain: anvil,
        mode: "anvil",
        transport,
      });
      const [deployer, owner, agentEoa] = await wallet.getAddresses();
      if (!deployer || !owner || !agentEoa)
        throw new Error("Unlocked accounts required");

      const accountArtifact = await artifact(
        "PrigenAccountPrototype.sol",
        "PrigenAccountPrototype",
      );
      const executorArtifact = await artifact(
        "SessionCallExecutor.sol",
        "SessionCallExecutor",
      );
      const targetArtifact = await artifact(
        "SessionCallExecutor.t.sol",
        "LocalSessionTarget",
      );
      const deploy = async (
        item: { abi: Abi; bytecode: Hex },
        args: unknown[] = [],
      ) => {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: await wallet.deployContract({
            account: deployer,
            ...item,
            args,
          }),
        });
        if (!receipt.contractAddress) throw new Error("Deployment failed");
        return getAddress(receipt.contractAddress);
      };
      const account = await deploy(accountArtifact, [owner]);
      const executor = await deploy(executorArtifact);
      const target = await deploy(targetArtifact);
      const entryPoint = (await publicClient.readContract({
        address: account,
        abi: accountArtifact.abi,
        functionName: "entryPoint",
      })) as Address;
      await testClient.impersonateAccount({ address: entryPoint });
      await testClient.setBalance({
        address: entryPoint,
        value: parseEther("10"),
      });

      const execute = (to: Address, data: Hex) =>
        encodeFunctionData({
          abi: accountArtifact.abi,
          functionName: "execute",
          args: [
            `0x${"0".repeat(64)}`,
            encodePacked(["address", "uint256", "bytes"], [to, 0n, data]),
          ],
        });
      await publicClient.waitForTransactionReceipt({
        hash: await wallet.sendTransaction({
          account: entryPoint,
          to: account,
          data: execute(
            account,
            encodeFunctionData({
              abi: accountArtifact.abi,
              functionName: "installModule",
              args: [2n, executor, "0x"],
            }),
          ),
        }),
      });

      const zero = "0x0000000000000000000000000000000000000000" as Address;
      const D = SESSION_MAX_DURATION_SECONDS;
      // Valid and invalid options per dimension, mirroring the contract checks.
      const dims = {
        agent: { ok: [agentEoa], bad: [zero, account, executor] },
        target: { ok: [target], bad: [account, executor, agentEoa] },
        selector: {
          ok: ["0x0e0d2b0b", "0x5b34b966"],
          bad: [
            "0x095ea7b3",
            "0x2fb74e62",
            "0x00000000",
            "0xd4febb96",
            "0xe9ae5c53",
          ],
        },
        window: {
          ok: (t: number): Array<[number, number]> => [
            [t, t + 3600],
            [t, t + D],
            [t + 3600, t + 7200],
            [t - 10, t + D - 10],
          ],
          bad: (t: number): Array<[number, number]> => [
            [t, t + D + 1],
            [t, t],
            [t - 100, t - 1],
            [t + D, t + D + 1],
            [0, t + 3600],
          ],
        },
        maxCalls: {
          ok: [1, 3, SESSION_MAX_CALLS],
          bad: [0, SESSION_MAX_CALLS + 1],
        },
      };
      type Dim = keyof typeof dims;
      const names = Object.keys(dims) as Dim[];
      const pick = <T>(rand: () => number, items: readonly T[]) =>
        items[Math.floor(rand() * items.length)] as T;

      const rand = mulberry32(0x7579);
      let time = Number((await publicClient.getBlock()).timestamp) + 1000;
      let accepted = 0;
      let rejected = 0;
      const CASES = 90;
      for (let index = 0; index < CASES; index += 1) {
        time += 11;
        const mode = rand();
        // ~1/3 fully valid, ~1/2 exactly one invalid dimension, rest fully random.
        const invalid = new Set<Dim>(
          mode < 0.33
            ? []
            : mode < 0.83
              ? [pick(rand, names)]
              : names.filter(() => rand() < 0.5),
        );
        const choose = <K extends Dim>(dim: K) => {
          const option = dims[dim];
          const bucket = invalid.has(dim) ? option.bad : option.ok;
          return typeof bucket === "function"
            ? pick(rand, bucket(time))
            : pick(rand, bucket as readonly unknown[]);
        };
        const [validAfter, validUntil] = choose("window") as [number, number];
        const request: SessionPermissionRequest = {
          chainId: 31337,
          account,
          executor,
          agent: choose("agent") as Address,
          target: choose("target") as Address,
          selector: choose("selector") as string,
          validAfter,
          validUntil,
          maxCalls: choose("maxCalls") as number,
        };
        const expected = previewSessionPermission(request, time);

        const grantData = encodeFunctionData({
          abi: executorArtifact.abi,
          functionName: "grantSession",
          args: [
            request.agent,
            request.target,
            request.selector,
            validAfter,
            validUntil,
            request.maxCalls,
          ],
        });
        await testClient.setNextBlockTimestamp({ timestamp: BigInt(time) });
        const hash = await wallet.sendTransaction({
          account: entryPoint,
          to: account,
          data: execute(executor, grantData),
          gas: 1_000_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const block = await publicClient.getBlock({
          blockNumber: receipt.blockNumber,
        });
        expect(Number(block.timestamp)).toBe(time);

        const label = JSON.stringify({ index, request, time });
        if (expected.status === "reviewable") {
          expect(receipt.status, label).toBe("success");
          accepted += 1;
        } else {
          expect(receipt.status, label).toBe("reverted");
          rejected += 1;
          // Re-run at the parent block with the same timestamp to read the revert reason.
          let reason: string | undefined;
          try {
            await publicClient
              .simulateContract({
                account: entryPoint,
                address: executor,
                abi: executorArtifact.abi,
                functionName: "grantSession",
                args: [
                  request.agent,
                  request.target,
                  request.selector,
                  validAfter,
                  validUntil,
                  request.maxCalls,
                ],
                blockNumber: receipt.blockNumber - 1n,
                blockOverrides: { time: BigInt(time) },
                stateOverride: [],
              })
              .catch(async () => {
                // Direct executor calls from a non-account caller fail the installed check;
                // re-simulate through the account's execute instead.
                await publicClient.call({
                  account: entryPoint,
                  to: account,
                  data: execute(executor, grantData),
                  blockNumber: receipt.blockNumber - 1n,
                  blockOverrides: { time: BigInt(time) },
                });
              });
          } catch (error) {
            if (error instanceof BaseError) {
              const revert = error.walk(
                (e) => e instanceof ContractFunctionRevertedError,
              );
              reason = (revert as ContractFunctionRevertedError | null)?.data
                ?.errorName;
              const data = (
                error.walk(
                  (e) => typeof (e as { data?: unknown }).data === "string",
                ) as { data?: Hex } | null
              )?.data;
              if (!reason && data) {
                const { decodeErrorResult } = await import("viem");
                try {
                  reason = decodeErrorResult({
                    abi: executorArtifact.abi,
                    data,
                  }).errorName;
                } catch {}
              }
            }
          }
          const map: Record<string, string> = {
            INVALID_AGENT: "InvalidAgent",
            INVALID_TARGET: "InvalidTarget",
            FORBIDDEN_SELECTOR: "ForbiddenSelector",
            INVALID_WINDOW: "InvalidWindow",
            INVALID_CALL_LIMIT: "InvalidCallLimit",
          };
          expect(reason, label).toBe(map[expected.rejections[0] as string]);
        }
      }
      // The sample must exercise both outcomes meaningfully.
      expect(accepted).toBeGreaterThan(15);
      expect(rejected).toBeGreaterThan(30);

      // Chain-state check the preview cannot see: a codeless target.
      time += 11;
      const codeless = getAddress("0x00000000000000000000000000000000000c0de0");
      const preview = previewSessionPermission(
        {
          chainId: 31337,
          account,
          executor,
          agent: agentEoa,
          target: codeless,
          selector: "0x0e0d2b0b",
          validAfter: time,
          validUntil: time + 60,
          maxCalls: 1,
        },
        time,
      );
      expect(preview.status).toBe("reviewable");
      expect(preview.onchainChecksRemaining).toContain("TARGET_HAS_CODE");
      await testClient.setNextBlockTimestamp({ timestamp: BigInt(time) });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: await wallet.sendTransaction({
          account: entryPoint,
          to: account,
          data: execute(
            executor,
            encodeFunctionData({
              abi: executorArtifact.abi,
              functionName: "grantSession",
              args: [agentEoa, codeless, "0x0e0d2b0b", time, time + 60, 1],
            }),
          ),
          gas: 1_000_000n,
        }),
      });
      expect(receipt.status).toBe("reverted");
      await testClient.stopImpersonatingAccount({ address: entryPoint });
    }, 120_000);
  },
);
