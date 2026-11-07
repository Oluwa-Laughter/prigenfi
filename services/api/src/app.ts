import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { confidentialAssets } from "@prigenfi/shared";
/// Public metadata only. No user identities, private portfolios, signing or execution endpoints.
export async function buildApi() {
  const app = Fastify({
    bodyLimit: 16384,
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "body",
        "signature",
        "permit",
        "balance",
      ],
    },
  });
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  app.setErrorHandler((error, _, reply) => {
    const status =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode < 500
        ? error.statusCode
        : 500;
    reply.status(status).send({
      error: { code: status === 429 ? "RATE_LIMITED" : "REQUEST_FAILED" },
    });
  });
  app.get("/health", async () => ({
    status: "ok",
    execution: "disabled",
    service: "prigenfi-metadata",
  }));
  app.get("/ready", async () => ({
    ready: true,
    capabilities: ["public-metadata"],
    privateApi: false,
  }));
  app.get("/v1/assets", async () => ({
    assets: confidentialAssets,
    balances: "not-collected",
  }));
  return app;
}
