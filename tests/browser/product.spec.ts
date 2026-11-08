import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
for (const width of [1440, 390]) {
  test(`marketing, docs and disconnected dashboard at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your money.",
    );
    await expect(page.locator("footer")).not.toContainText("GitHub");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.screenshot({
      path: `docs/evidence/home-dark-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Use light theme" }).click();
    await expect
      .poll(() =>
        page
          .getByRole("link", { name: "Create your agent brief" })
          .evaluate((el) => getComputedStyle(el).color),
      )
      .toBe("rgb(255, 255, 255)");
    await expect(page.locator("html")).toHaveClass("light");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/evidence/home-${width}.png`,
      fullPage: true,
    });
    await page.goto("/docs");
    await expect(page).toHaveURL("/docs");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "explicit financial boundaries",
    );
    await page.getByRole("link", { name: "Open the testnet app" }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(
      page.getByText("Connect your wallet to set permissions"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What should your agent work on?" }),
    ).toBeVisible();
    await page.getByLabel("Market to explore").selectOption("ETH & ERC-20");
    await page.getByLabel("Asset or market pair").fill("ETH / USDC");
    await page.getByLabel("Capital boundary (test units)").fill("25");
    await page.getByText("Preview the full mandate").click();
    await expect(page.locator(".brief-preview pre")).toContainText(
      "Market: ETH & ERC-20",
    );
    await expect(page.locator(".brief-preview pre")).toContainText(
      "Assets or pair of interest: ETH / USDC",
    );
    await expect(page.locator(".brief-preview pre")).toContainText(
      "Suggested maximum capital allocation: 25 test asset units",
    );

    await expect(
      page.getByRole("button", { name: "Open confidential tools" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/evidence/dashboard-disconnected-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
test("connect, load vault, simulate, authorize, pause and revoke on actual Anvil", async ({
  page,
}) => {
  test.skip(
    process.env.LOCAL_INTEGRATION !== "1",
    "requires local Anvil deployment",
  );
  const d = JSON.parse(await readFile(".local/deployment.json", "utf8"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
          const r = await fetch(rpcUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method,
              params: params ?? [],
            }),
          }).then((r) => r.json());
          if (r.error) throw new Error(r.error.message);
          return r.result;
        },
      };
      Object.defineProperty(window, "ethereum", { value: ethereum });
    },
    { owner: d.owner, rpcUrl: d.rpcUrl },
  );
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Disconnect wallet" }),
  ).toBeVisible();
  await page.getByLabel("Existing vault address").fill(d.vault);
  await page.getByRole("button", { name: "Load vault", exact: true }).click();
  await expect(page.getByText("You control this vault")).toBeVisible();
  await page.getByLabel("Agent wallet address").fill(d.agent);
  await page.getByLabel("Public ERC-20 token address").fill(d.token);
  await page.getByLabel("Only allowed recipient").fill(d.recipient);
  await page
    .getByRole("button", { name: "Read on-chain policy", exact: true })
    .click();
  await expect(
    page.getByText("Public vault balance: 100 tokens"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate proposal", exact: true })
    .click();
  await expect(page.locator("pre[aria-live]")).toContainText(
    '"simulated":true',
  );
  await expect(
    page.getByRole("button", { name: "Send test transfer as agent" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Authorize for 24 hours" }).click();
  await expect(
    page.getByText("Agent authorized for 24 hours", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause vault", exact: true }).click();
  await expect(page.getByText("Vault paused", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate proposal", exact: true })
    .click();
  await expect(page.locator("pre[aria-live]")).toContainText(
    "SESSION_INACTIVE",
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Vault resumed", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Revoke agent", exact: true }).click();
  await expect(
    page.getByText("Permission revoked", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Revoked / not authorized", { exact: true }),
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
  await page.getByRole("button", { name: "Disconnect wallet" }).click();
  await expect(
    page.getByText("Connect your wallet to set permissions"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
