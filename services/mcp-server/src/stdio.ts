import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { serverEnvSchema } from "@prigenfi/shared";
import { PrigenFiClient } from "@prigenfi/sdk";
import { createMcpServer } from "./index";
const env = serverEnvSchema.parse(process.env);
const client =
  env.VAULT_ADDRESS && env.AGENT_ADDRESS && env.TOKEN_ADDRESS
    ? new PrigenFiClient({
        rpcUrl: env.RPC_URL,
        chainId: env.CHAIN_ID,
        vault: env.VAULT_ADDRESS,
        agent: env.AGENT_ADDRESS,
        token: env.TOKEN_ADDRESS,
      })
    : undefined;
serveStdio(() => createMcpServer(client));
