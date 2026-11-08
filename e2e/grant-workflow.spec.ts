import { test, expect } from "@playwright/test";
import { connect, save, seed } from "../lib/store";
import { resolve } from "node:path";

test("one preparation action assembles answers, preserves staff review, and refreshes stale handoffs", async ({
  page,
  request,
}, info) => {
  const db = connect(resolve("data/playwright.sqlite"));
  try {
    save(db, seed());
  } finally {
    db.close();
  }
  await page.goto("/#dashboard");
  const panel = page.getByRole("region", {
    name: "Grant workflow preparation",
  });
  await panel
    .getByRole("button", { name: "Prepare grant for review", exact: true })
    .click();
  await expect(panel.getByText("Fixture workflow handoff")).toBeVisible();
  await expect(
    panel.getByText("Matches current workspace", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByText(/2 answers prepared · 0 preserved/),
  ).toBeVisible();
  const first = await (await request.get("/api/workspace")).json();
  expect(first.drafts).toHaveLength(2);
  expect(first.approvals).toHaveLength(0);
  expect((await request.get("/api/export?grant=g1")).status()).toBe(409);
  await page.reload();
  await expect(
    panel.getByText("Matches current workspace", { exact: true }),
  ).toBeVisible();
  await panel.screenshot({ path: info.outputPath("workflow-handoff.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await panel.getByRole("button", { name: "Open staff review" }).click();
  await page
    .getByRole("button", { name: "Approve this snapshot", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "↓ Download approved report" }),
  ).toBeVisible();
  expect((await request.get("/api/export?grant=g1")).status()).toBe(200);
  const draft = first.drafts[0];
  const edit = await request.post("/api/workspace", {
    data: {
      action: "edit",
      id: draft.id,
      claims: [{ text: "Unsupported 99% result.", factIds: ["f1"] }],
    },
  });
  expect(edit.status()).toBe(200);
  await page.reload();
  await expect(
    panel.getByText("Workspace changed · run again", { exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Prepare grant for review", exact: true })
    .click();
  await expect(
    panel.getByText(/0 answers prepared · 2 preserved/),
  ).toBeVisible();
  await expect(
    panel.getByText("Matches current workspace", { exact: true }),
  ).toBeVisible();
  const state = await (await request.get("/api/workspace")).json();
  expect(
    state.drafts.find((item: { id: string }) => item.id === draft.id).claims[0]
      .text,
  ).toBe("Unsupported 99% result.");
  expect(state.reviewErrors.g1.length).toBeGreaterThan(0);
  expect((await request.get("/api/export?grant=g1")).status()).toBe(409);
  await expect(
    page.getByRole("button", { name: "Approve this snapshot", exact: true }),
  ).toBeDisabled();
  await page.goto("/#dashboard");
  await page.getByLabel("Current grant").selectOption("g2");
  await panel
    .getByRole("button", { name: "Prepare grant for review", exact: true })
    .click();
  await expect(panel.getByText(/Missing approved evidence for goal/)).toBeVisible();
  await expect(
    panel.getByText(/Transactions flagged during this run: T004/),
  ).toBeVisible();
  expect((await request.get("/api/export?grant=g2")).status()).toBe(409);
  const portfolio = page.getByRole("region", { name: "Grant portfolio" });
  await page.getByLabel("Portfolio planning date").fill("2026-11-08");
  await portfolio
    .getByLabel("Report due date for Family Futures 2026")
    .fill("2026-11-08");
  await portfolio
    .getByRole("button", {
      name: "Save due date for Family Futures 2026",
      exact: true,
    })
    .click();
  await expect(
    portfolio.getByText("Report due 2026-11-08", { exact: true }),
  ).toBeVisible();
  await portfolio
    .getByRole("button", { name: "Prepare 1 due reports", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 grants prepared" }),
  ).toBeVisible();
  await portfolio
    .getByRole("button", { name: "Prepare all grants", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "2 grants prepared" }),
  ).toBeVisible();
  await portfolio.screenshot({
    path: info.outputPath("portfolio-readiness.png"),
  });
});
