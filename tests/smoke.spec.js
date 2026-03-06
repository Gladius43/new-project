const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

test("campaign flow smoke test", async ({ page }) => {
  const gameUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).href;

  await page.goto(gameUrl);
  await expect(page.locator("#setupModal")).toBeVisible();

  await page.click("#startGameBtn");
  await expect(page.locator("#gameRoot")).toBeVisible();
  await expect(page.locator("#dayCounter")).toContainText("Day 1");

  await page.click("#saveBtn");
  await expect
    .poll(async () => page.evaluate(() => Boolean(localStorage.getItem("thrones-clash-save-v1"))))
    .toBeTruthy();

  await page.reload();
  await expect(page.locator("#setupModal")).toBeVisible();
  await page.click("#setupLoadBtn");
  await expect(page.locator("#gameRoot")).toBeVisible();

  await expect(page.locator("#townScreenBtn")).toBeEnabled();
  await page.click("#townScreenBtn");
  await expect(page.locator("#townModal")).toBeVisible();

  const buildButton = page.locator("#townBuildings [data-build]:not([disabled])").first();
  if ((await buildButton.count()) > 0) {
    await buildButton.click();
  }

  const recruitButton = page.locator("#townRecruit [data-recruit]:not([disabled])").first();
  if ((await recruitButton.count()) > 0) {
    await recruitButton.click();
  }

  await page.click("#closeTownBtn");
  await page.click("#endTurnBtn");

  await expect
    .poll(async () => page.locator("#dayCounter").textContent(), { timeout: 30_000 })
    .toMatch(/Day 2/);
});
