import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connect, save, seed } from "../lib/store";

const database = resolve("data/playwright.sqlite");
const synthetic = (name: string) => resolve("fixtures/synthetic", name);
const achievedName = "05-achieved-program-register-2026.txt";
const unsafeName = "07-unapproved-unsafe-claims.txt";

test.beforeEach(() => {
  const db = connect(database);
  try {
    save(db, seed());
  } finally {
    db.close();
  }
});

async function post(request: APIRequestContext, body: unknown) {
  const response = await request.post("/api/workspace", { data: body });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}

async function importSource(page: Page, name: string) {
  await page.getByRole("button", { name: "＋ Import source" }).click();
  await page.getByLabel("Upload plain text").setInputFiles(synthetic(name));
  await expect(
    page.getByRole("textbox", { name: "Source text" }),
  ).not.toBeEmpty();
  await page.getByRole("button", { name: "Extract candidate facts" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("a staff member can complete the synthetic grant journey and download its sealed report", async ({
  page,
  request,
}) => {
  const expected = JSON.parse(
    await readFile(synthetic("expected-results.json"), "utf8"),
  ) as {
    post_allocation_g1: { spent_cents: number; balance_cents: number };
    post_allocation_g2: { balance_cents: number };
    allocations: Array<{
      transactionId: string;
      grantId: string;
      category: string;
      cents: number;
    }>;
  };

  await page.goto("/#evidence");
  await expect(
    page.getByRole("heading", { name: "Good answers start here." }),
  ).toBeVisible();
  await importSource(page, unsafeName);
  await importSource(page, achievedName);
  const achieved = page.locator("section.sourcecard").filter({
    has: page.getByRole("heading", { name: achievedName }),
  });
  await achieved.getByRole("button", { name: "Approve fact" }).first().click();
  await expect(
    achieved.getByRole("button", { name: "Approve fact" }),
  ).toHaveCount(2);
  await achieved.getByRole("button", { name: "Approve fact" }).first().click();

  await page.getByRole("button", { name: /Application workspace/ }).click();
  await page
    .getByRole("button", { name: "✧ Generate sourced answer" })
    .first()
    .click();
  await expect(
    page.getByText(
      "Tidepath Family Alliance delivered 74 parent workshops during 2026.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "✧ Generate sourced answer" }).click();
  await expect(
    page.getByRole("button", { name: "✧ Generate sourced answer" }),
  ).toHaveCount(0);
  await expect(page.getByText(/99% success rate|10,000 families/)).toHaveCount(
    0,
  );
  const citation = page.getByTitle("View claim evidence").first();
  await citation.click();
  await expect(
    page.getByRole("dialog", { name: "Claim evidence" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Claim evidence" }),
  ).toHaveCount(0);
  await expect(citation).toBeFocused();

  await page.getByRole("button", { name: /Grant spending/ }).click();
  await page.getByRole("button", { name: "↑ Import CSV" }).click();
  await page
    .getByLabel("CSV file")
    .setInputFiles(synthetic("01-valid-transactions.csv"));
  await expect(
    page.getByRole("textbox", { name: "CSV contents" }),
  ).not.toBeEmpty();
  await page.getByRole("button", { name: "Validate & import" }).click();
  await expect(
    page.getByText("7 imported · 0 duplicates skipped"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Review & export/ }).click();
  await expect(
    page.getByRole("button", { name: "Approve this snapshot" }),
  ).toBeDisabled();

  for (const allocation of expected.allocations)
    await post(request, { action: "allocate", ...allocation });
  await page.goto("/#dashboard");
  await page.reload();
  const budget = page.getByRole("article", { name: "Budget snapshot" });
  await expect(budget.getByText("$30,274.45")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Current grant" })
    .selectOption("g2");
  await expect(budget.getByText("$21,974.56")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Current grant" })
    .selectOption("g1");
  const viewport = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.width + 1);
  await page.getByRole("button", { name: "Drag Budget snapshot" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-dashboard-panel]").nth(1)).toHaveAttribute(
    "data-dashboard-panel",
    "spending",
  );
  await page.reload();
  await expect(page.locator("[data-dashboard-panel]").nth(1)).toHaveAttribute(
    "data-dashboard-panel",
    "spending",
  );

  await page.getByRole("button", { name: /Review & export/ }).click();
  await expect(
    page.getByText("✓ All deterministic checks passed"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve this snapshot" }).click();
  await expect(
    page.getByRole("link", { name: "↓ Export audit package · JSON" }),
  ).toBeVisible();

  const jsonDownloadPromise = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "↓ Export audit package · JSON" })
    .click();
  const jsonDownload = await jsonDownloadPromise;
  const exported = JSON.parse(
    await readFile(await jsonDownload.path(), "utf8"),
  );
  expect(exported.approval.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(exported.approval.snapshot.report.spent).toBe(
    expected.post_allocation_g1.spent_cents,
  );
  expect(exported.approval.snapshot.report.balance).toBe(
    expected.post_allocation_g1.balance_cents,
  );
  expect(
    exported.approval.snapshot.facts.some((fact: { excerpt: string }) =>
      /99%|10,000/.test(fact.excerpt),
    ),
  ).toBe(false);

  const htmlDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "↓ Download approved report" }).click();
  const htmlDownload = await htmlDownloadPromise;
  const html = await readFile(await htmlDownload.path(), "utf8");
  expect(html).toContain("$19,725.55");
  expect(html).toContain(exported.approval.hash);

  await page.getByRole("button", { name: /Application workspace/ }).click();
  await page.getByRole("button", { name: "Edit answer" }).first().click();
  const editor = page.getByRole("dialog", { name: "Edit answer" });
  await editor
    .getByRole("textbox", { name: "Claim 1" })
    .fill("Invented 99% result.");
  await editor.getByRole("button", { name: "Save new version" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole("button", { name: /Review & export/ }).click();
  await expect(
    page.getByRole("link", { name: "↓ Export audit package · JSON" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check export availability" }).click();
  await expect(page.locator(".notice[role='alert']")).toContainText(
    "Export blocked:",
  );
  expect((await request.get("/api/export?grant=g1")).status()).toBe(409);
});

test("a stale reviewer session cannot export after another session revokes evidence", async ({
  page,
  request,
  browser,
}) => {
  await post(request, { action: "generate", id: "q1" });
  await post(request, { action: "generate", id: "q2" });
  const approved = await post(request, {
    action: "approve",
    grantId: "g1",
    reviewer: "Fictional reviewer",
  });
  const approvalId = approved.currentApprovals.find(
    (item: { grantId: string }) => item.grantId === "g1",
  ).id;
  await page.goto("/#review");
  const staleLink = page.getByRole("link", {
    name: "↓ Export audit package · JSON",
  });
  await expect(staleLink).toBeVisible();

  const otherContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4318",
  });
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/#evidence");
    const citedFact = otherPage.locator(".factrow").filter({
      hasText:
        "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
    });
    await citedFact.getByRole("button", { name: "Revoke approval" }).click();
    await expect(
      citedFact.getByRole("button", { name: "Approve fact" }),
    ).toBeVisible();

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/export?grant=g1"),
    );
    await staleLink.click();
    expect((await responsePromise).status()).toBe(409);
    await page.goto("/#review");
    await expect(
      page.getByRole("link", { name: "↓ Export audit package · JSON" }),
    ).toHaveCount(0);
    const state = await (await request.get("/api/workspace")).json();
    expect(
      state.currentApprovals.some(
        (item: { id: string }) => item.id === approvalId,
      ),
    ).toBe(false);
    expect(
      state.approvals.find((item: { id: string }) => item.id === approvalId)
        .invalidatedAt,
    ).toBeTruthy();
  } finally {
    await otherContext.close();
  }
});
