import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../apps/web/src/app/api/markets/route";
import {
  searchPublicMarkets,
  inspectPublicMarketPair,
  marketSearchSchema,
} from "../packages/shared/src/market-research";

// Deterministic test-only API fixtures. Production never serves these prices.
const contract = "0x" + "1".repeat(40);
const token2 = "0x" + "2".repeat(40);
const pairAddress = "0x" + "3".repeat(40);
const pool = (chainId: string, address: string) => ({
  chainId,
  pairAddress: address,
  dexId: "uniswap",
  baseToken: { address: contract, name: "ETH", symbol: "ETH" },
  quoteToken: { address: token2, name: "USD Coin", symbol: "USDC" },
  priceUsd: "2000",
  priceChange: { h24: 2.25 },
  liquidity: { usd: 100000 },
  volume: { h24: 50000 },
});
const fakeJson = (value: unknown): Promise<Response> =>
  Promise.resolve({
    ok: true,
    json: async () => value,
  } as Response);
afterEach(() => vi.unstubAllGlobals());

describe("real public EVM market feed boundary", () => {
  it("rejects unknown networks and prompt-like input before calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of [
      "http://localhost/api/markets?q=%3Cscript%3E",
      "http://localhost/api/markets?chain=solana&q=ETH",
      "http://localhost/api/markets?chain=javascript%3Aevil&q=ETH",
    ]) {
      expect((await GET(new Request(url))).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      marketSearchSchema.safeParse({
        chain: "base",
        query: "USDC",
        rpc: "https://evil",
      }).success,
    ).toBe(false);
  });
  it("returns only correctly scoped on-chain EVM pairs, with real source metadata", async () => {
    const rows = [
      pool("base", pairAddress),
      pool("ethereum", contract),
      pool("base", "javascript:bad"),
      pool("base", pairAddress.toUpperCase().replace("0X", "0x")),
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ pairs: rows }) });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(
      new Request("http://localhost/api/markets?chain=base&q=ETH"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: "DEX Screener",
      dataClass: "public-market-research",
      network: "Base",
      chain: "base",
      evmChainId: 8453,
      privateTradingAvailable: false,
      searchMethod: "global-symbol",
    });
    expect(body.pairs).toHaveLength(1);
    expect(body.pairs[0].baseAddress).toBe(contract);
    expect(body.pairs[0].pairAddress).toBe(pairAddress);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "api.dexscreener.com/latest/dex/search?q=ETH",
    );
  });
  it("uses chain-specific token address lookup, never a guessed global pool", async () => {
    const query = token2;
    const calls: string[] = [];
    const request = async (url: string | URL | Request) => {
      calls.push(String(url));
      return fakeJson([
        pool("arbitrum", pairAddress),
        pool("ethereum", contract),
      ]);
    };
    const output = await searchPublicMarkets(
      { chain: "arbitrum", query },
      request as typeof fetch,
    );
    expect(output.searchMethod).toBe("chain-token-address");
    expect(output.pairs).toHaveLength(1);
    expect(calls[0]).toContain(`/token-pairs/v1/arbitrum/${query}`);
    expect(output.privateTradingAvailable).toBe(false);
  });
  it("verifies a particular network pair with no trade capability", async () => {
    const urls: string[] = [];
    const request = async (url: string | URL | Request) => {
      urls.push(String(url));
      return fakeJson({ pairs: [pool("polygon", pairAddress)] });
    };
    const result = await inspectPublicMarketPair(
      { chain: "polygon", pairAddress },
      request as typeof fetch,
    );
    expect(result.pair?.pairAddress).toBe(pairAddress);
    expect(result.privateTradingAvailable).toBe(false);
    expect(urls[0]).toContain(`/latest/dex/pairs/polygon/${pairAddress}`);
  });
  it("drops invalid provider prices, symbols and network identities", async () => {
    const invalid = {
      ...pool("bsc", pairAddress),
      priceUsd: "Infinity",
      liquidity: { usd: -7 },
      baseToken: {
        address: contract,
        name: "long".repeat(30),
        symbol: "BAD".repeat(50),
      },
    };
    const result = await searchPublicMarkets(
      { chain: "bsc", query: "USDC" },
      (async () =>
        fakeJson({
          pairs: [invalid, pool("solana", contract)],
        })) as typeof fetch,
    );
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].priceUsd).toBeNull();
    expect(result.pairs[0].liquidityUsd).toBeNull();
    expect(result.pairs[0].base.length).toBeLessThanOrEqual(24);
    expect(result.pairs[0].baseName.length).toBeLessThanOrEqual(55);
  });
  it("reports upstream failures instead of fabricating prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const response = await GET(
      new Request("http://localhost/api/markets?chain=base&q=USDC"),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).pairs).toEqual([]);
  });
});
