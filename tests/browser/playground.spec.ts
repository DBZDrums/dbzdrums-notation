import { expect, test } from "@playwright/test";

test("the playground edits a hit and renders its SVG preview", async ({ page }) => {
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build a beat/i })).toBeVisible();
  await expect(page.locator("#target svg")).toBeVisible();
  await expect(page.locator("#technique-bassDrum")).toHaveCount(0);
  await expect(page.locator("#technique-snare option")).toHaveText(["normal", "flam", "rim"]);
  await expect(page.locator("#technique-hiHat option")).toHaveText(["closed", "open", "pedal"]);
  await page.locator('.hit-cell[data-voice="snare"][data-position="1.0"]').click();
  await expect(page.locator("#definition")).toHaveValue(/"snare"[\s\S]*"1.0"/);
  await expect(page.locator("#status")).toContainText("Score updated.");
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("the playground serializes a selected flam without an artificial combination", async ({ page }) => {
  await page.goto("/");
  await page.locator("#technique-snare").selectOption({ label: "flam" });
  await expect(page.locator("#definition")).toHaveValue(
    /"at": "2.0",\n\s+"articulations": \[\n\s+"flam"/,
  );
  await expect(page.locator("#musicxml")).toContainText('<grace slash="yes"/>');
});

test("the playground applies a selected hi-hat technique to the preview", async ({ page }) => {
  await page.goto("/");
  await page.locator("#technique-hiHat").selectOption({ label: "open" });
  await expect(page.locator("#definition")).toHaveValue(/"hiHat"[\s\S]*"open"/);
  await expect(page.locator("#musicxml")).toContainText("<notehead>circle-x</notehead>");
});

test("the playground controls score markings in its preview, XML, and API example", async ({ page }) => {
  await page.goto("/");

  await page.locator("#show-clef").uncheck();
  await page.locator("#show-time-signature").uncheck();
  await page.locator("#show-final-barline").uncheck();

  await expect(page.locator("#status")).toContainText("Score updated.");
  await expect(page.locator("#api-code")).toContainText('"showClef": false');
  await expect(page.locator("#api-code")).toContainText('"showTimeSignature": false');
  await expect(page.locator("#api-code")).toContainText('"showFinalBarline": false');
  await expect(page.locator("#musicxml")).toContainText('<clef number="1" print-object="no">');
  await expect(page.locator("#musicxml")).toContainText('<time print-object="no">');
  await expect(page.locator("#musicxml")).toContainText("<bar-style>none</bar-style>");
  await expect(page.locator("#target svg g.vf-clef")).toHaveCount(0);
  await expect(page.locator("#target svg g.vf-timesignature")).toHaveCount(0);

  const finalBarlineRectCount = await page.locator("#target svg").evaluate((score) =>
    score.querySelector("g.staffline > g.vf-measure")?.querySelectorAll(":scope > rect").length,
  );
  expect(finalBarlineRectCount).toBe(0);
});

test("the playground previews a render-only repeat count", async ({ page }) => {
  await page.goto("/");

  await page.locator("#repeat-count").fill("3");
  await page.locator("#repeat-count").blur();
  await expect(page.locator("#status")).toContainText("Score updated.");
  await expect(page.locator("#target svg g[data-dbz-repeat-label] > text")).toHaveText("x3");
  await expect(page.locator("#api-code")).toContainText('"repeatCount": 3');
  await expect(page.locator("#musicxml")).not.toContainText("x3");

  await page.locator("#show-final-barline").uncheck();
  await expect(page.locator("#target svg g[data-dbz-repeat-label] > text")).toHaveText("x3");

  await page.locator("#repeat-count").fill("");
  await page.locator("#repeat-count").blur();
  await expect(page.locator("#target svg g[data-dbz-repeat-label]")).toHaveCount(0);
  await expect(page.locator("#api-code")).not.toContainText("repeatCount");
});

test("the playground validates repeat count and accepts comments through JSON", async ({ page }) => {
  await page.goto("/");

  await page.locator("#repeat-count").fill("1");
  await page.locator("#repeat-count").blur();
  await expect(page.locator("#status")).toContainText("Repeat count must be a whole number of 2 or greater.");
  await expect(page.locator("#issues")).toContainText("Enter a repeat count of 2 or greater");

  await page.locator("#definition").fill(JSON.stringify({
    meter: "4/4",
    divisions: 8,
    hits: { snare: ["1.0"] },
    annotations: [{ at: "1.0", text: "Lyrics starts", placement: "below" }],
  }, null, 2));
  await page.locator("#apply-definition").click();

  await expect(page.locator("#musicxml")).toContainText("<words>Lyrics starts</words>");
  await expect(page.locator("#target svg").getByText("Lyrics starts").first()).toBeVisible();
  await expect(page.locator("#definition")).toHaveValue(/"annotations"/);
});

test("the playground keeps phrase comment targets aligned during structural edits", async ({ page }) => {
  await page.goto("/");
  await page.locator("#definition").fill(JSON.stringify({
    bars: [
      { meter: "4/4", divisions: 8 },
      { meter: "4/4", divisions: 8 },
    ],
    annotations: [{ bar: 1, at: "1.0", text: "Second bar" }],
  }, null, 2));
  await page.locator("#apply-definition").click();

  await page.getByRole("button", { name: "Duplicate bar" }).click();
  await expect(page.locator("#definition")).toHaveValue(/"bar": 2/);
  await page.getByRole("button", { name: "Remove bar" }).click();
  await expect(page.locator("#definition")).toHaveValue(/"bar": 1/);
  await expect(page.locator("#musicxml")).toContainText("<words>Second bar</words>");
});

test("the playground builds a phrase with add, duplicate, and remove", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add bar" }).click();
  await expect(page.locator("#phrase-bars .phrase-bar")).toHaveCount(2);
  await expect(page.locator("#definition")).toHaveValue(/"bars"/);
  await expect(page.locator("#api-code")).toContainText("new Phrase({ bars })");

  await page.locator("#meter").fill("6/8");
  await page.locator("#divisions").fill("6");
  await page.getByRole("button", { name: "Update grid" }).click();
  await expect(page.locator('#phrase-bars .phrase-bar[aria-pressed="true"]')).toHaveText(/6\/8/);
  await expect(page.locator("#target svg")).toBeVisible();

  await page.getByRole("button", { name: "Duplicate bar" }).click();
  await expect(page.locator("#phrase-bars .phrase-bar")).toHaveCount(3);
  await page.getByRole("button", { name: "Remove bar" }).click();
  await expect(page.locator("#phrase-bars .phrase-bar")).toHaveCount(2);
  await expect(page.locator("#status")).toContainText("Score updated.");
});
