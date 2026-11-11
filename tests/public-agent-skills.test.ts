import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import manifest from "../apps/web/public/skills/index.json";

const skillsRoot = resolve("apps/web/public/skills");
describe("portable PrigenFi agent skills", () => {
  it("hosts distinct, valid instruction-only SKILL.md files without executable tools", async () => {
    expect(manifest.executionAllowed).toBe(false);
    expect(manifest.skills).toHaveLength(3);
    expect(new Set(manifest.skills.map((skill) => skill.name)).size).toBe(3);
    for (const item of manifest.skills) {
      expect(item.name).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(item.path).toBe(`/skills/${item.name}/SKILL.md`);
      const text = await readFile(
        resolve(skillsRoot, item.name, "SKILL.md"),
        "utf8",
      );
      expect(text).toMatch(/^---\nname: [a-z0-9-]+\ndescription: /);
      expect(text).toContain(`name: ${item.name}`);
      expect(text.length).toBeGreaterThan(400);
      expect(text).not.toContain("private key=");
      expect(text).not.toMatch(/```(?:bash|sh|javascript|python)/);
    }
    const upstream = await readFile(
      resolve(".agents/skills/prigenfi-market-diligence/SKILL.md"),
      "utf8",
    );
    const deployed = await readFile(
      resolve(skillsRoot, "prigenfi-market-diligence/SKILL.md"),
      "utf8",
    );
    expect(deployed).toBe(upstream);
  });
});
