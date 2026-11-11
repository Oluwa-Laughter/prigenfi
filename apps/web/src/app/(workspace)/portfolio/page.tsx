"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useConnection, useBalance, useConnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther } from "viem";
import {
  ArrowUpRight,
  CircleDollarSign,
  EyeOff,
  LockKeyhole,
  WalletCards,
  ShieldCheck,
} from "lucide-react";
const ConfidentialPanel = dynamic(
  () => import("@/components/confidential-panel"),
  {
    ssr: false,
    loading: () => (
      <div className="insight-empty">Loading confidential asset tools…</div>
    ),
  },
);

export default function PortfolioPage() {
  const { address, chainId, isConnected } = useConnection();
  const { data: eth } = useBalance({ address });
  const connect = useConnect();
  const switchChain = useSwitchChain();
  const [open, setOpen] = useState(false);
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">Capital overview</p>
          <h1>Know what you own. Control what is shared.</h1>
          <p className="ws-page-subtitle">
            Public gas, wallet-controlled confidential tokens and private
            balance permissions belong in one place.
          </p>
        </div>
        <Link href="/vault" className="ws-pill-button">
          Capital permissions <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="portfolio-metrics">
        <div className="portfolio-metric">
          <span>
            <CircleDollarSign size={18} /> Wallet ETH
          </span>
          <strong>
            {isConnected && eth
              ? formatEther(eth.value).slice(0, 14) + " ETH"
              : "—"}
          </strong>
          <small>
            {isConnected
              ? "Actual connected wallet gas balance"
              : "Connect a wallet to read public balances"}
          </small>
        </div>
        <div className="portfolio-metric">
          <span>
            <EyeOff size={18} /> cUSDC
          </span>
          <strong>Hidden</strong>
          <small>Unbacked Sepolia confidential test asset</small>
        </div>
        <div className="portfolio-metric">
          <span>
            <LockKeyhole size={18} /> cUSDT
          </span>
          <strong>Hidden</strong>
          <small>Only you can authorize decryption</small>
        </div>
        <div className="portfolio-metric">
          <span>
            <ShieldCheck size={18} /> cZAMA
          </span>
          <strong>Not revealed</strong>
          <small>Unbacked Zama test wrapper; not real ZAMA</small>
        </div>
      </div>
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">Zama wallet interface</p>
          <h2>Confidential assets</h2>
          <p>
            Decrypt eligible balances only when you choose. Nothing decrypted is
            sent to an MCP agent.
          </p>
        </div>
      </div>
      <div className="portfolio-actions-panel">
        <div>
          <h3>Your private asset tools</h3>
          <p>
            Use official Zama Sepolia wrappers to obtain unbacked test assets,
            shield, transfer and unshield. This is not an enabled private
            trading venue.
          </p>
        </div>
        {!isConnected ? (
          <button
            type="button"
            className="ws-pill-button"
            disabled={connect.isPending}
            onClick={() => connect.mutate({ connector: injected() })}
          >
            Connect wallet
          </button>
        ) : chainId !== 11155111 ? (
          <button
            type="button"
            className="ws-pill-button"
            disabled={switchChain.isPending}
            onClick={() => switchChain.mutate({ chainId: 11155111 })}
          >
            Switch to Sepolia
          </button>
        ) : (
          <button
            type="button"
            className="ws-pill-button"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close asset tools" : "Open confidential tools"}{" "}
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>
      {open && address && chainId === 11155111 ? (
        <div className="portfolio-confidential">
          <ConfidentialPanel key={address} address={address} />
        </div>
      ) : null}
      <div className="ws-security-note">
        <WalletCards size={18} />
        <p>
          cUSDC, cUSDT, cZAMA and cWETH are display labels for unbacked Sepolia
          test wrappers. The cZAMA test underlying is not the real Sepolia ZAMA
          token. Wrapping deposits, withdrawals, addresses and timing remain
          public.
        </p>
      </div>
    </div>
  );
}
