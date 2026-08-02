import { expect, test } from "@playwright/test";

async function renderFixture(
  page: import("@playwright/test").Page,
  name: string
): Promise<string> {
  await page.goto("/tests/browser/fixture.html");
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const musicXml = await page.evaluate(
    async (fixture) =>
      window.renderBrowserNotationFixture(fixture as "straight"),
    name
  );
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  return musicXml;
}

async function staffLineSystems(
  page: import("@playwright/test").Page
): Promise<number[]> {
  return page.locator("#target svg").evaluate((svg) => {
    const horizontal: Array<{
      x1: number;
      x2: number;
      y: number;
      length: number;
    }> = [];
    for (const line of svg.querySelectorAll("line")) {
      const x1 = Number(line.getAttribute("x1"));
      const y1 = Number(line.getAttribute("y1"));
      const x2 = Number(line.getAttribute("x2"));
      const y2 = Number(line.getAttribute("y2"));
      if (
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isFinite(x2) &&
        Number.isFinite(y2) &&
        Math.abs(y1 - y2) < 0.1
      ) {
        horizontal.push({ x1, x2, y: y1, length: Math.abs(x2 - x1) });
      }
    }
    for (const path of svg.querySelectorAll("path")) {
      const expression =
        /[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*[Ll]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g;
      for (const match of path.getAttribute("d")?.matchAll(expression) ?? []) {
        const x1 = Number(match[1]);
        const y1 = Number(match[2]);
        const x2 = Number(match[3]);
        const y2 = Number(match[4]);
        if (Math.abs(y1 - y2) < 0.1)
          horizontal.push({ x1, x2, y: y1, length: Math.abs(x2 - x1) });
      }
    }
    const longest = Math.max(...horizontal.map((line) => line.length));
    const systems = new Map<string, Set<number>>();
    for (const line of horizontal.filter(
      (line) => line.length >= longest * 0.3
    )) {
      const left = Math.round(Math.min(line.x1, line.x2) * 10) / 10;
      const right = Math.round(Math.max(line.x1, line.x2) * 10) / 10;
      const yValues = systems.get(`${left}:${right}`) ?? new Set<number>();
      yValues.add(Math.round(line.y * 10) / 10);
      systems.set(`${left}:${right}`, yValues);
    }
    return [...systems.values()].map((yValues) => yValues.size);
  });
}

async function renderWithPresentation(
  page: import("@playwright/test").Page,
  notation: "bar" | "phrase",
): Promise<string> {
  await page.goto("/tests/browser/fixture.html");
  return page.evaluate(
    async (input) =>
      window.renderPresentationFixture(input, {
        showClef: false,
        showTimeSignature: false,
        showFinalBarline: false,
      }),
    notation,
  );
}

test("an already-aborted signal clears an existing score and reports RENDER_ABORTED", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(() => window.renderBrowserNotationFixture("straight"));
  await expect(page.locator("#target svg")).toBeVisible();

  const result = await page.evaluate(() =>
    window.abortNotationFixture("bar", "alreadyAborted")
  );
  expect(result).toEqual({
    code: "RENDER_ABORTED",
    childCount: 0,
    hasSvg: false,
  });
  expect(result.code).not.toBe("OSMD_RENDER_FAILED");
  await expect(page.locator("#target")).toBeEmpty();
});

test("an aborted in-flight phrase cleans up and does not prevent a later render", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(() =>
    window.abortNotationFixture("phrase", "afterStart")
  );

  expect(result).toEqual({
    code: "RENDER_ABORTED",
    childCount: 0,
    hasSvg: false,
  });
  await expect(page.locator("#target")).toBeEmpty();

  await page.evaluate(() => window.renderBrowserNotationFixture("straight"));
  await expect(page.locator("#target svg")).toBeVisible();
});

test("empty bar renders a five-line percussion staff", async ({ page }) => {
  const musicXml = await renderFixture(page, "empty");
  const svg = page.locator("#target svg");
  await expect(svg).toBeVisible();
  const systems = await staffLineSystems(page);
  expect(systems).not.toHaveLength(0);
  expect(systems.every((lineCount) => lineCount === 5)).toBe(true);
  expect(musicXml).not.toContain("<unpitched>");
});

test("a compact SVG keeps every staff line inside its visible viewport", async ({
  page,
}) => {
  await renderFixture(page, "singleSnare");
  const result = await page.locator("#target svg").evaluate((svg) => {
    const viewBox = (svg.getAttribute("viewBox") ?? "")
      .split(/[\s,]+/)
      .map(Number);
    if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
      throw new Error("Expected a numeric SVG viewBox.");
    }
    const viewBoxTop = viewBox[1]!;
    const viewBoxBottom = viewBoxTop + viewBox[3]!;
    const lines = [
      ...svg.querySelectorAll<SVGPathElement>(
        "g.staffline > g.vf-measure > path"
      ),
    ].map((line) => {
      const bounds = line.getBBox();
      const halfStrokeWidth = Number(line.getAttribute("stroke-width")) / 2;
      return {
        topPadding: bounds.y - halfStrokeWidth - viewBoxTop,
        bottomPadding:
          viewBoxBottom - (bounds.y + halfStrokeWidth),
      };
    });
    return lines;
  });

  expect(result).toHaveLength(5);
  for (const line of result) {
    expect(line.topPadding).toBeGreaterThanOrEqual(0);
    expect(line.bottomPadding).toBeGreaterThan(0);
  }
});

