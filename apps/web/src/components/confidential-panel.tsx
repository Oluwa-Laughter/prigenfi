"use client";
import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  ZamaProvider,
  useGrantPermit,
  useHasPermit,
  useConfidentialBalance,
  useShield,
  useConfidentialTransfer,
  useUnshield,
  usePendingUnshield,
  useResumeUnshield,
} from "@zama-fhe/react-sdk";
import { createConfig } from "@zama-fhe/react-sdk/wagmi";
import { MemoryStorage } from "@zama-fhe/sdk";
import { sepolia as fheSepolia } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import { usePublicClient, useReadContract, useWalletClient } from "wagmi";
import {
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { confidentialAssets, exactUnits } from "@prigenfi/shared";
import { verifyConfidentialAsset } from "@prigenfi/zama";
import { wagmiConfig, sepoliaRpc } from "./providers";
import { Button } from "@/components/ui/button";
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
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
function assetLabel(symbol: string) {
  if (symbol.startsWith("cUSDC")) return "cUSD";
  if (symbol.startsWith("cUSDT")) return "cUSDT";
  return symbol.replace(/Mock$/, "");
}
export default function ConfidentialPanel({ address }: { address: Address }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, gcTime: 0 } } }),
  );
  const [config] = useState(() =>
    createConfig({
      wagmiConfig,
      chains: [{ ...fheSepolia, network: sepoliaRpc }],
      relayers: { [fheSepolia.id]: web() },
      storage: new MemoryStorage(),
      permitStorage: new MemoryStorage(),
      permitTTL: 1,
    }),
  );
  useEffect(
    () => () => {
      queryClient.clear();
    },
    [queryClient],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ZamaProvider config={config}>
        <Tabs defaultValue={confidentialAssets[0].address}>
          <TabsList aria-label="Confidential assets">
            {confidentialAssets.map((a) => (
              <TabsTrigger key={a.address} value={a.address}>
                {assetLabel(a.symbol)}
              </TabsTrigger>
            ))}
          </TabsList>
          {confidentialAssets.map((asset) => (
            <TabsContent key={asset.address} value={asset.address}>
              <VerifiedToken asset={asset} address={address} />
            </TabsContent>
          ))}
        </Tabs>
      </ZamaProvider>
    </QueryClientProvider>
  );
}
function VerifiedToken({
  asset,
  address,
}: {
  asset: (typeof confidentialAssets)[number];
  address: Address;
}) {
  const client = usePublicClient();
  const verified = useQuery({
    queryKey: ["verified-wrapper", asset.address],
    queryFn: () => {
      if (!client) throw new Error();
      return verifyConfidentialAsset(client, asset.address);
    },
    staleTime: 60000,
  });
  if (verified.isPending)
    return (
      <p role="status">
        Verifying deployed wrapper, underlying token, rate, and decimals…
      </p>
    );
  if (verified.error || !verified.data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Asset verification unavailable</AlertTitle>
        <AlertDescription>
          Operations are disabled. Check your Sepolia RPC connection and try
          reopening these tools.
        </AlertDescription>
      </Alert>
    );
  return <TokenTools asset={verified.data} address={address} />;
}
function TokenTools({
  asset,
  address,
}: {
  asset: Awaited<ReturnType<typeof verifyConfidentialAsset>>;
  address: Address;
}) {
  const client = usePublicClient();
  const { data: wallet } = useWalletClient();
  const permit = useHasPermit({ contractAddresses: [asset.address] });
  const grant = useGrantPermit();
  const [consent, setConsent] = useState(false);
  const balance = useConfidentialBalance(
    { address: asset.address, account: address },
    { enabled: consent && !!permit.data },
  );
  const publicBalance = useReadContract({
    address: asset.underlying,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  const shield = useShield({ address: asset.address });
  const transfer = useConfidentialTransfer({ address: asset.address });
  const unshield = useUnshield(asset.address);
  const pending = usePendingUnshield(asset.address);
  const resume = useResumeUnshield(asset.address);
  const [amount, setAmount] = useState("1");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [receipt, setReceipt] = useState<Hex>();
  async function run(fn: () => Promise<Hex | undefined>) {
    setBusy(true);
    setFailed(false);
    setReceipt(undefined);
    try {
      const hash = await fn();
      if (hash) {
        setReceipt(hash);
        await publicBalance.refetch();
        if (consent && permit.data) await balance.refetch();
      }
      await pending.refetch();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const authorized = consent && !!permit.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{assetLabel(asset.symbol)}</CardTitle>
        <CardDescription>
          Unbacked test asset · Wrapper verified on Sepolia at block{" "}
          {asset.blockNumber}. Decrypted balances stay in this browser session,
          not in MCP or an LLM.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="balance-row">
          <span>Public test-token balance</span>
          <span>
            {publicBalance.data !== undefined
              ? formatUnits(publicBalance.data, asset.underlyingDecimals)
              : publicBalance.error
                ? "Unavailable"
                : "Loading…"}
          </span>
        </div>
        <div className="balance-row">
          <span>Confidential balance</span>
          <span>
            {!authorized
              ? "Hidden"
              : balance.data !== undefined
                ? formatUnits(balance.data, asset.decimals)
                : balance.error
                  ? "Decryption unavailable"
                  : "Decrypting…"}
          </span>
        </div>
        <FieldGroup className="mt-5">
          <Button
            variant="outline"
            disabled={busy || grant.isPending}
            onClick={() =>
              run(async () => {
                await grant.mutateAsync([asset.address]);
                setConsent(true);
                return undefined;
              })
            }
          >
            {authorized
              ? "Renew balance authorization"
              : "Authorize balance decryption"}
          </Button>
          <FieldDescription>
            Signs a permit for this token. It does not give an agent spending or
            decryption rights.
          </FieldDescription>
          <div className="form-grid">
            <Field>
              <FieldLabel htmlFor={`fhe-amount-${asset.symbol}`}>
                Amount (tokens)
              </FieldLabel>
              <Input
                id={`fhe-amount-${asset.symbol}`}
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`fhe-recipient-${asset.symbol}`}>
                Transfer recipient
              </FieldLabel>
              <Input
                id={`fhe-recipient-${asset.symbol}`}
                value={to}
                placeholder="0x…"
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          <div className="actions">
            <Button
              disabled={busy || !wallet}
              onClick={() =>
                run(async () => {
                  if (
                    !client ||
                    !wallet ||
                    (await client.getChainId()) !== 11155111
                  )
                    throw new Error();
                  const hash = await wallet.writeContract({
                    address: asset.underlying,
                    abi: parseAbi(["function mint(address to,uint256 amount)"]),
                    functionName: "mint",
                    args: [
                      address,
                      exactUnits("100", asset.underlyingDecimals),
                    ],
                  });
                  const r = await client.waitForTransactionReceipt({ hash });
                  if (r.status !== "success") throw new Error();
                  return hash;
                })
              }
            >
              Get 100 test tokens
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  async () =>
                    (
                      await shield.mutateAsync({
                        amount: exactUnits(amount, asset.underlyingDecimals),
                        approvalStrategy: "exact",
                      })
                    ).txHash,
                )
              }
            >
              Shield
            </Button>
            <Button
              disabled={busy || !authorized || !isAddress(to)}
              onClick={() =>
                run(
                  async () =>
                    (
                      await transfer.mutateAsync({
                        to: getAddress(to),
                        amount: exactUnits(amount, asset.decimals),
                      })
                    ).txHash,
                )
              }
            >
              Confidential transfer
            </Button>
            <Button
              variant="outline"
              disabled={busy || !authorized}
              onClick={() =>
                run(
                  async () =>
                    (
                      await unshield.mutateAsync({
                        amount: exactUnits(amount, asset.decimals),
                      })
                    ).txHash,
                )
              }
            >
              Unshield
            </Button>
          </div>
          <FieldDescription>
            Shield amounts use public token units; transfer and unshield amounts
            use confidential token units. Shielding uses exact approvals.
            Unshielding requires two transactions and a decryption proof.
          </FieldDescription>
          {pending.data ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(
                  async () =>
                    (
                      await resume.mutateAsync({
                        unwrapTxHash: pending.data as Hex,
                      })
                    ).txHash,
                )
              }
            >
              Resume pending unshield
            </Button>
          ) : null}
        </FieldGroup>
        {busy ? (
          <p role="status">
            Waiting for wallet approval or network processing. FHE operations
            can take time.
          </p>
        ) : null}
        {failed ? (
          <Alert variant="destructive" className="mt-5">
            <AlertTitle>Confidential operation incomplete</AlertTitle>
            <AlertDescription>
              Check your wallet, test balance, gas, RPC, and Zama service
              availability. No private values are included in this error. A
              mined unwrap may still need finalization.
            </AlertDescription>
          </Alert>
        ) : null}
        {receipt ? (
          <p className="mono mt-5">
            <a
              href={`https://sepolia.etherscan.io/tx/${receipt}`}
              target="_blank"
              rel="noreferrer"
            >
              Review included transaction: {receipt}
            </a>
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="muted text-xs">
        Relayer access uses Zama’s public testnet service. Pending unshield
        recovery is session-scoped; keep the unwrap transaction hash if you
        close these tools. No swap or confidential agent operator is enabled.
      </CardFooter>
    </Card>
  );
}
