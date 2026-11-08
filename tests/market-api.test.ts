import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../apps/web/src/app/api/markets/route";

const contract = "0x" + "1".repeat(40);
const pool = (chainId: string, address: string) => ({
  chainId,
  pairAddress: address,
  dexId: "uniswap",
  baseToken: { address: contract, name: "ETH", symbol: "ETH" },
  quoteToken: { address: contract, name: "USD Coin", symbol: "USDC" },
  priceUsd: "2000",
  priceChange: { h24: 2.25 },
  liquidity: { usd: 100000 },
  volume: { h24: 50000 },
});
afterEach(() => vi.unstubAllGlobals());
describe("public market proxy boundaries", () => {
  it("rejects unsupported queries before calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(
      new Request("http://localhost/api/markets?q=%3Cscript%3E"),
    );
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps only Ethereum addresses and a bounded public result", async () => {
    const rows = [
      pool("ethereum", "0x" + "2".repeat(40)),
      pool("bsc", "0x" + "3".repeat(40)),
      pool("ethereum", "javascript:bad"),
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ pairs: rows }) });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(
      new Request("http://localhost/api/markets?q=ETH"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.network).toBe("Ethereum mainnet");
    expect(body.pairs).toHaveLength(1);
    expect(body.pairs[0].pairAddress).toBe("0x" + "2".repeat(40));
    expect(fetchMock.mock.calls[0][0]).toContain(
      "api.dexscreener.com/latest/dex/search?q=ETH",
    );
  });
  it("reports upstream failure instead of inventing prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const response = await GET(
      new Request("http://localhost/api/markets?q=PEPE"),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).pairs).toEqual([]);
  });
});
