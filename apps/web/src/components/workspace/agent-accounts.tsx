"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useSignMessage } from "wagmi";
import {
  Bot,
  LockKeyhole,
  ShieldCheck,
  CircleSlash,
  ArrowUpRight,
} from "lucide-react";
import { publicMarketNetworks } from "@prigenfi/shared/market-research";
import { marketDomains } from "@prigenfi/shared/confidential-policy";
import Link from "next/link";

type Owner = { authenticated: true; address: string; chainId: number };
type AgentProfile = {
  id: string;
  label: string;
  host: string;
  allowedNetworks: string[];
  allowedMarkets: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  executionAllowed: false;
  permissionType: "research-profile";
};
type ServiceState = "loading" | "available" | "unavailable";

async function agentRequest(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof data.error === "string" ? data.error : "REQUEST_FAILED",
    );
  return data;
}

export function AgentAccounts() {
  const wallet = useConnection();
  const sign = useSignMessage();
  const [service, setService] = useState<ServiceState>("loading");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [remoteMcpAvailable, setRemoteMcpAvailable] = useState(false);
  const [oneTimeConnection, setOneTimeConnection] = useState<{
    profileId: string;
    token: string;
    endpoint: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [host, setHost] = useState<"codex" | "claude" | "other">("codex");
  const [networks, setNetworks] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<1 | 7 | 30>(7);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await agentRequest("/api/auth/session");
      setService("available");
      setRemoteMcpAvailable(res.remoteMcpAvailable === true);
      if (res.authenticated === true && typeof res.address === "string") {
        const identity = {
          authenticated: true as const,
          address: res.address,
          chainId: res.chainId as number,
        };
        setOwner(identity);
        const found = await agentRequest("/api/agents");
        setAgents(
          Array.isArray(found.agents) ? (found.agents as AgentProfile[]) : [],
        );
      } else {
        setOwner(null);
        setAgents([]);
      }
    } catch (e) {
      setOwner(null);
      setAgents([]);
      setRemoteMcpAvailable(false);
      setService(
        e instanceof Error && e.message === "AGENT_ACCOUNTS_UNAVAILABLE"
          ? "unavailable"
          : "unavailable",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const walletMatches =
    !!owner &&
    wallet.isConnected &&
    wallet.address?.toLowerCase() === owner.address &&
    wallet.chainId === owner.chainId;

  const connectedAddress = wallet.address;
  const connectedChain = wallet.chainId;
  useEffect(() => {
    if (connectedAddress !== undefined || connectedChain !== undefined) {
      setOneTimeConnection(null);
    }
  }, [connectedAddress, connectedChain]);

  async function signIn() {
    if (!wallet.isConnected || !wallet.address || !wallet.chainId) return;
    setBusy(true);
    setOneTimeConnection(null);
    setError("");
    try {
      const address = wallet.address,
        chainId = wallet.chainId;
      const challenge = await agentRequest("/api/auth/challenge", "POST", {
        address,
        chainId,
      });
      if (typeof challenge.message !== "string")
        throw new Error("INVALID_CHALLENGE");
      const signature = await sign.signMessageAsync({
        message: challenge.message,
      });
      const verified = await agentRequest("/api/auth/verify", "POST", {
        message: challenge.message,
        signature,
      });
      if (
        verified.authenticated !== true ||
        (verified.address as string)?.toLowerCase() !== address.toLowerCase()
      )
        throw new Error("SIGN_IN_FAILED");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SIGN_IN_FAILED");
    } finally {
      setBusy(false);
    }
  }
  async function logOut() {
    setOneTimeConnection(null);
    setBusy(true);
    setError("");
    try {
      await agentRequest("/api/auth/logout", "POST");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "LOGOUT_FAILED");
    } finally {
      setBusy(false);
    }
  }
  async function register(event: React.FormEvent) {
    event.preventDefault();
    if (!walletMatches) return;
    setBusy(true);
    setOneTimeConnection(null);
    setError("");
    try {
      await agentRequest("/api/agents", "POST", {
        label: label.trim(),
        host,
        allowedNetworks: networks,
        allowedMarkets: markets,
        durationDays,
      });
      setLabel("");
      setNetworks([]);
      setMarkets([]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "REGISTRATION_FAILED");
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (!walletMatches) return;
    setOneTimeConnection(null);
    setBusy(true);
    setError("");
    try {
      await agentRequest("/api/agents/" + encodeURIComponent(id), "DELETE");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "REVOCATION_FAILED");
    } finally {
      setConfirmRevoke(null);
      setBusy(false);
    }
  }
  async function issueResearchConnection(id: string) {
    if (!walletMatches || !remoteMcpAvailable) return;
    setBusy(true);
    setError("");
    setOneTimeConnection(null);
    try {
      const response = await agentRequest(
        "/api/agents/" + encodeURIComponent(id) + "/access-key",
        "POST",
      );
      if (
        typeof response.bearerToken !== "string" ||
        typeof response.endpoint !== "string" ||
        typeof response.expiresAt !== "string" ||
        response.executionAllowed !== false
      )
        throw new Error("INVALID_MCP_CONNECTION_RESPONSE");
      setOneTimeConnection({
        profileId: id,
        token: response.bearerToken,
        endpoint: response.endpoint,
        expiresAt: response.expiresAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CONNECTION_FAILED");
    } finally {
      setBusy(false);
    }
  }
  async function revokeResearchConnection(id: string) {
    if (!walletMatches) return;
    setBusy(true);
    setError("");
    setOneTimeConnection(null);
    try {
      await agentRequest(
        "/api/agents/" + encodeURIComponent(id) + "/access-key",
        "DELETE",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "REVOCATION_FAILED");
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || !walletMatches;
  return (
    <section
      className="agent-account-section"
      aria-labelledby="agent-account-heading"
    >
      <div className="ws-section-row">
        <div>
          <p className="ws-kicker">
            <ShieldCheck size={15} /> Wallet-controlled research access
          </p>
          <h2 id="agent-account-heading">Your research-agent profiles</h2>
          <p>
            Sign in with your wallet to save or revoke real, owner-scoped agent
            profiles. These are not connected trading accounts or spending
            approvals.
          </p>
        </div>
        {walletMatches && (
          <button
            type="button"
            className="agent-account-secondary"
            disabled={busy}
            onClick={() => void logOut()}
          >
            Sign out
          </button>
        )}
      </div>
      {service === "loading" ? (
        <p role="status" className="agent-account-message">
          Checking account availability…
        </p>
      ) : null}
      {service === "unavailable" ? (
        <div role="status" className="agent-account-message">
          <CircleSlash size={20} />
          <p>
            Agent accounts are unavailable. A secure database and wallet sign-in
            service must be configured before real profiles can be saved. No
            demo agents are shown.
          </p>
        </div>
      ) : null}
      {service === "available" && !walletMatches ? (
        <div className="agent-account-auth">
          <LockKeyhole size={23} />
          <div>
            <strong>
              {!wallet.isConnected
                ? "Connect your wallet first"
                : owner
                  ? "This session belongs to another wallet or chain"
                  : "Sign in to manage your agents"}
            </strong>
            <p>
              Wallet sign-in proves account ownership for research-profile
              management. It does not approve transactions or confidential-token
              decryption.
            </p>
            {wallet.isConnected && (
              <button
                type="button"
                className="agent-account-primary"
                disabled={busy || sign.isPending}
                onClick={() => void signIn()}
              >
                {busy ? "Verifying…" : "Sign in with wallet"}
              </button>
            )}
            {owner && (
              <button
                type="button"
                className="agent-account-secondary"
                disabled={busy}
                onClick={() => void logOut()}
              >
                End previous session
              </button>
            )}
          </div>
        </div>
      ) : null}
      {error && (
        <p className="agent-account-error" role="alert">
          {error.replaceAll("_", " ")}. No transaction was submitted.
        </p>
      )}
      {service === "available" && walletMatches && (
        <div className="agent-account-content">
          <form
            onSubmit={(event) => void register(event)}
            className="agent-account-form"
          >
            <div className="agent-account-form-title">
              <Bot size={21} />
              <div>
                <h3>Save an agent research profile</h3>
                <p>
                  You choose the host and permissible research scope. No host is
                  granted wallet authority.
                </p>
              </div>
            </div>
            <label>
              Agent label{" "}
              <input
                autoComplete="off"
                required
                minLength={2}
                maxLength={80}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Name this research agent"
              />
            </label>
            <label>
              Agent host{" "}
              <select
                value={host}
                onChange={(e) => setHost(e.target.value as typeof host)}
              >
                <option value="codex">Codex</option>
                <option value="claude">Claude</option>
                <option value="other">Another MCP host</option>
              </select>
            </label>
            <fieldset>
              <legend>Allowed research networks</legend>
              <div className="agent-account-options">
                {publicMarketNetworks.map((n) => (
                  <label key={n.id}>
                    <input
                      type="checkbox"
                      checked={networks.includes(n.id)}
                      onChange={(e) =>
                        setNetworks((current) =>
                          e.target.checked
                            ? [...current, n.id]
                            : current.filter((id) => id !== n.id),
                        )
                      }
                    />
                    {n.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Allowed research markets</legend>
              <div className="agent-account-options">
                {marketDomains.map((m) => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      checked={markets.includes(m)}
                      onChange={(e) =>
                        setMarkets((current) =>
                          e.target.checked
                            ? [...current, m]
                            : current.filter((id) => id !== m),
                        )
                      }
                    />
                    {m.replaceAll("-", " ")}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Profile expires{" "}
              <select
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(Number(e.target.value) as typeof durationDays)
                }
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
            <button
              className="agent-account-primary"
              type="submit"
              disabled={
                disabled ||
                label.trim().length < 2 ||
                !networks.length ||
                !markets.length
              }
            >
              {busy ? "Saving…" : "Save research profile"}
            </button>
            <small>
              Saving a profile does not connect a running agent, sign
              transactions, or authorize trading. Your strategy instructions are
              not stored here.
            </small>
          </form>
          <div className="agent-account-list">
            <h3>
              Saved profiles <span>({agents.length})</span>
            </h3>
            {!agents.length ? (
              <p className="agent-account-empty">
                No research agents saved for this wallet. Create one above to
                define a research scope.
              </p>
            ) : (
              agents.map((profile) => {
                const inactive =
                  !!profile.revokedAt ||
                  Date.parse(profile.expiresAt) <= Date.now();
                return (
                  <article className="agent-account-entry" key={profile.id}>
                    <div>
                      <strong>{profile.label}</strong>
                      <span>
                        {profile.host} ·{" "}
                        {inactive
                          ? profile.revokedAt
                            ? "Revoked"
                            : "Expired"
                          : "Research only"}
                      </span>
                    </div>
                    <p>Networks: {profile.allowedNetworks.join(", ")}</p>
                    <p>Markets: {profile.allowedMarkets.join(", ")}</p>
                    <p>
                      Expires:{" "}
                      {new Date(profile.expiresAt).toLocaleDateString()}
                    </p>
                    {!inactive && remoteMcpAvailable && (
                      <div className="agent-account-mcp-controls">
                        <button
                          type="button"
                          className="agent-account-primary"
                          disabled={busy}
                          onClick={() =>
                            void issueResearchConnection(profile.id)
                          }
                        >
                          Issue research connection
                        </button>
                        <button
                          type="button"
                          className="agent-account-secondary"
                          disabled={busy}
                          onClick={() =>
                            void revokeResearchConnection(profile.id)
                          }
                        >
                          Disable access keys
                        </button>
                        <small>
                          Remote research preview. Keys are valid for up to 24
                          hours, never authorize trades, and replacing one
                          invalidates the previous key.
                        </small>
                        {oneTimeConnection?.profileId === profile.id && (
                          <div
                            role="status"
                            className="agent-account-mcp-secret"
                          >
                            <strong>
                              Copy this new key now — it cannot be shown again.
                            </strong>
                            <p>
                              Use a trusted MCP host. Keep the access key out of
                              screenshots, chat prompts, Git and logs.
                            </p>
                            <label>
                              One-time research key{" "}
                              <input
                                value={oneTimeConnection.token}
                                readOnly
                                aria-label="One-time agent research key"
                                type="password"
                              />
                            </label>
                            <button
                              type="button"
                              className="agent-account-secondary"
                              onClick={() =>
                                void navigator.clipboard.writeText(
                                  oneTimeConnection.token,
                                )
                              }
                            >
                              Copy key
                            </button>
                            <p>
                              Set the environment variable{" "}
                              <code>PRIGENFI_MCP_TOKEN</code> securely on your
                              own device, then register the endpoint with Codex:
                            </p>
                            <code className="agent-account-mcp-command">{`codex mcp add prigenfi-profile --url ${oneTimeConnection.endpoint} --bearer-token-env-var PRIGENFI_MCP_TOKEN`}</code>
                            <p>
                              Expires{" "}
                              {new Date(
                                oneTimeConnection.expiresAt,
                              ).toLocaleString()}
                              . Never place the key directly into the command
                              line.
                            </p>
                            <button
                              type="button"
                              className="agent-account-secondary"
                              onClick={() => setOneTimeConnection(null)}
                            >
                              Close one-time key
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!inactive &&
                      (confirmRevoke === profile.id ? (
                        <div className="agent-account-actions">
                          <button
                            type="button"
                            disabled={busy}
                            className="agent-account-danger"
                            onClick={() => void revoke(profile.id)}
                          >
                            Confirm revoke
                          </button>
                          <button
                            type="button"
                            className="agent-account-secondary"
                            onClick={() => setConfirmRevoke(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="agent-account-secondary"
                          disabled={busy}
                          onClick={() => setConfirmRevoke(profile.id)}
                        >
                          Revoke profile
                        </button>
                      ))}
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
      <div className="agent-account-footer">
        <Link href="/agents/connect">
          Connect Codex through MCP <ArrowUpRight size={16} />
        </Link>
        <span>
          Agent profile ≠ connected runtime ≠ wallet spending authority
        </span>
      </div>
    </section>
  );
}
