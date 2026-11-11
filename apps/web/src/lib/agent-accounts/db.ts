import postgres from "postgres";
import { agentAccountsConfig } from "./config";

const connections = new Map<string, ReturnType<typeof postgres>>();
/** Only trusted server code can access this connection. Never use NEXT_PUBLIC_ settings. */
export function agentDb() {
  const url = agentAccountsConfig().databaseUrl;
  let connection = connections.get(url);
  if (!connection) {
    connection = postgres(url, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 4,
      max_lifetime: 600,
      prepare: true,
    });
    connections.set(url, connection);
  }
  return connection;
}
