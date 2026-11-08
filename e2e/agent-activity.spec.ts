import { test, expect } from "@playwright/test";
import { connect, save, seed } from "../lib/store";
import { resolve } from "node:path";

test("generation receipts show real fixture work, persist, and stay historical after edits", async ({
  page,
}, info) => {
  const db = connect(resolve("data/playwright.sqlite"));
  try {
    save(db, seed());
  } finally {
    db.close();
  }
  await page.goto("/#application");
  const answer = page.locator(".answercard").first();
  await answer.getByRole("button", { name: "Generate sourced answer" }).click();
  const receipt = answer.getByRole("region", { name: "Generation activity" });
  await expect(receipt.getByText("See what the demo ran")).toBeVisible();
  await expect(receipt.getByText("No AI call", { exact: true })).toBeVisible();
  await expect(
    receipt.getByText(/No model or agent tools were called/),
  ).toBeVisible();
  await expect(receipt.getByText(/\$16,200.00 spent/)).toBeVisible();
  await expect(receipt.getByText("Validated draft with code")).toBeVisible();
  await receipt.getByRole("button", { name: "View evidence" }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Claim evidence" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.reload();
  await expect(receipt.getByText("See what the demo ran")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("agent-activity-fixture.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);

  await answer
    .getByRole("button", { name: "Edit answer", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor.locator("textarea").first().fill("Unsupported 99% outcome.");
  await editor.getByRole("button", { name: /Save/ }).click();
  await expect(
    receipt.getByText(/This answer was edited after this run/),
  ).toBeVisible();
  await expect(
    answer.getByText("Evidence gap", { exact: true }).first(),
  ).toBeVisible();
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({
        status: 400,
        json: { error: "Synthetic generation failure" },
      });
    return route.continue();
  });
  await answer.getByRole("button", { name: "Regenerate" }).click();
  await expect(answer.getByRole("alert")).toContainText(
    "No new draft or activity receipt was saved",
  );
  await expect(
    receipt.getByText(/This answer was edited after this run/),
  ).toBeVisible();
});
