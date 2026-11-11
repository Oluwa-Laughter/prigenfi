"use client";
import { useState } from "react";
import { useConnection, usePublicClient } from "wagmi";
import { getAddress, isAddress, type Hex } from "viem";
import { agentVaultAbi } from "@prigenfi/shared";
import { verifyVault } from "@prigenfi/sdk";
import { Activity, ArrowUpRight, Search, ShieldCheck } from "lucide-react";

type VaultEvent = {
  key: string;
  block: string;
  type: string;
  transactionHash: Hex;
};
export default function ActivityPage() {
  const { chainId, isConnected } = useConnection();
  const client = usePublicClient();
  const [vaultAddress, setVaultAddress] = useState("");
  const [events, setEvents] = useState<VaultEvent[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkedBlock, setCheckedBlock] = useState("");
  async function inspect(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(vaultAddress) || !client) return;
    setBusy(true);
    setError("");
    setEvents(null);
    try {
      const address = getAddress(vaultAddress);
      await verifyVault(client, address);
      const last = await client.getBlockNumber();
      const first = last > 1500n ? last - 1500n : 0n;
      const logs = await client.getContractEvents({
        address,
        abi: agentVaultAbi,
        fromBlock: first,
        toBlock: last,
      });
      setEvents(
        logs
          .map((log) => ({
            key: log.transactionHash + "-" + log.logIndex,
            block: log.blockNumber.toString(),
            type: log.eventName,
            transactionHash: log.transactionHash,
          }))
          .reverse(),
      );
      setCheckedBlock(last.toString());
    } catch {
      setError(
        "Could not verify or read this vault. Check the address, network and RPC availability.",
      );
    } finally {
      setBusy(false);
    }
  }
  const supported = chainId === 31337 || chainId === 11155111;
  return (
    <div className="workspace-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">On-chain audit trail</p>
          <h1>Every permission leaves a trail.</h1>
          <p className="ws-page-subtitle">
            Inspect actual vault events. Trade history and agent profitability
            require an execution indexer that is not built yet.
          </p>
        </div>
      </div>
      <section className="activity-reader">
        <div>
          <h2>Inspect a testnet vault</h2>
          <p>
            Enter a vault address to read the most recent 1,500 blocks of public
            policy and transfer events.
          </p>
        </div>
        <form onSubmit={inspect} className="activity-search">
          <label className="sr-only" htmlFor="activity-vault-address">
            Vault contract address
          </label>
          <Search size={19} />
          <input
            id="activity-vault-address"
            value={vaultAddress}
            onChange={(e) => setVaultAddress(e.target.value)}
            placeholder="0x… vault contract address"
          />
          <button
            type="submit"
            disabled={
              !isConnected || !supported || !isAddress(vaultAddress) || busy
            }
          >
            {busy ? "Reading…" : "Read activity"}
          </button>
        </form>
        {!isConnected && (
          <p className="activity-hint">
            Connect a testnet wallet using the top navigation to inspect events.
          </p>
        )}
        {error && (
          <p role="alert" className="activity-error">
            {error}
          </p>
        )}
        {events && (
          <div className="event-list">
            <div className="event-list-head">
              <span>Verified public vault events</span>
              <span>Through block {checkedBlock}</span>
            </div>
            {!events.length ? (
              <div className="insight-empty">
                No events found in the scanned block window. Older activity may
                exist.
              </div>
            ) : (
              events.map((event) => (
                <div className="event-row" key={event.key}>
                  <div className="event-icon">
                    <Activity size={18} />
                  </div>
                  <div>
                    <strong>{event.type}</strong>
                    <small>
                      Block {event.block} · Public on-chain record, not a
                      profitable trade
                    </small>
                  </div>
                  {chainId === 11155111 ? (
                    <a
                      href={
                        "https://sepolia.etherscan.io/tx/" +
                        event.transactionHash
                      }
                      target="_blank"
                      rel="noreferrer"
                      aria-label={
                        "Inspect transaction " + event.transactionHash
                      }
                    >
                      View receipt <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <span
                      className="activity-local-hash"
                      title={event.transactionHash}
                    >
                      Local tx {event.transactionHash.slice(0, 8)}…
                      {event.transactionHash.slice(-6)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>
      <div className="ws-security-note">
        <ShieldCheck size={18} />
        <p>
          Vault policy updates and public token transfers are not closed
          positions, realized profits or winning trades. PrigenFi will calculate
          agent win rates and P&amp;L only from verified, reconciled execution
          and position records.
        </p>
      </div>
    </div>
  );
}