test("presentation options hide score markings in MusicXML and SVG", async ({ page }) => {
  const musicXml = await renderWithPresentation(page, "phrase");
  const svg = page.locator("#target svg");

  expect(musicXml).toContain('<clef number="1" print-object="no">');
  expect(musicXml).toContain('<time print-object="no">');
  expect(musicXml).toContain("<bar-style>regular</bar-style>");
  expect(musicXml).toContain("<bar-style>none</bar-style>");
  await expect(svg.locator("g.vf-clef")).toHaveCount(0);
  await expect(svg.locator("g.vf-timesignature")).toHaveCount(0);
  await expect(svg.locator("g.vf-notehead")).not.toHaveCount(0);

  const barlineRectCounts = await svg.evaluate((score) =>
    [...score.querySelectorAll("g.staffline > g.vf-measure")].map(
      (measure) => measure.querySelectorAll(":scope > rect").length,
    ),
  );
  expect(barlineRectCounts).toEqual([1, 0]);
});

async function repeatLabelGeometry(
  page: import("@playwright/test").Page,
): Promise<{
  readonly text: string | null;
  readonly labelLeft: number;
  readonly labelTop: number;
  readonly labelRight: number;
  readonly labelBottom: number;
  readonly visualEnd: number;
  readonly staffBottom: number;
  readonly svgRight: number;
  readonly svgBottom: number;
  readonly finalBarlineCount: number;
}> {
  return page.locator("#target svg").evaluate((svg) => {
    const finalStaff = [...svg.querySelectorAll<SVGGElement>("g.staffline")].at(-1);
    const finalMeasure = finalStaff
      ? [...finalStaff.querySelectorAll<SVGGElement>(":scope > g.vf-measure")].at(-1)
      : undefined;
    const label = svg.querySelector<SVGTextElement>("g[data-dbz-repeat-label] > text");
    if (!finalMeasure || !label) throw new Error("Missing final measure or repeat label.");
    const staffLines = [...finalMeasure.querySelectorAll<SVGGraphicsElement>(":scope > path")]
      .map((path) => path.getBoundingClientRect())
      .filter((bounds) => bounds.width > Math.max(1, bounds.height * 5));
    const longest = Math.max(...staffLines.map((bounds) => bounds.width));
    const finalLines = staffLines.filter((bounds) => bounds.width >= longest * 0.8);
    const barlines = [...finalMeasure.querySelectorAll<SVGGraphicsElement>(":scope > rect")]
      .map((barline) => barline.getBoundingClientRect());
    const labelBounds = label.getBoundingClientRect();
    const svgBounds = svg.getBoundingClientRect();
    return {
      text: label.textContent,
      labelLeft: labelBounds.left,
      labelTop: labelBounds.top,
      labelRight: labelBounds.right,
      labelBottom: labelBounds.bottom,
      visualEnd: Math.max(
        ...finalLines.map((bounds) => bounds.right),
        ...barlines.map((bounds) => bounds.right),
      ),
      staffBottom: Math.max(...finalLines.map((bounds) => bounds.bottom)),
      svgRight: svgBounds.right,
      svgBottom: svgBounds.bottom,
      finalBarlineCount: barlines.length,
    };
  });
}

for (const showFinalBarline of [true, false]) {
  test(`repeat count renders after the final ${showFinalBarline ? "barline" : "staff end"}`, async ({
    page,
  }) => {
    await page.goto("/tests/browser/fixture.html");
    const musicXml = await page.evaluate(
      ({ visible }) => window.renderRepeatFixture("bar", 3, visible),
      { visible: showFinalBarline },
    );
    const svg = page.locator("#target svg");

    await expect(svg.locator("g[data-dbz-repeat-label] > text")).toHaveText("x3");
    await expect(svg.locator("g[data-dbz-repeat-label]")).toHaveCount(1);
    expect(musicXml).not.toContain("x3");
    expect(musicXml).not.toContain("<repeat");
    const geometry = await repeatLabelGeometry(page);
    expect(geometry.labelLeft).toBeGreaterThan(geometry.visualEnd);
    expect(geometry.labelTop).toBeLessThan(geometry.staffBottom);
    expect(geometry.labelBottom).toBeGreaterThan(geometry.staffBottom);
    expect(geometry.labelRight).toBeLessThanOrEqual(geometry.svgRight + 0.5);
    expect(geometry.labelBottom).toBeLessThan(geometry.svgBottom);
    expect(geometry.finalBarlineCount === 0).toBe(!showFinalBarline);
  });
}

