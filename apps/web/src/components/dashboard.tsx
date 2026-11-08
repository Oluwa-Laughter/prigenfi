"use client";
import { useState } from "react";
import {
  useConnection,
  useConnect,
  useDisconnect,
  useSwitchChain,
  usePublicClient,
  useWalletClient,
  useBalance,
} from "wagmi";
import { injected } from "wagmi/connectors/injected";
import {
  getAddress,
  isAddress,
  formatEther,
  formatUnits,
  erc20Abi,
  type Address,
  type Hex,
} from "viem";
import {
  agentVaultAbi,
  agentVaultBytecode,
  exactUnits,
  mockUSDAbi,
  type PolicySnapshot,
  publicJson,
} from "@prigenfi/shared";
import { PrigenFiClient, verifyVault } from "@prigenfi/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Wallet, ArrowUpRight, Pause, ShieldCheck } from "lucide-react";
import { localRpc, sepoliaRpc } from "./providers";
export function Dashboard() {
  const { address, chainId, isConnected } = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const supported = chainId === 31337 || chainId === 11155111;
  return (
    <div className="vault-legacy product-dashboard">
      <div className="page-heading">
        <div>
          <Badge variant="outline">Testnet wallet authority</Badge>
          <h1>Control your agent capital.</h1>
          <p>
            Create or load an isolated vault, authorize an agent address, and
            enforce transfer limits on-chain.
          </p>
        </div>
        <div>
          {isConnected ? (
            <Button variant="outline" onClick={() => disconnect.mutate()}>
              Disconnect wallet
            </Button>
          ) : (
            <Button
              onClick={() => connect.mutate({ connector: injected() })}
              disabled={connect.isPending}
            >
              <Wallet data-icon="inline-start" />
              {connect.isPending ? "Connecting…" : "Connect wallet"}
            </Button>
          )}
        </div>
      </div>
      <Alert>
        <ShieldCheck />
        <AlertTitle>Testnet preview · No live autonomous trading</AlertTitle>
        <AlertDescription>
          Wallet vaults currently support restricted test-token transfers. Agent
          trading and confidential swaps are not yet available. Zama
          confidential assets remain wallet-controlled.
        </AlertDescription>
      </Alert>
      {connect.error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>Wallet connection failed</AlertTitle>
          <AlertDescription>
            Install or unlock an Ethereum wallet, then try again. No permission
            was granted.
          </AlertDescription>
        </Alert>
      ) : null}
      {!isConnected || !address ? (
        <Empty className="my-10 border">
          <EmptyHeader>
            <Wallet />
            <EmptyTitle>Connect your wallet to set permissions</EmptyTitle>
            <EmptyDescription>
              Connect an Ethereum wallet to own a vault, grant your agent
              limited testnet permissions. Draft mandates on the My Agents page
              do not grant access.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !supported ? (
        <Empty className="my-10 border">
          <EmptyHeader>
            <EmptyTitle>Switch to a supported test network</EmptyTitle>
            <EmptyDescription>
              Mainnet execution is disabled. Choose Ethereum Sepolia to
              continue.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            onClick={() => switchChain.mutate({ chainId: 11155111 })}
            disabled={switchChain.isPending}
          >
            Switch to Sepolia
          </Button>
          {switchChain.error ? (
            <p role="alert">Network switch declined or unavailable.</p>
          ) : null}
        </Empty>
      ) : (
        <Workspace
          key={`${address}:${chainId}`}
          address={address}
          chainId={chainId}
        />
      )}
    </div>
  );
}
function Workspace({
  address,
  chainId,
}: {
  address: Address;
  chainId: 31337 | 11155111;
}) {
  const client = usePublicClient();
  const { data: wallet } = useWalletClient();
  const eth = useBalance({ address });
  const [vault, setVault] = useState<Address>();
  const [vaultInput, setVaultInput] = useState("");
  const [owner, setOwner] = useState<Address>();
  const [agent, setAgent] = useState("");
  const [token, setToken] = useState("");
  const [recipient, setRecipient] = useState("");
  const [perOperation, setPerOperation] = useState("10");
  const [dailyLimit, setDailyLimit] = useState("20");
  const [amount, setAmount] = useState("1");
  const [snapshot, setSnapshot] = useState<PolicySnapshot>();
  const [decimals, setDecimals] = useState<number>();
  const [proposal, setProposal] = useState<string>();
  const [activity, setActivity] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [receipts, setReceipts] = useState<{ hash: Hex; label: string }[]>([]);
  const isOwner = owner?.toLowerCase() === address.toLowerCase();
  const validScope = !!vault && isAddress(agent) && isAddress(token);
  const sdk = () => {
    if (!vault || !isAddress(agent) || !isAddress(token))
      throw new Error("Enter valid vault, agent and token addresses.");
    return new PrigenFiClient({
      rpcUrl: chainId === 31337 ? localRpc : sepoliaRpc,
      chainId,
      vault,
      agent: getAddress(agent),
      token: getAddress(token),
    });
  };
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch {
      setError(
        "The action could not be completed. Check addresses, permissions, token units, wallet network, and RPC connection. A wallet rejection does not authorize an action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function mined(hash: Hex, label: string) {
    if (!client) throw new Error("No RPC");
    const r = await client.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });
    if (r.status !== "success") throw new Error("Reverted");
    setReceipts((prev) => [{ hash, label }, ...prev]);
    return r;
  }
  async function refresh() {
    const [s, d] = await Promise.all([
      sdk().policy(),
      client?.readContract({
        address: getAddress(token),
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
    setSnapshot(s);
    setDecimals(d);
  }
  async function ownerWrite(fn: "setPaused" | "revoke", paused?: boolean) {
    if (!wallet || !vault || !isOwner) throw new Error("Owner required");
    const hash =
      fn === "setPaused"
        ? await wallet.writeContract({
            address: vault,
            abi: agentVaultAbi,
            functionName: "setPaused",
            args: [!!paused],
          })
        : await wallet.writeContract({
            address: vault,
            abi: agentVaultAbi,
            functionName: "revoke",
            args: [getAddress(agent), getAddress(token)],
          });
    await mined(
      hash,
      fn === "revoke"
        ? "Permission revoked"
        : paused
          ? "Vault paused"
          : "Vault resumed",
    );
    if (validScope) await refresh();
  }
  return (
    <>
      <div className="balance-row">
        <span className="mono">{address}</span>
        <span>
          <Badge variant="secondary">
            {chainId === 31337 ? "Local Anvil" : "Ethereum Sepolia"}
          </Badge>{" "}
          <span className="muted">
            {eth.data
              ? `${formatEther(eth.data.value)} ETH`
              : eth.error
                ? "Gas balance unavailable"
                : "Reading gas balance…"}
          </span>
        </span>
      </div>
      {error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>Action needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="dashboard-grid">
        <div className="stack">
          <Card>
            <CardHeader>
              <CardTitle>Your agent capital vault</CardTitle>
              <CardDescription>
                Only capital transferred to this vault is available to an agent.
                Your wallet remains the owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="vault-address">
                    Existing vault address
                  </FieldLabel>
                  <Input
                    id="vault-address"
                    placeholder="0x…"
                    value={vaultInput}
                    onChange={(e) => setVaultInput(e.target.value)}
                  />
                </Field>
                <div className="actions">
                  <Button
                    variant="outline"
                    disabled={busy || !isAddress(vaultInput)}
                    onClick={() =>
                      run(async () => {
                        if (!client) throw new Error();
                        const v = getAddress(vaultInput);
                        const o = await verifyVault(client, v);
                        setVault(v);
                        setOwner(o);
                        setSnapshot(undefined);
                        setProposal(undefined);
                        setActivity(undefined);
                      })
                    }
                  >
                    Load vault
                  </Button>
                  <Button
                    disabled={busy || !wallet}
                    onClick={() =>
                      run(async () => {
                        if (!wallet) throw new Error();
                        const r = await mined(
                          await wallet.deployContract({
                            abi: agentVaultAbi,
                            bytecode: agentVaultBytecode,
                            args: [address],
                          }),
                          "Vault created",
                        );
                        if (!r.contractAddress) throw new Error();
                        setVault(r.contractAddress);
                        setVaultInput(r.contractAddress);
                        setOwner(address);
                        setSnapshot(undefined);
                      })
                    }
                  >
                    Create vault
                  </Button>
                </div>
              </FieldGroup>
              {vault ? (
                <div className="mt-5">
                  <p className="mono">Vault: {vault}</p>
                  <p className="mono">Owner: {owner}</p>
                  <Badge variant="outline">
                    {isOwner
                      ? "You control this vault"
                      : "Read-only: another owner"}
                  </Badge>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="muted text-xs">
              Creation requests a testnet deployment transaction. This is an
              isolated vault, not an ERC-4337 account.
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Decide what your agent can do</CardTitle>
              <CardDescription>
                Authorize a public agent address. Only the selected token and
                recipient can be used; the function is fixed to ERC-20 transfer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="agent-address">
                    Agent wallet address
                  </FieldLabel>
                  <Input
                    id="agent-address"
                    placeholder="0x…"
                    value={agent}
                    onChange={(e) => {
                      setAgent(e.target.value);
                      setSnapshot(undefined);
                      setProposal(undefined);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="token-address">
                    Public ERC-20 token address
                  </FieldLabel>
                  <Input
                    id="token-address"
                    placeholder="0x…"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setSnapshot(undefined);
                      setDecimals(undefined);
                      setProposal(undefined);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="recipient-address">
                    Only allowed recipient
                  </FieldLabel>
                  <Input
                    id="recipient-address"
                    placeholder="0x…"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </Field>
                <div className="form-grid">
                  <Field>
                    <FieldLabel htmlFor="operation-cap">
                      Per-operation cap (tokens)
                    </FieldLabel>
                    <Input
                      id="operation-cap"
                      value={perOperation}
                      inputMode="decimal"
                      onChange={(e) => setPerOperation(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="daily-cap">
                      UTC daily cap (tokens)
                    </FieldLabel>
                    <Input
                      id="daily-cap"
                      value={dailyLimit}
                      inputMode="decimal"
                      onChange={(e) => setDailyLimit(e.target.value)}
                    />
                  </Field>
                </div>
                <Button
                  variant="outline"
                  disabled={busy || !validScope}
                  onClick={() => run(refresh)}
                >
                  Read on-chain policy
                </Button>
                <Button
                  disabled={
                    busy || !isOwner || !validScope || !isAddress(recipient)
                  }
                  onClick={() =>
                    run(async () => {
                      if (!wallet || !client || !vault) throw new Error();
                      const d = await client.readContract({
                        address: getAddress(token),
                        abi: erc20Abi,
                        functionName: "decimals",
                      });
                      const block = await client.getBlock();
                      await mined(
                        await wallet.writeContract({
                          address: vault,
                          abi: agentVaultAbi,
                          functionName: "setPermission",
                          args: [
                            getAddress(agent),
                            getAddress(token),
                            getAddress(recipient),
                            exactUnits(perOperation, d),
                            exactUnits(dailyLimit, d),
                            block.timestamp + 86400n,
                          ],
                        }),
                        "Agent authorized for 24 hours",
                      );
                      await refresh();
                    })
                  }
                >
                  Authorize for 24 hours
                </Button>
                <FieldDescription>
                  Owner only. Reauthorization explicitly resets this token’s
                  daily budget. No decryption or confidential operator rights
                  are granted.
                </FieldDescription>
              </FieldGroup>
              {snapshot ? (
                <div className="mt-5">
                  <Badge
                    variant={
                      snapshot.permission.active ? "secondary" : "outline"
                    }
                  >
                    {snapshot.paused
                      ? "Paused"
                      : !snapshot.permission.active
                        ? "Revoked / not authorized"
                        : snapshot.permission.expiresAt <= snapshot.timestamp
                          ? "Expired"
                          : "Active"}
                  </Badge>
                  <p className="muted">
                    Public vault balance:{" "}
                    {decimals === undefined
                      ? "—"
                      : formatUnits(snapshot.balance, decimals)}{" "}
                    tokens
                  </p>
                  <p className="mono">
                    Nonce {snapshot.nonce.toString()} · Block{" "}
                    {snapshot.blockNumber.toString()}
                  </p>
                  <p className="mono">
                    Recipient: {snapshot.permission.recipient}
                  </p>
                  <p className="muted">
                    Spent:{" "}
                    {decimals === undefined
                      ? "—"
                      : formatUnits(snapshot.permission.spent, decimals)}{" "}
                    /{" "}
                    {decimals === undefined
                      ? "—"
                      : formatUnits(
                          snapshot.permission.dailyLimit,
                          decimals,
                        )}{" "}
                    tokens in recorded UTC day{" "}
                    {snapshot.permission.day.toString()}
                  </p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                disabled={busy || !isOwner || !validScope}
                onClick={() => run(() => ownerWrite("revoke"))}
              >
                Revoke agent
              </Button>
              <Button
                variant="outline"
                disabled={busy || !isOwner || !vault}
                onClick={() => run(() => ownerWrite("setPaused", true))}
              >
                <Pause data-icon="inline-start" />
                Pause vault
              </Button>
              <Button
                variant="outline"
                disabled={busy || !isOwner || !vault}
                onClick={() => run(() => ownerWrite("setPaused", false))}
              >
                Resume
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="stack">
          <Card>
            <CardHeader>
              <CardTitle>Test a proposed action</CardTitle>
              <CardDescription>
                Check a token-transfer proposal against the actual vault policy
                before it reaches the chain. This is not yet a market trade or
                swap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="proposal-amount">
                    Amount (tokens)
                  </FieldLabel>
                  <Input
                    id="proposal-amount"
                    value={amount}
                    inputMode="decimal"
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setProposal(undefined);
                    }}
                  />
                </Field>
                <Button
                  disabled={
                    busy ||
                    !snapshot ||
                    decimals === undefined ||
                    !isAddress(recipient)
                  }
                  onClick={() =>
                    run(async () => {
                      if (decimals === undefined || !vault) throw new Error();
                      const s = await sdk().policy();
                      const r = await sdk().simulate({
                        kind: "erc20-transfer",
                        chainId,
                        vault,
                        agent: getAddress(agent),
                        token: getAddress(token),
                        recipient: getAddress(recipient),
                        amount: exactUnits(amount, decimals).toString(),
                        nonce: s.nonce.toString(),
                        deadline: Number(s.timestamp) + 240,
                      });
                      setProposal(publicJson(r));
                    })
                  }
                >
                  Simulate proposal
                </Button>
              </FieldGroup>
              {proposal ? (
                <pre className="code-panel mt-5" aria-live="polite">
                  {proposal}
                </pre>
              ) : (
                <p className="muted mt-5">
                  Load a vault and read its policy to prepare a proposal.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-3">
              <Button
                variant="outline"
                disabled={
                  busy ||
                  !wallet ||
                  !snapshot ||
                  decimals === undefined ||
                  address.toLowerCase() !== agent.toLowerCase() ||
                  !isAddress(recipient)
                }
                onClick={() =>
                  run(async () => {
                    if (!wallet || !vault || decimals === undefined)
                      throw new Error();
                    const s = await sdk().policy();
                    await mined(
                      await wallet.writeContract({
                        address: vault,
                        abi: agentVaultAbi,
                        functionName: "executeTransfer",
                        args: [
                          getAddress(token),
                          getAddress(recipient),
                          exactUnits(amount, decimals),
                          s.nonce,
                        ],
                      }),
                      "Test transfer included",
                    );
                    await refresh();
                  })
                }
              >
                Send test transfer as agent
              </Button>
              <p className="muted text-xs">
                Sending requires the authorized agent’s connected wallet. The
                vault enforces its policy even if simulation is skipped.
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Capital controls</CardTitle>
              <CardDescription>
                Use the token address and amount above. Deposits transfer
                directly without an allowance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={busy || !vault || !isAddress(token) || !wallet}
                onClick={() =>
                  run(async () => {
                    if (!wallet || !client || !vault) throw new Error();
                    const d = await client.readContract({
                      address: getAddress(token),
                      abi: erc20Abi,
                      functionName: "decimals",
                    });
                    await mined(
                      await wallet.writeContract({
                        address: getAddress(token),
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [vault, exactUnits(amount, d)],
                      }),
                      "Vault funded",
                    );
                    if (validScope) await refresh();
                  })
                }
              >
                Deposit tokens
              </Button>
              <Button
                variant="outline"
                disabled={busy || !isOwner || !vault || !isAddress(token)}
                onClick={() =>
                  run(async () => {
                    if (!wallet || !client || !vault) throw new Error();
                    const d = await client.readContract({
                      address: getAddress(token),
                      abi: erc20Abi,
                      functionName: "decimals",
                    });
                    await mined(
                      await wallet.writeContract({
                        address: vault,
                        abi: agentVaultAbi,
                        functionName: "withdraw",
                        args: [
                          getAddress(token),
                          address,
                          exactUnits(amount, d),
                        ],
                      }),
                      "Owner withdrawal",
                    );
                    if (validScope) await refresh();
                  })
                }
              >
                Withdraw to owner
              </Button>
              <Button
                variant="outline"
                disabled={
                  busy || chainId !== 31337 || !vault || !isAddress(token)
                }
                onClick={() =>
                  run(async () => {
                    if (!wallet || !vault) throw new Error();
                    await mined(
                      await wallet.writeContract({
                        address: getAddress(token),
                        abi: mockUSDAbi,
                        functionName: "mint",
                        args: [vault, 100_000_000n],
                      }),
                      "Local faucet mint",
                    );
                    if (validScope) await refresh();
                  })
                }
              >
                Get local test tokens
              </Button>
            </CardContent>
            <CardFooter className="muted text-xs">
              The local faucet uses the test-token contract from pnpm
              local:deploy. It is disabled on Sepolia.
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity & receipts</CardTitle>
              <CardDescription>
                Receipts from this browser session and actual on-chain agent
                events. One inclusion is not finality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receipts.length ? (
                <ul className="transaction-log">
                  {receipts.map((r) => (
                    <li key={r.hash}>
                      {r.label}
                      <br />
                      {chainId === 11155111 ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${r.hash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.hash} <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <span className="mono">{r.hash}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  No transactions submitted in this session.
                </p>
              )}
              <Button
                variant="outline"
                disabled={busy || !validScope}
                onClick={() =>
                  run(async () =>
                    setActivity(publicJson(await sdk().activity())),
                  )
                }
              >
                Read agent activity
              </Button>
              {activity ? (
                <pre className="code-panel mt-5">{activity}</pre>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
