import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { agentDb } from "../apps/web/src/lib/agent-accounts/db";
import { agentAccountsConfig } from "../apps/web/src/lib/agent-accounts/config";
async function main() {
  // Explicit migration: never run schema DDL as a side effect of a web request.
  const config = agentAccountsConfig();
  const migrations = [
    "0001_agent_research_accounts.sql",
    "0002_agent_mcp_keys.sql",
    "0003_public_research_mcp_quota.sql",
    "0004_owner_market_watchlist.sql",
    "0005_erc1271_session_authority.sql",
  ];
  const sql = agentDb();
  for (const filename of migrations) {
    const migration = await readFile(
      resolve("infra/migrations", filename),
      "utf8",
    );
    await sql.unsafe(migration, [], { prepare: false });
  }
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    AND table_name IN ('prigenfi_auth_challenges','prigenfi_auth_sessions','prigenfi_research_agents','prigenfi_agent_mcp_keys','prigenfi_public_mcp_quota','prigenfi_market_watchlist')
    ORDER BY table_name`;
  if (tables.length !== 6) throw new Error("MIGRATION_INCOMPLETE");
  const authorityColumns = await sql<
    { table_name: string; column_name: string }[]
  >`
    SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND (
      (table_name='prigenfi_auth_sessions' AND column_name IN ('auth_kind','authority_proof'))
      OR (table_name='prigenfi_agent_mcp_keys' AND column_name IN ('auth_kind','auth_session_hash'))
    )`;
  if (authorityColumns.length !== 4)
    throw new Error("SESSION_AUTHORITY_MIGRATION_INCOMPLETE");
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
