import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const marketFixture = {
  source: "DEX Screener",
  network: "Ethereum mainnet",
  query: "ETH",
  fetchedAt: "2026-11-08T09:00:00.000Z",
  pairs: [
    {
      pairAddress: "0x1111111111111111111111111111111111111111",
      base: "ETH",
      quote: "USDC",
      baseName: "Ethereum",
      dex: "uniswap",
      priceUsd: "2350.44",
      change24h: 3.21,
      liquidityUsd: 3500000,
      volume24hUsd: 1900000,
    },
    {
      pairAddress: "0x2222222222222222222222222222222222222222",
      base: "PEPE",
      quote: "WETH",
      baseName: "Test fixture meme",
      dex: "uniswap",
      priceUsd: "0.0000123",
      change24h: -2.4,
      liquidityUsd: 900000,
      volume24hUsd: 600000,
    },
    {
      pairAddress: "0x3333333333333333333333333333333333333333",
      base: "UNI",
      quote: "ETH",
      baseName: "Test fixture DeFi",
      dex: "sushiswap",
      priceUsd: "5.21",
      change24h: 1.3,
      liquidityUsd: 1600000,
      volume24hUsd: 350000,
    },
  ],
};
async function mockMarketApi(page: import("@playwright/test").Page) {
  await page.route("**/api/markets*", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(marketFixture),
    }),
  );
}
for (const width of [1440, 390]) {
  test(
    "public site, multi-page workspace, markets and mandates at " +
      width +
      "px",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await mockMarketApi(page);
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
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Direct the trade.",
      );
      await expect(page.locator("footer")).not.toContainText("GitHub");
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("link", { name: "Skip to content" }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Emerging" }).click();
      await expect(
        page.getByText("Inspect contract safety", { exact: false }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: "docs/evidence/home-" + width + ".png",
        fullPage: true,
      });
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Make your agent work for you.",
      );
      await expect(page.getByText("Trading win rate")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "24h market volume" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Pool liquidity mix" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "New agent mandate" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: "docs/evidence/dashboard-disconnected-" + width + ".png",
        fullPage: true,
      });
      if (width < 800) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(
          page.getByRole("navigation", { name: "Platform" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Close navigation", exact: true })
          .click();
      } else {
        await expect(
          page.getByRole("navigation", { name: "Platform" }),
        ).toBeVisible();
      }
      await page.goto("/markets?category=meme");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Explore Ethereum markets.",
      );
      await expect(
        page.getByRole("button", { name: "Emerging tokens" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("table").getByText("PEPE")).toBeVisible();
      await page.screenshot({
        path: "docs/evidence/markets-" + width + ".png",
        fullPage: true,
      });
      await page.goto("/strategies");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Different markets.",
      );
      await page.getByRole("link", { name: "Create mandate" }).first().click();
      await expect(page).toHaveURL(/\/agents\?strategy=all/);
      await expect(
        page.getByRole("heading", {
          name: "Tell your agent what you want to achieve.",
        }),
      ).toBeVisible();
      await expect(page.getByLabel("Market scope")).toHaveValue(
        "All Ethereum markets",
      );
      await page.getByText("Preview the complete confidential mandate").click();
      await expect(page.locator(".brief-preview pre")).toContainText(
        "All Ethereum markets",
      );
      await expect(page.locator(".brief-preview pre")).toContainText(
        "CONFIDENTIAL ONLY",
      );
      await page.screenshot({
        path: "docs/evidence/agents-" + width + ".png",
        fullPage: true,
      });
      await page.goto("/privacy");
      await expect(page.getByText("Proxy confirmed")).toBeVisible();
      await expect(page.getByText("Execution locked")).toBeVisible();
      await expect(page.getByText("12091125")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Privacy is a requirement.",
      );
      await expect(
        page.locator(".privacy-asset").getByText("cZAMA", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Blocked — no verified private execution venue"),
      ).toBeVisible();
      await page.screenshot({
        path: "docs/evidence/privacy-" + width + ".png",
        fullPage: true,
      });
      await page.goto("/portfolio");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Know what you own.",
      );
      await page.goto("/activity");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Every permission leaves a trail.",
      );
      await page.goto("/settings");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Safety is the product.",
      );
      await page.goto("/docs");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "explicit financial boundaries",
      );
      expect(errors).toEqual([]);
    },
  );
}
test("wallet controls, simulation, pause and revoke on actual local vault", async ({
  page,
}) => {
  test.skip(
    process.env.LOCAL_INTEGRATION !== "1",
    "requires local Anvil deployment",
  );
  const d = JSON.parse(await readFile(".local/deployment.json", "utf8"));
  await page.addInitScript(
    ({ owner, rpcUrl }) => {
      const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
      let connected = false;
      const ethereum = {
        isMetaMask: true,
        on: (name: string, fn: (...args: unknown[]) => void) =>
          listeners.set(name, [...(listeners.get(name) ?? []), fn]),
        removeListener: (name: string, fn: (...args: unknown[]) => void) =>
          listeners.set(
            name,
            (listeners.get(name) ?? []).filter((f) => f !== fn),
          ),
        request: async ({
          method,
          params,
        }: {
          method: string;
          params?: unknown[];
        }) => {
          if (method === "eth_requestAccounts") {
            connected = true;
            return [owner];
          }
          if (method === "eth_accounts") return connected ? [owner] : [];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "wallet_requestPermissions")
            return [{ parentCapability: "eth_accounts" }];
          if (method === "wallet_getPermissions") return [];
          if (method === "wallet_switchEthereumChain") return null;
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method,
              params: params ?? [],
            }),
          }).then((r) => r.json());
          if (response.error) throw new Error(response.error.message);
          return response.result;
        },
      };
      Object.defineProperty(window, "ethereum", { value: ethereum });
    },
    { owner: d.owner, rpcUrl: d.rpcUrl },
  );
  await page.goto("/vault");
  const vault = page.locator(".vault-legacy");
  await vault
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(
    vault.getByRole("button", { name: "Disconnect wallet" }),
  ).toBeVisible();
  await vault.getByLabel("Existing vault address").fill(d.vault);
  await vault.getByRole("button", { name: "Load vault" }).click();
  await expect(vault.getByText("You control this vault")).toBeVisible();
  await vault.getByLabel("Agent wallet address").fill(d.agent);
  await vault.getByLabel("Public ERC-20 token address").fill(d.token);
  await vault.getByLabel("Only allowed recipient").fill(d.recipient);
  await vault.getByRole("button", { name: "Read on-chain policy" }).click();
  await expect(
    vault.getByText("Public vault balance: 100 tokens"),
  ).toBeVisible();
  await vault.getByRole("button", { name: "Simulate proposal" }).click();
  await expect(vault.locator("pre[aria-live]")).toContainText(
    '"simulated":true',
  );
  await expect(
    vault.getByRole("button", { name: "Send test transfer as agent" }),
  ).toBeDisabled();
  await vault.getByRole("button", { name: "Authorize for 24 hours" }).click();
  await expect(
    vault.getByText("Agent authorized for 24 hours", { exact: false }),
  ).toBeVisible();
  await vault.getByRole("button", { name: "Pause vault", exact: true }).click();
  await expect(vault.getByText("Vault paused", { exact: false })).toBeVisible();
  await vault.getByRole("button", { name: "Simulate proposal" }).click();
  await expect(vault.locator("pre[aria-live]")).toContainText(
    "SESSION_INACTIVE",
  );
  await vault.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(
    vault.getByText("Vault resumed", { exact: false }),
  ).toBeVisible();
  await vault
    .getByRole("button", { name: "Revoke agent", exact: true })
    .click();
  await expect(
    vault.getByText("Permission revoked", { exact: false }),
  ).toBeVisible();
  await expect(
    vault.getByText("Revoked / not authorized", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/evidence/dashboard-connected-mobile.png",
    fullPage: true,
  });
  await vault.getByRole("button", { name: "Disconnect wallet" }).click();
  await expect(
    vault.getByText("Connect your wallet to set permissions"),
  ).toBeVisible();
});
