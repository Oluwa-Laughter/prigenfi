import { it, expect } from "vitest";
import { buildApi } from "../services/api/src/app";
it("serves metadata only and exposes no private or execution routes", async () => {
  const app = await buildApi();
  try {
    expect((await app.inject("/health")).json().execution).toBe("disabled");
    expect((await app.inject("/v1/assets")).json().assets).toHaveLength(7);
    expect((await app.inject("/v1/portfolio?address=0x1")).statusCode).toBe(
      404,
    );
    expect(
      (await app.inject({ method: "POST", url: "/execute", payload: {} }))
        .statusCode,
    ).toBe(404);
  } finally {
    await app.close();
  }
});
