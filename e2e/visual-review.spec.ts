import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { resolve } from "node:path";
import { connect, save, seed } from "../lib/store";

test.beforeEach(() => {
  const db = connect(resolve("data/playwright.sqlite"));
  try {
    save(db, seed());
  } finally {
    db.close();
  }
});

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const dialog = page.getByRole("dialog");
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: !(await dialog.count()),
    scale: "css",
  });
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect
    .soft(size.content, `${name}: no page-wide horizontal overflow`)
    .toBeLessThanOrEqual(size.viewport + 1);
  const clippedTotals = await page
    .locator(".money-stats strong, .reviewtotals strong")
    .evaluateAll((values) =>
      values
        .filter((value) => {
          const range = document.createRange();
          range.selectNodeContents(value);
          const text = range.getBoundingClientRect();
          const box = value
            .closest(".money-stats, .reviewtotals")!
            .getBoundingClientRect();
          return text.right > box.right || text.left < box.left;
        })
        .map((value) => value.textContent),
    );
  expect
    .soft(clippedTotals, `${name}: currency fits inside its summary`)
    .toEqual([]);
}

test("visual review of every screen, dialogs, and saved pointer layout", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#dashboard");
  await expect(
    page.getByRole("heading", { name: "A clear view of your grant." }),
  ).toBeVisible();
  await capture(page, info, "01-dashboard");

  // Exercise real browser pointer movement; phone uses Chromium touch input.
  const handle = page.getByRole("button", {
    name: "Drag Application progress",
  });
  const target = page.getByRole("article", { name: "Evidence overview" });
  if (info.project.use.isMobile) {
    await handle.scrollIntoViewIfNeeded();
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    const cdp = await page.context().newCDPSession(page);
    try {
      const x = from!.x + from!.width / 2;
      const y = from!.y + from!.height / 2;
      const endX = Math.max(10, to!.x + to!.width / 2);
      const endY = Math.max(70, to!.y + to!.height / 2);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let step = 1; step <= 8; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x + ((endX - x) * step) / 8, y: y + ((endY - y) * step) / 8 },
          ],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await cdp.detach();
    }
  } else {
    await handle.dragTo(target);
  }
  await expect(page.locator("[data-dashboard-panel]").first()).toHaveAttribute(
    "data-dashboard-panel",
    "application",
  );
  await page.reload();
  await expect(page.locator("[data-dashboard-panel]").first()).toHaveAttribute(
    "data-dashboard-panel",
    "application",
  );
  await page.getByRole("button", { name: "Reset layout" }).click();
  await expect(page.locator("[data-dashboard-panel]").first()).toHaveAttribute(
    "data-dashboard-panel",
    "evidence",
  );

  for (const [key, label] of [
    ["evidence", "Good answers start here."],
    ["application", "Your impact, backed by evidence."],
    ["spending", "Every dollar, accounted for."],
    ["review", "Ready for a human sign-off."],
  ]) {
    await page.goto(`/#${key}`);
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
    await capture(page, info, `02-${key}`);
    if (key === "spending" && info.project.use.isMobile) {
      const table = page.getByRole("region", {
        name: "Category reconciliation table",
      });
      await table.focus();
      await table.press("ArrowRight");
      await expect
        .poll(() => table.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
    }
  }
  for (const id of ["q1", "q2"]) {
    const response = await request.post("/api/workspace", {
      data: { action: "generate", id },
    });
    expect(response.status()).toBe(200);
  }
  await page.goto("/#application");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit answer" }).first(),
  ).toBeVisible();
  await capture(page, info, "03-generated-application");
  await page.getByTitle("View claim evidence").first().click();
  await expect(
    page.getByRole("dialog", { name: "Claim evidence" }),
  ).toBeVisible();
  await capture(page, info, "04-citation-dialog");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit answer" }).first().click();
  await expect(page.getByRole("dialog", { name: "Edit answer" })).toBeVisible();
  await capture(page, info, "05-answer-editor");
  await page.keyboard.press("Escape");
  await page.goto("/#review");
  await page.getByRole("button", { name: "Approve this snapshot" }).click();
  await expect(
    page.getByRole("link", { name: "↓ Export audit package · JSON" }),
  ).toBeVisible();
  await capture(page, info, "06-approved-review");
  await page.goto("/#evidence");
  await page.getByRole("button", { name: "＋ Import source" }).click();
  await capture(page, info, "07-source-import");
  await page.goto("/#spending");
  await page.getByRole("button", { name: "↑ Import CSV" }).click();
  await capture(page, info, "08-csv-import");
  expect(errors, "no unhandled client errors").toEqual([]);
});
