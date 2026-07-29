import { expect, test } from "@playwright/test";

async function renderFixture(page: import("@playwright/test").Page, name: string): Promise<string> {
  await page.goto("/tests/browser/fixture.html");
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const musicXml = await page.evaluate(
    async (fixture) => window.renderNotationFixture(fixture as "straight"),
    name,
  );
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  return musicXml;
}

async function staffLineCount(page: import("@playwright/test").Page): Promise<number> {
  return page.locator("#target svg").evaluate((svg) => {
    const horizontal: Array<{ y: number; length: number }> = [];
    for (const line of svg.querySelectorAll("line")) {
      const x1 = Number(line.getAttribute("x1"));
      const y1 = Number(line.getAttribute("y1"));
      const x2 = Number(line.getAttribute("x2"));
      const y2 = Number(line.getAttribute("y2"));
      if (Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2) && Math.abs(y1 - y2) < 0.1) {
        horizontal.push({ y: y1, length: Math.abs(x2 - x1) });
      }
    }
    for (const path of svg.querySelectorAll("path")) {
      const expression = /[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*[Ll]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g;
      for (const match of path.getAttribute("d")?.matchAll(expression) ?? []) {
        const x1 = Number(match[1]);
        const y1 = Number(match[2]);
        const x2 = Number(match[3]);
        const y2 = Number(match[4]);
        if (Math.abs(y1 - y2) < 0.1) horizontal.push({ y: y1, length: Math.abs(x2 - x1) });
      }
    }
    const longest = Math.max(...horizontal.map((line) => line.length));
    return new Set(horizontal.filter((line) => line.length >= longest * 0.7).map((line) => Math.round(line.y * 10) / 10)).size;
  });
}

for (const fixture of ["straight", "chord", "compound", "triplet", "quarterGrid", "articulations"] as const) {
  test(`${fixture} renders a five-line SVG score`, async ({ page }) => {
    const musicXml = await renderFixture(page, fixture);
    const svg = page.locator("#target svg");
    await expect(svg).toBeVisible();
    expect(await staffLineCount(page)).toBe(5);
    expect(await svg.locator("path").count()).toBeGreaterThan(5);
    expect(await svg.locator("rect").count()).toBeGreaterThan(0);
    const expectedNotationHeads = (musicXml.match(/<note>/g) ?? []).length;
    expect(await svg.locator("g.vf-notehead").count()).toBe(expectedNotationHeads);
    expect(musicXml).toContain("<barline");
  });
}

test("straight groove visual geometry is stable", async ({ page }) => {
  await renderFixture(page, "straight");
  await expect(page.locator("#target")).toHaveScreenshot("straight-score.png", {
    animations: "disabled",
  });
});

test("sparse 16-division groove uses quarter-note geometry", async ({ page }) => {
  const musicXml = await renderFixture(page, "quarterGrid");
  expect(musicXml).toContain("<type>quarter</type>");
  expect(musicXml).not.toContain("<type>16th</type>");
  expect(musicXml).not.toContain("<beam");
  await expect(page.locator("#target")).toHaveScreenshot("quarter-grid-score.png", {
    animations: "disabled",
  });
});
