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
