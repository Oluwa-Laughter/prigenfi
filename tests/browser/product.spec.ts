import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const marketFixture = {
  source: "DEX Screener",
  dataClass: "public-market-research",
  network: "Ethereum",
  chain: "ethereum",
  evmChainId: 1,
  privateTradingAvailable: false,
  searchMethod: "global-symbol",
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
  await page.route("**/api/markets*", async (route) => {
    const chain =
      new URL(route.request().url()).searchParams.get("chain") ?? "ethereum";
    const current =
      chain === "base"
        ? {
            ...marketFixture,
            chain: "base",
            network: "Base",
            evmChainId: 8453,
            pairs: [],
          }
        : marketFixture;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(current),
    });
  });
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
      await page.goto("/");
      if (width === 1440) {
        const icon = await page.request.get("/icon.svg");
        expect(icon.ok()).toBe(true);
        expect(icon.headers()["content-type"]).toContain("image/svg+xml");
      }
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Direct the trade.",
      );
      const marketingHeadlineSize = await page
        .locator(".m-hero h1")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        );
      expect(marketingHeadlineSize).toBeLessThanOrEqual(width < 570 ? 56 : 92);

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

      await page.goto("/dashboard");
      if (width >= 801) {
        await page.getByRole("button", { name: "Collapse sidebar" }).click();
        await expect(page.locator(".workspace-layout")).toHaveClass(
          /ws-collapsed/,
        );
        await expect(
          page.getByRole("link", { name: "My agents" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await expect(page.locator(".workspace-layout")).not.toHaveClass(
          /ws-collapsed/,
        );
      }

      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Make your agent work for you.",
      );
      await expect(
        page.getByRole("heading", { name: "Research, in one place." }),
      ).toBeVisible();
      await expect(page.locator("#workspace-summary")).toContainText(
        "Your saved workspace",
      );
      const workspaceHeadlineSize = await page
        .locator(".ws-page-heading h1")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        );
      expect(workspaceHeadlineSize).toBeLessThanOrEqual(41);
      const quickNavigation = page.getByRole("button", {
        name: "Jump to a page",
      });
      await quickNavigation.click();
      const quickDialog = page.getByRole("dialog", {
        name: "Jump to a workspace page",
      });
      await expect(quickDialog).toBeVisible();
      await quickDialog
        .getByRole("textbox", { name: "Search workspace pages" })
        .fill("privacy");
      await quickDialog
        .getByRole("textbox", { name: "Search workspace pages" })
        .press("Enter");
      await expect(page).toHaveURL(/\/privacy$/);
      await page.goto("/dashboard");
      await page.keyboard.press("Control+k");
      await expect(
        page.getByRole("dialog", { name: "Jump to a workspace page" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Jump to a workspace page" }),
      ).not.toBeVisible();
      const sidebarCallToAction = page.locator(".ws-sidebar-bottom");
      await expect(sidebarCallToAction).not.toContainText(
        "Protected by your rules",
      );
      await expect(sidebarCallToAction).not.toContainText("Public website");
      await expect(sidebarCallToAction).toContainText("Put an agent to work.");
      await expect(
        sidebarCallToAction.getByRole("link", { name: "Connect an agent" }),
      ).toHaveAttribute("href", "/agents/connect");
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

      if (width < 800) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(
          page.getByRole("navigation", { name: "Platform" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "Open navigation" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("button", { name: "Close navigation", exact: true })
          .click();
      } else {
        await expect(
          page.getByRole("navigation", { name: "Platform" }),
        ).toBeVisible();
      }
      const unavailableSaved = await page.request.get(
        "/api/workspace/overview",
      );
      expect([401, 503]).toContain(unavailableSaved.status());
      await page.goto("/markets?category=meme");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Explore EVM markets.",
      );
      await expect(
        page.getByRole("link", { name: /Research .+ pool/ }).first(),
      ).toHaveAttribute(
        "href",
        /\/markets\/pair\/ethereum\/0x[0-9a-fA-F]{40}$/,
      );

      await expect(
        page.getByRole("button", { name: "Emerging tokens" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("table").getByText("PEPE")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Public market network" })
        .selectOption("base");
      await expect(
        page.getByRole("combobox", { name: "Public market network" }),
      ).toHaveValue("base");
      await expect(
        page.getByText("No public Base pairs found", { exact: false }),
      ).toBeVisible();

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
      await expect(page.getByLabel("Public research networks")).toHaveValue(
        "all",
      );
      await expect(
        page.getByRole("heading", { name: "Your research-agent profiles" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save research profile" }),
      ).toHaveCount(0);
      await page.getByText("Preview the complete confidential mandate").click();
      await expect(page.locator(".brief-preview pre")).toContainText(
        "All Ethereum markets",
      );
      await expect(page.locator(".brief-preview pre")).toContainText(
        "CONFIDENTIAL ONLY",
      );

      await page.goto("/agents/connect");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Connect an agent to PrigenFi.",
      );
      await expect(
        page.getByRole("heading", { name: "One endpoint. Your own agent." }),
      ).toBeVisible();
      await expect(page.locator("main#main")).toContainText(
        "No repository checkout",
      );
      await expect(
        page.getByRole("heading", {
          name: "Research skills your agent can read.",
        }),
      ).toBeVisible();
      await expect(page.locator(".agent-skill-card")).toHaveCount(3);
      await page.getByRole("button", { name: "Claude", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Claude", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Other MCP hosts" }).click();
      await page.getByRole("button", { name: "Codex", exact: true }).click();
      const connection = await page.request.get("/api/mcp/connect");
      expect(connection.status()).toBe(200);
      const connectionData = await connection.json();
      expect(connectionData.executionAllowed).toBe(false);
      if (connectionData.publicResearch.enabled) {
        await expect(page.locator("main#main")).toContainText(
          "codex mcp add prigenfi-public --url",
        );
      } else {
        await expect(page.locator("main#main")).toContainText(
          "Public hosted research is not enabled",
        );
      }
      const skillManifest = await page.request.get("/skills/index.json");
      expect(skillManifest.ok()).toBe(true);
      expect((await skillManifest.json()).skills).toHaveLength(3);
      for (const skill of (
        await (await page.request.get("/skills/index.json")).json()
      ).skills) {
        const file = await page.request.get(skill.path);
        expect(file.ok()).toBe(true);
        const content = await file.text();
        expect(content).toContain(`name: ${skill.name}`);
        expect(content).toContain("---");
      }
      await page.goto("/privacy");
      await expect(page.locator("main#main")).not.toContainText("RFQ");
      await expect(page.locator("main#main")).not.toContainText("proxy");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Privacy is a requirement.",
      );
      await expect(
        page.locator(".privacy-asset").getByText("cZAMA", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".privacy-asset")).toHaveCount(4);
      await expect(page.locator(".privacy-asset-grid")).not.toContainText(
        "ctGBP",
      );
      await expect(page.locator(".privacy-asset-grid")).not.toContainText(
        "cXAUt",
      );
      await expect(
        page.getByText("Blocked — no verified private execution venue"),
      ).toBeVisible();

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
        "Build agents with real capabilities.",
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
  await expect(vault.getByRole("button", { name: "Create vault" })).toHaveCount(
    0,
  );
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
  await vault.getByLabel("Per-operation cap (tokens)").fill("10");
  await vault.getByLabel("Per-agent UTC daily cap (tokens)").fill("20");
  await vault.getByLabel("Amount (tokens)").fill("1");
  await vault.getByRole("button", { name: "Read on-chain policy" }).click();
  await expect(
    vault.getByText("Public vault balance: 100 tokens"),
  ).toBeVisible();
  await expect(
    vault.getByText("Shared asset budget (all agents):", { exact: false }),
  ).toBeVisible();
  await vault.getByLabel("Vault-wide UTC daily cap (tokens)").fill("0");
  await vault.getByRole("button", { name: "Set shared token budget" }).click();
  await vault.getByRole("button", { name: "Simulate proposal" }).click();
  await expect(vault.locator("pre[aria-live]")).toContainText(
    "TOKEN_DAILY_BUDGET",
  );
  await vault.getByLabel("Vault-wide UTC daily cap (tokens)").fill("20");
  await vault.getByRole("button", { name: "Set shared token budget" }).click();
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

  await vault.getByRole("button", { name: "Disconnect wallet" }).click();
  await expect(
    vault.getByText("Connect your wallet to set permissions"),
  ).toBeVisible();
});

test("wallet-owned saved-markets UX: export, individual removal and confirmed clear", async ({
  page,
}) => {
  // Browser-only stub verifies the UI; the Postgres/Anvil HTTP suite proves real authorization.
  const owner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const fixture = [
    {
      chain: "ethereum",
      pairAddress: "0x" + "1".repeat(40),
      savedAt: "2026-11-12T10:00:00.000Z",
    },
    {
      chain: "base",
      pairAddress: "0x" + "2".repeat(40),
      savedAt: "2026-11-12T11:00:00.000Z",
    },
  ];
  let saved = fixture.slice();
  const deletes: unknown[] = [];
  await page.addInitScript(
    ({ address }) => {
      const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
      let connected = false;
      Object.defineProperty(window, "ethereum", {
        configurable: true,
        value: {
          isMetaMask: true,
          on: (name: string, handler: (...args: unknown[]) => void) =>
            listeners.set(name, [...(listeners.get(name) ?? []), handler]),
          removeListener: (
            name: string,
            handler: (...args: unknown[]) => void,
          ) =>
            listeners.set(
              name,
              (listeners.get(name) ?? []).filter((fn) => fn !== handler),
            ),
          request: async ({ method }: { method: string }) => {
            if (method === "eth_requestAccounts") {
              connected = true;
              return [address];
            }
            if (method === "eth_accounts") return connected ? [address] : [];
            if (method === "eth_chainId") return "0x7a69";
            if (method === "wallet_getPermissions") return [];
            if (method === "wallet_requestPermissions")
              return [{ parentCapability: "eth_accounts" }];
            return null;
          },
        },
      });
    },
    { address: owner },
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        address: owner,
        chainId: 31337,
        executionAllowed: false,
      }),
    }),
  );
  await page.route("**/api/watchlist", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ markets: saved, executionAllowed: false }),
      });
    }
    if (req.method() !== "DELETE") return route.fulfill({ status: 405 });
    const body = req.postDataJSON();
    deletes.push(body);
    if (body.clearAll === true && body.confirmation === "CLEAR MY MARKETS") {
      const removed = saved.length;
      saved = [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ removed, executionAllowed: false }),
      });
    }
    saved = saved.filter(
      (item) =>
        item.chain !== body.chain || item.pairAddress !== body.pairAddress,
    );
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ removed: true, executionAllowed: false }),
    });
  });
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "Your saved markets." }),
  ).toBeVisible();
  await expect(
    page.getByText("Connect your wallet from the top bar", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(page.getByText("2 saved pools")).toBeVisible();
  await expect(page.locator(".saved-markets-list li")).toHaveCount(2);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const downloaded = await downloadEvent;
  expect(downloaded.suggestedFilename()).toBe(
    "prigenfi-public-market-watchlist.csv",
  );
  const csvPath = await downloaded.path();
  expect(csvPath).not.toBeNull();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain("network,pair_address,saved_at");
  expect(csv).toContain(fixture[0].pairAddress);
  expect(csv).not.toContain(owner);
  await page
    .getByRole("button", {
      name: `Remove Ethereum pool ${fixture[0].pairAddress}`,
    })
    .click();
  await expect(page.getByText("1 saved pool", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(
    page.getByRole("button", { name: "Permanently clear markets" }),
  ).toBeDisabled();
  await page.getByLabel("Type CLEAR MY MARKETS to confirm").fill("CLEAR");
  await expect(
    page.getByRole("button", { name: "Permanently clear markets" }),
  ).toBeDisabled();
  await page
    .getByLabel("Type CLEAR MY MARKETS to confirm")
    .fill("CLEAR MY MARKETS");
  await page.getByRole("button", { name: "Permanently clear markets" }).click();
  await expect(page.getByText("0 saved pools")).toBeVisible();
  await expect(
    page.getByText("You have no saved pools", { exact: false }),
  ).toBeVisible();
  expect(deletes).toEqual([
    { chain: fixture[0].chain, pairAddress: fixture[0].pairAddress },
    { clearAll: true, confirmation: "CLEAR MY MARKETS" },
  ]);
});
