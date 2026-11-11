import {
  createPublicClient,
  http,
  erc20Abi,
  type Address,
  type PublicClient,
} from "viem";
import { anvil, sepolia } from "viem/chains";
import {
  agentVaultAbi,
  agentVaultRuntime,
  agentVaultImmutableRanges,
  transferSchema,
  evaluateTransfer,
  type PolicySnapshot,
  type TransferIntent,
} from "@prigenfi/shared";
export async function verifyVault(
  client: PublicClient,
  address: Address,
  blockNumber?: bigint,
) {
  const code = await client.getCode({ address, blockNumber });
  if (!code) throw new Error("UNVERIFIED_VAULT");
  const normalize = (value: string) => {
    let normalized = value.toLowerCase();
    for (const range of agentVaultImmutableRanges) {
      const start = 2 + range.start * 2;
      normalized =
        normalized.slice(0, start) +
        "0".repeat(range.length * 2) +
        normalized.slice(start + range.length * 2);
    }
    return normalized;
  };
  if (normalize(code) !== normalize(agentVaultRuntime))
    throw new Error("UNVERIFIED_VAULT");
  return client.readContract({
    address,
    abi: agentVaultAbi,
    functionName: "owner",
    blockNumber,
  });
}
export class PrigenFiClient {
  readonly client: PublicClient;
  constructor(
    readonly config: {
      rpcUrl: string;
      chainId: 31337 | 11155111;
      vault: Address;
      agent: Address;
      token: Address;
    },
  ) {
    this.client = createPublicClient({
      chain: config.chainId === 31337 ? anvil : sepolia,
      transport: http(config.rpcUrl, { timeout: 10_000, retryCount: 1 }),
    });
  }
  async policy(): Promise<PolicySnapshot> {
    const c = this.config;
    if ((await this.client.getChainId()) !== c.chainId)
      throw new Error("RPC_CHAIN_MISMATCH");
    const block = await this.client.getBlock();
    await verifyVault(this.client, c.vault, block.number);
    const [permission, paused, nonce, balance, tokenBudget] = await Promise.all(
      [
        this.client.readContract({
          address: c.vault,
          abi: agentVaultAbi,
          functionName: "permissions",
          args: [c.agent, c.token],
          blockNumber: block.number,
        }),
        this.client.readContract({
          address: c.vault,
          abi: agentVaultAbi,
          functionName: "paused",
          blockNumber: block.number,
        }),
        this.client.readContract({
          address: c.vault,
          abi: agentVaultAbi,
          functionName: "nonces",
          args: [c.agent],
          blockNumber: block.number,
        }),
        this.client.readContract({
          address: c.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [c.vault],
          blockNumber: block.number,
        }),
        this.client.readContract({
          address: c.vault,
          abi: agentVaultAbi,
          functionName: "tokenBudgets",
          args: [c.token],
          blockNumber: block.number,
        }),
      ],
    );
    return {
      chainId: c.chainId,
      vault: c.vault,
      agent: c.agent,
      token: c.token,
      paused,
      nonce,
      balance,
      timestamp: block.timestamp,
      blockNumber: block.number,
      tokenBudget: {
        dailyLimit: tokenBudget[0],
        spent: tokenBudget[1],
        day: tokenBudget[2],
      },
      permission: {
        recipient: permission[0],
        perOperation: permission[1],
        dailyLimit: permission[2],
        spent: permission[3],
        day: permission[4],
        expiresAt: permission[5],
        active: permission[6],
      },
    };
  }
  async simulate(input: unknown) {
    const intent = transferSchema.parse(input);
    const snapshot = await this.policy();
    const policy = evaluateTransfer(intent, snapshot);
    if (!policy.allowed)
      return {
        ...policy,
        blockNumber: snapshot.blockNumber.toString(),
        simulated: false,
      };
    try {
      await this.client.simulateContract({
        address: this.config.vault,
        abi: agentVaultAbi,
        functionName: "executeTransfer",
        account: this.config.agent,
        args: [
          intent.token,
          intent.recipient,
          BigInt(intent.amount),
          BigInt(intent.nonce),
        ],
        blockNumber: snapshot.blockNumber,
      });
      return {
        ...policy,
        blockNumber: snapshot.blockNumber.toString(),
        simulated: true,
      };
    } catch {
      return {
        allowed: false,
        reasons: ["CONTRACT_SIMULATION_REVERTED"],
        execution: "simulation-only" as const,
        blockNumber: snapshot.blockNumber.toString(),
        simulated: false,
      };
    }
  }
  async activity() {
    const block = await this.client.getBlockNumber();
    const logs = await this.client.getContractEvents({
      address: this.config.vault,
      abi: agentVaultAbi,
      eventName: "Executed",
      args: { agent: this.config.agent },
      fromBlock: block > 1000n ? block - 1000n : 0n,
      toBlock: block,
    });
    return {
      events: logs.map((log) => ({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        ...log.args,
      })),
      range: "last-1000-blocks",
      finality: "observed-unfinalized",
    };
  }
}
export interface ProposalGateway {
  simulate(
    input: TransferIntent,
  ): Promise<{ allowed: boolean; reasons: string[] }>;
}
/// Local, bounded, ephemeral proposals. Never a transaction queue and never financial authority.
export class ProposalSession {
  private readonly proposals = new Map<
    string,
    {
      id: string;
      intent: TransferIntent;
      status: "simulated";
      createdAt: string;
    }
  >();
  constructor(private readonly gateway: ProposalGateway) {}
  async propose(input: unknown, id: string) {
    const intent = transferSchema.parse(input);
    const old = this.proposals.get(id);
    if (old) {
      if (JSON.stringify(old.intent) !== JSON.stringify(intent))
        throw new Error("IDEMPOTENCY_CONFLICT");
      return old;
    }
    if (this.proposals.size >= 100) throw new Error("SESSION_CAPACITY");
    const simulation = await this.gateway.simulate(intent);
    if (!simulation.allowed) throw new Error("POLICY_DENIED");
    // No await between second check and insertion: concurrent duplicate requests cannot overwrite.
    const concurrent = this.proposals.get(id);
    if (concurrent) {
      if (JSON.stringify(concurrent.intent) !== JSON.stringify(intent))
        throw new Error("IDEMPOTENCY_CONFLICT");
      return concurrent;
    }
    // Concurrent simulations may have filled the session while this request awaited RPC.
    if (this.proposals.size >= 100) throw new Error("SESSION_CAPACITY");
    const proposal = {
      id,
      intent,
      status: "simulated" as const,
      createdAt: new Date().toISOString(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }
  get(id: string) {
    return this.proposals.get(id) ?? null;
  }
}
