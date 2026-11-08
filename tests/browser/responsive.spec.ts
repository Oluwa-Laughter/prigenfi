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
  network: "Ethereum mainnet",
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
      await page.route("**/api/confidential-venue", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "deployed-proxy",
            uupsConfirmed: true,
            chainId: 11155111,
            blockNumber: "12091125",
            implementationAddress: "0x93FA553AFd73952105450264620eA08aBa7B52d5",
            privateTradingEnabled: false,
            executionAllowed: false,
            checkedAt: "2026-11-08T14:23:01.891Z",
          }),
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
        if (width === 320 && ["/", "/dashboard", "/privacy"].includes(url)) {
          await page.screenshot({
            path:
              "docs/evidence/small-" +
              url.replaceAll("/", "-").replace(/^-$/, "home") +
              "-320.png",
            fullPage: true,
          });
        }
      }
    },
  );
}
