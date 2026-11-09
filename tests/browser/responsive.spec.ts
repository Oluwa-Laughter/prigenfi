import { test, expect } from "@playwright/test";

const pages = [
  "/",
  "/dashboard",
  "/markets",
  "/agents",
  "/strategies",
  "/portfolio",
  "/privacy",
  "/activity",
  "/vault",
  "/settings",
];
const marketData = {
  source: "DEX Screener",
  dataClass: "public-market-research",
  network: "Ethereum",
  chain: "ethereum",
  evmChainId: 1,
  privateTradingAvailable: false,
  searchMethod: "global-symbol",
  query: "ETH",
  fetchedAt: "2026-11-08T08:00:00Z",
  pairs: [
    {
      pairAddress: "0x" + "1".repeat(40),
      base: "WETH",
      quote: "USDC",
      baseName: "Wrapped Ether",
      dex: "uniswap",
      priceUsd: "2600",
      change24h: 1.2,
      liquidityUsd: 4000000,
      volume24hUsd: 1800000,
    },
  ],
};
for (const width of [320, 360, 430, 768, 1024]) {
  test(
    "no viewport overflow across pages at " + width + "px",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.route("**/api/markets*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(marketData),
        }),
      );
      for (const url of pages) {
        await page.goto(url);
        await expect(page.locator("main#main")).toBeVisible();
        const report = await page.evaluate(() => {
          const w = document.documentElement.clientWidth;
          const offenders = [
            ...document.querySelectorAll<HTMLElement>("body *"),
          ]
            .filter((el) => {
              const s = getComputedStyle(el),
                box = el.getBoundingClientRect();
              return (
                s.display !== "none" &&
                s.visibility !== "hidden" &&
                box.width > 0 &&
                box.left >= 0 &&
                box.right > w + 2
              );
            })
            .slice(0, 6)
            .map((el) => ({
              tag: el.tagName,
              className: String(el.className).slice(0, 100),
              right: Math.ceil(el.getBoundingClientRect().right),
            }));
          return {
            viewport: w,
            scroll: document.documentElement.scrollWidth,
            offenders,
          };
        });
        expect(
          report.scroll,
          url + " at " + width + "px: " + JSON.stringify(report.offenders),
        ).toBeLessThanOrEqual(report.viewport + 1);
      }
    },
  );
}
