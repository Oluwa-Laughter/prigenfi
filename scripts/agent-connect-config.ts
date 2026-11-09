import { resolve } from "node:path";

/**
 * Host-independent stdio launcher for a locally installed PrigenFi checkout.
 * No network endpoints, bearer tokens, private keys or local vault config.
 */
export function localAgentLauncher(root: string, node: string) {
  return {
    command: node,
    args: [
      resolve(root, "node_modules/tsx/dist/cli.mjs"),
      resolve(root, "services/mcp-server/src/research-stdio.ts"),
    ],
  };
}

export function codexConfig(root: string, node: string): string {
  const launcher = localAgentLauncher(root, node);
  const quote = (value: string) => JSON.stringify(value);
  return [
    "# PrigenFi local MCP research tools; no wallet signing or account authorization.",
    "[mcp_servers.prigenfi]",
    `command = ${quote(launcher.command)}`,
    `args = [${launcher.args.map(quote).join(", ")}]`,
    `cwd = ${quote(root)}`,
    "startup_timeout_sec = 25",
    "tool_timeout_sec = 30",
    'default_tools_approval_mode = "prompt"',
    "",
  ].join("\n");
}

export function claudeConfig(root: string, node: string): string {
  const launcher = localAgentLauncher(root, node);
  return JSON.stringify({ mcpServers: { prigenfi: launcher } }, null, 2) + "\n";
}
