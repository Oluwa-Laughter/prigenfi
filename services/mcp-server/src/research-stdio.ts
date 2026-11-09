/**
 * Consumer/developer research MCP endpoint. It NEVER creates a vault client,
 * even if a host inherits RPC, token, vault or agent variables by accident.
 * Its tool list is limited to read-only public research and policy checks.
 */
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createMcpServer } from "./index";

serveStdio(() => createMcpServer());
