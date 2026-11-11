import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { agentDb } from "../apps/web/src/lib/agent-accounts/db";
import { agentAccountsConfig } from "../apps/web/src/lib/agent-accounts/config";
async function main() {
  // Explicit migration: never run schema DDL as a side effect of a web request.
  const config = agentAccountsConfig();
  const migration = await readFile(
    resolve("infra/migrations/0001_agent_research_accounts.sql"),
    "utf8",
  );
  const sql = agentDb();
  await sql.unsafe(migration, [], { prepare: false });
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    AND table_name IN ('prigenfi_auth_challenges','prigenfi_auth_sessions','prigenfi_research_agents')
    ORDER BY table_name`;
  if (tables.length !== 3) throw new Error("MIGRATION_INCOMPLETE");
  process.stdout.write(
    "Agent authentication and research registry tables verified (" +
      config.chainId +
      ").\n",
  );
  await sql.end();
}
main().catch(() => {
  process.stderr.write(
    "Agent account migration failed; check configured Postgres and credentials.\n",
  );
  process.exitCode = 1;
});
