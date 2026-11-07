import { serverEnvSchema } from "@prigenfi/shared";
import { buildApi } from "./app";
const env = serverEnvSchema.parse(process.env);
const app = await buildApi();
await app.listen({ host: "127.0.0.1", port: env.API_PORT });
