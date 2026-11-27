import { readFile } from "node:fs/promises";
import { assessOperatorEnvironment, parseEnvFile } from "./env-check-core";

/*
 * pnpm env:check [--file apps/web/.env.local]
 *
 * Prints configuration readiness as status codes only. Never prints values,
 * URLs, hosts or secret lengths. Exit code 1 on any invalid/danger finding.
 */
const argv = process.argv.slice(2);
const fileIndex = argv.indexOf("--file");
let env: Record<string, string | undefined> = { ...process.env };
if (fileIndex !== -1) {
  const path = argv[fileIndex + 1];
  if (!path) throw new Error("--file requires a path");
  // File values override the shell for this check only; nothing is written.
  env = { ...env, ...parseEnvFile(await readFile(path, "utf8")) };
}
const checks = assessOperatorEnvironment(env);
const width = Math.max(...checks.map((c) => `${c.group}/${c.name}`.length));
for (const check of checks)
  console.log(
    `${check.status.toUpperCase().padEnd(8)} ${`${check.group}/${check.name}`.padEnd(width)}  ${check.detail}`,
  );
const failing = checks.filter(
  (c) => c.status === "invalid" || c.status === "danger",
);
console.log(
  failing.length === 0
    ? "\nNo invalid or dangerous configuration found. Values were not printed."
    : `\n${failing.length} configuration problem(s). Values were not printed.`,
);
process.exit(failing.length === 0 ? 0 : 1);
