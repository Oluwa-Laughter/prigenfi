import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  claudeConfig,
  codexConfig,
  localAgentLauncher,
} from "../scripts/agent-connect-config";

const repo = resolve(process.cwd());

describe("real local MCP host setup", () => {
  it("generates deterministic host configs for the research-only server", () => {
    const launcher = localAgentLauncher(repo, process.execPath);
    expect(launcher.args).toHaveLength(2);
    expect(launcher.args[0]).toContain("node_modules/tsx/dist/cli.mjs");
    expect(launcher.args[1]).toContain(
      "services/mcp-server/src/research-stdio.ts",
    );
    expect(launcher.command).toBe(process.execPath);
    expect(JSON.parse(claudeConfig(repo, process.execPath))).toEqual({
      mcpServers: { prigenfi: launcher },
    });
    const toml = codexConfig(repo, process.execPath);
    expect(toml).toContain("[mcp_servers.prigenfi]");
    expect(toml).toContain(`command = ${JSON.stringify(process.execPath)}`);
    expect(toml).toContain('default_tools_approval_mode = "prompt"');
    expect(toml).not.toMatch(
      /(VAULT_ADDRESS|PRIVATE_KEY|AGENT_ADDRESS|TOKEN_ADDRESS|secret =)/,
    );
    expect(claudeConfig(repo, process.execPath)).not.toContain("VAULT_ADDRESS");
  });
  it("default stdio path cannot construct a configured vault client", () => {
    const entry = readFileSync(
      "services/mcp-server/src/research-stdio.ts",
      "utf8",
    );
    expect(entry).toContain("createMcpServer()");
    expect(entry).not.toContain("PrigenFiClient");
    expect(entry).not.toContain("serverEnvSchema");
    const pkg = JSON.parse(
      readFileSync("services/mcp-server/package.json", "utf8"),
    );
    expect(pkg.scripts.start).toContain("research-stdio.ts");
    expect(pkg.scripts["start:dev"]).toContain("stdio.ts");
  });
  it("connection doctor negotiates an actual isolated MCP child process, even with inherited vault env", async () => {
    const stdout = await new Promise<string>((res, rej) => {
      const child = spawn(
        process.execPath,
        [
          resolve(repo, "node_modules/tsx/dist/cli.mjs"),
          resolve(repo, "scripts/agent-connect.ts"),
          "--check",
        ],
        {
          cwd: repo,
          env: {
            ...process.env,
            CHAIN_ID: "31337",
            VAULT_ADDRESS: "0x1111111111111111111111111111111111111111",
            AGENT_ADDRESS: "0x2222222222222222222222222222222222222222",
            TOKEN_ADDRESS: "0x3333333333333333333333333333333333333333",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let out = "",
        err = "";
      child.stdout.on("data", (data: Buffer) => {
        out += data.toString();
      });
      child.stderr.on("data", (data: Buffer) => {
        err += data.toString();
      });
      child.on("error", rej);
      child.on("close", (code) =>
        code === 0
          ? res(out)
          : rej(new Error("Doctor exited " + code + ": " + err.slice(0, 500))),
      );
    });
    const result = JSON.parse(stdout);
    expect(result).toMatchObject({
      status: "local-mcp-verified",
      transport: "stdio",
      toolCount: 9,
      hostConnected: false,
      userWalletAuthorized: false,
      privateExecutionEnabled: false,
    });
    expect(result.toolNames).toContain("market_search");
    expect(
      result.toolNames.some((name: string) => name.startsWith("dev_")),
    ).toBe(false);
    expect(result.prompts).toContain("interpret_private_defi_goal");
  }, 20_000);
});