test("a repeat count follows the final system of a long phrase", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const musicXml = await page.evaluate(() => window.renderRepeatFixture("phrase", 12));
  await expect(page.locator("#target svg g[data-dbz-repeat-label] > text")).toHaveText("x12");
  expect(musicXml).not.toContain("x12");
  const systems = await staffLineSystems(page);
  expect(systems.length).toBeGreaterThan(1);
  const geometry = await repeatLabelGeometry(page);
  expect(geometry.labelLeft).toBeGreaterThan(geometry.visualEnd);
  expect(geometry.labelTop).toBeLessThan(geometry.staffBottom);
  expect(geometry.labelBottom).toBeGreaterThan(geometry.staffBottom);
});

test("repeat label remains inside a narrow SVG target", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  await page.locator("#target").evaluate((target) => {
    target.style.width = "190px";
  });
  await page.evaluate(() => window.renderRepeatFixture("bar", 3));

  const geometry = await repeatLabelGeometry(page);
  expect(geometry.labelLeft).toBeGreaterThan(geometry.visualEnd);
  expect(geometry.labelRight).toBeLessThanOrEqual(geometry.svgRight + 0.5);
});

test("repeat label spacing follows OSMD zoom", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  for (const zoom of [0.75, 1.5]) {
    await page.evaluate(
      ({ scale }) => window.renderRepeatFixture("bar", 3, true, scale),
      { scale: zoom },
    );
    const geometry = await repeatLabelGeometry(page);
    expect(geometry.labelLeft).toBeGreaterThan(geometry.visualEnd);
    expect(geometry.labelTop).toBeLessThan(geometry.staffBottom);
    expect(geometry.labelBottom).toBeGreaterThan(geometry.staffBottom);
    expect(geometry.labelRight).toBeLessThanOrEqual(geometry.svgRight + 0.5);
  }
});

test("invalid repeat counts fail before OSMD publishes an SVG", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    try {
      await window.renderRepeatFixture("bar", 1);
      return { code: undefined, hasSvg: true };
    } catch (error) {
      return {
        code: error instanceof Error && "code" in error ? error.code : undefined,
        hasSvg: document.querySelector("#target svg") !== null,
      };
    }
  });
  expect(result).toEqual({ code: "RENDER_OPTIONS_INVALID", hasSvg: false });
});

test("a position-anchored comment renders from MusicXML words", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const musicXml = await page.evaluate(() => window.renderAnnotationFixture());

  expect(musicXml).toContain("<words>Lyrics starts</words>");
  expect(musicXml).toContain("<offset>0</offset>");
  await expect(page.locator("#target svg").getByText("Lyrics starts").first()).toBeVisible();
});

for (const fixture of [
  "straight",
  "chord",
  "compound",
  "triplet",
  "quarterGrid",
  "articulations",
  "longPhrase",
] as const) {
  test(`${fixture} renders a five-line SVG score`, async ({ page }) => {
    const musicXml = await renderFixture(page, fixture);
    const svg = page.locator("#target svg");
    await expect(svg).toBeVisible();
    const systems = await staffLineSystems(page);
    expect(systems).not.toHaveLength(0);
    expect(systems.every((lineCount) => lineCount === 5)).toBe(true);
    if (fixture === "longPhrase") expect(systems.length).toBeGreaterThan(1);
    expect(await svg.locator("path").count()).toBeGreaterThan(5);
    expect(await svg.locator("rect").count()).toBeGreaterThan(0);
    const expectedNotationHeads = (musicXml.match(/<note>/g) ?? []).length;
    expect(await svg.locator("g.vf-notehead").count()).toBe(
      expectedNotationHeads
    );
    expect(musicXml).toContain("<barline");
  });
}

test("straight groove visual geometry is stable", async ({ page }) => {
  await renderFixture(page, "straight");
  await expect(page.locator("#target")).toHaveScreenshot("straight-score.png", {
    animations: "disabled",
  });
});

test("repeat count visual geometry is stable", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(() => window.renderRepeatFixture("bar", 3));
  await expect(page.locator("#target")).toHaveScreenshot("repeat-count-score.png", {
    animations: "disabled",
  });
});

test("sparse 16-division groove uses quarter-note geometry", async ({
  page,
}) => {
  const musicXml = await renderFixture(page, "quarterGrid");
  expect(musicXml).toContain("<type>quarter</type>");
  expect(musicXml).not.toContain("<type>16th</type>");
  expect(musicXml).not.toContain("<beam");
  await expect(page.locator("#target")).toHaveScreenshot(
    "quarter-grid-score.png",
    {
      animations: "disabled",
    }
  );
});

test("long phrase visual geometry is stable", async ({ page }) => {
  await renderFixture(page, "longPhrase");
  await expect(page.locator("#target")).toHaveScreenshot(
    "long-phrase-score.png",
    {
      animations: "disabled",
    }
  );
});
