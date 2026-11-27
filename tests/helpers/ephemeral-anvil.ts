import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";

/**
 * Start a private, throwaway Anvil (chain 31337) on a free loopback port so a
 * chain-mutating test (impersonation, timestamp control) cannot interfere with
 * the shared Anvil used by other integration tests. `--silent` keeps Anvil's
 * development account listing out of logs. No keys are read or written.
 */
export async function startEphemeralAnvil(): Promise<{
  url: string;
  stop: () => Promise<void>;
}> {
  const port = await new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string")
        return reject(new Error("NO_PORT"));
      server.close(() => resolvePort(address.port));
    });
  });
  const child: ChildProcess = spawn(
    "anvil",
    ["--silent", "--host", "127.0.0.1", "--port", String(port)],
    {
      stdio: "ignore",
    },
  );
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error("EPHEMERAL_ANVIL_EXITED");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      });
      const body = (await response.json()) as { result?: string };
      if (body.result === "0x7a69") break;
    } catch {}
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      throw new Error("EPHEMERAL_ANVIL_TIMEOUT");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    url,
    stop: () =>
      new Promise<void>((resolveStop) => {
        if (child.exitCode !== null) return resolveStop();
        child.once("exit", () => resolveStop());
        child.kill("SIGTERM");
      }),
  };
}
