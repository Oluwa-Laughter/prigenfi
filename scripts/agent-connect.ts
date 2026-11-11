import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  codexConfig,
  claudeConfig,
  localAgentLauncher,
} from "./agent-connect-config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const expected = [
  "confidential_assets_list",
  "confidential_capabilities_get",
  "confidential_route_check",
  "agent_plan_evaluate",
  "agent_market_research_check",
  "market_search",
  "market_pair_lookup",
  "market_integrity_assess",
  "agent_execution_status",
].sort();

function help() {
  process.stdout.write(
    `PrigenFi local MCP connection (research-only, no wallet funds)\n\n` +
      `pnpm agent:connect --check           Verify real stdio handshake and tools\n` +
      `pnpm agent:connect --print codex     Print Codex config.toml entry\n` +
      `pnpm agent:connect --print claude    Print Claude Desktop/Code JSON entry\n` +
      `pnpm agent:connect --write          Write untracked config templates to .local/agent-connection\n\n` +
      `These commands DO NOT connect or authorize a user's wallet or register a hosted agent.\n`,
  );
}

async function main() {
  if (args.length === 0 || args[0] === "--help") {
    help();
    return;
  }
  const launcher = localAgentLauncher(root, process.execPath);
  await Promise.all(launcher.args.map((path) => access(path)));
  if (args[0] === "--print" && args.length === 2) {
    if (args[1] === "codex")
      process.stdout.write(codexConfig(root, process.execPath));
    else if (args[1] === "claude")
      process.stdout.write(claudeConfig(root, process.execPath));
    else throw new Error("UNKNOWN_HOST");
    return;
  }
  if (args[0] === "--write" && args.length === 1) {
    const dir = resolve(root, ".local/agent-connection");
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(dir, "codex-prigenfi.toml"),
      codexConfig(root, process.execPath),
      { mode: 0o600, flag: "w" },
    );
    await writeFile(
      resolve(dir, "claude-prigenfi.json"),
      claudeConfig(root, process.execPath),
      { mode: 0o600, flag: "w" },
    );
    process.stdout.write(
      "Prepared local templates: .local/agent-connection/codex-prigenfi.toml and claude-prigenfi.json\nNeither host configuration was modified; paste the matching section into your chosen MCP host.\n",
    );
    return;
  }
  if (args[0] !== "--check" || args.length !== 1)
    throw new Error("UNKNOWN_ARGUMENT");

  const transport = new StdioClientTransport({
    ...launcher,
    // Do not inherit the operator's local vault configuration or secrets.
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" },
    stderr: "pipe",
  });
  const client = new Client({
    name: "prigenfi-agent-connect-check",
    version: "0.1.0",
  });
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
    if (
      JSON.stringify(tools) !== JSON.stringify(expected) ||
      !prompts.includes("interpret_private_defi_goal") ||
      tools.some((t) => t.startsWith("dev_"))
    )
      throw new Error("UNEXPECTED_MCP_CAPABILITIES");
    const status = await client.callTool({
      name: "agent_execution_status",
      arguments: {},
    });
    if (status.isError || !Array.isArray(status.content))
      throw new Error("EXECUTION_BOUNDARY_UNVERIFIED");
    const raw = status.content[0];
    if (!raw || raw.type !== "text")
      throw new Error("EXECUTION_BOUNDARY_UNVERIFIED");
    const payload: unknown = JSON.parse(raw.text);
    if (
      !payload ||
      typeof payload !== "object" ||
      !("available" in payload) ||
      payload.available !== false ||
      !("publicFallback" in payload) ||
      payload.publicFallback !== false
    )
      throw new Error("EXECUTION_BOUNDARY_UNVERIFIED");
    process.stdout.write(
      JSON.stringify(
        {
          status: "local-mcp-verified",
          transport: "stdio",
          toolCount: tools.length,
          toolNames: tools,
          prompts,
          hostConnected: false,
          userWalletAuthorized: false,
          privateExecutionEnabled: false,
          note: "Verified an isolated child-process handshake; this is not a persistent connection to any host or user agent.",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await client.close();
  }
}
main().catch((e) => {
  const message = e instanceof Error ? e.message : "UNKNOWN_FAILURE";
  process.stderr.write("PrigenFi MCP connector failed: " + message + "\n");
  process.exitCode = 1;
});
