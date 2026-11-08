import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("user-first product and low-data browser policy", () => {
  it("does not capture or persist browser screenshots", () => {
    for (const file of [
      "tests/browser/product.spec.ts",
      "tests/browser/responsive.spec.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/page\.screenshot\s*\(/);
      expect(source).not.toMatch(/docs\/evidence\/.*\.png/);
    }
    const config = readFileSync("playwright.config.ts", "utf8");
    expect(config).toContain('screenshot: "off"');
    expect(config).toContain('video: "off"');
    expect(config).toContain('trace: "off"');
    const evidenceFiles = readdirSync("docs/evidence");
    expect(
      evidenceFiles.filter((name) => /\.(png|jpe?g|webp|mp4)$/i.test(name)),
    ).toEqual([]);
  });

  it("keeps RFQ infrastructure out of consumer privacy navigation", () => {
    const page = readFileSync(
      "apps/web/src/app/(workspace)/privacy/page.tsx",
      "utf8",
    );
    const chrome = readFileSync(
      "apps/web/src/components/workspace/chrome.tsx",
      "utf8",
    );
    expect(page).not.toMatch(/SwapVenueStatus|ConfidentialSwap|\bRFQ\b|proxy/i);
    expect(chrome).not.toContain('href: "/vault"');
    expect(chrome).toContain(
      'aria-label={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}',
    );
    expect(chrome).toContain('aria-label="Open navigation"');
  });

  it("never presents contract deployment as a user action", () => {
    const sandbox = readFileSync(
      "apps/web/src/components/dashboard.tsx",
      "utf8",
    );
    expect(sandbox).not.toMatch(/wallet\.deployContract/);
    expect(sandbox).not.toContain("Create vault");
    expect(readFileSync("README.md", "utf8")).toContain(
      "The consumer UI never requests contract deployments",
    );
  });
});
