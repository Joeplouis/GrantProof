import { test, expect } from "@playwright/test";
import { connect, save, seed } from "../lib/store";
import { resolve } from "node:path";

test("Miami Vice variations persist and fit the dashboard and work screens", async ({
  page,
}, info) => {
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.name));
  const db = connect(resolve("data/playwright.sqlite"));
  try {
    save(db, seed());
  } finally {
    db.close();
  }
  await page.goto("/#dashboard");
  await expect(
    page.getByRole("heading", { name: "A clear view of your grant." }),
  ).toBeVisible();
  for (const theme of [
    "vice-nights",
    "ocean-drive",
    "sunset-strip",
    "classic",
  ]) {
    await page.getByLabel("Workspace theme").selectOption(theme);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByLabel("Workspace theme")).toHaveValue(theme);
    await expect(
      page
        .getByRole("article", { name: "Budget snapshot" })
        .getByText("$33,800.00"),
    ).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`${theme}-dashboard.png`),
      fullPage: true,
      scale: "css",
      animations: "disabled",
    });
    const width = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(
      width.content,
      `${theme} dashboard fits viewport`,
    ).toBeLessThanOrEqual(width.viewport + 1);
  }
  await page.getByLabel("Workspace theme").selectOption("vice-nights");
  for (const name of ["evidence", "application", "spending", "review"]) {
    await page.goto(`/#${name}`);
    await expect(page.getByLabel("Current grant")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`vice-nights-${name}.png`),
      fullPage: true,
      scale: "css",
      animations: "disabled",
    });
    const width = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(width.content, `${name} fits viewport`).toBeLessThanOrEqual(
      width.viewport + 1,
    );
  }
  expect((await page.request.get("/api/workspace")).status()).toBe(200);
  await page.goto("/#dashboard");
  await page.getByRole("button", { name: "Try the demo", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Your three-minute walkthrough" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start with evidence →" }).click();
  await expect(
    page.getByRole("heading", { name: "Good answers start here." }),
  ).toBeVisible();
  expect(clientErrors).toEqual([]);
});
