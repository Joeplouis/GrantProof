import { test, expect } from "@playwright/test";
import { connect, save, seed } from "../lib/store";
import { ensureScheduler, dueDate } from "../lib/scheduler";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("background worker prepares a due report without an open app and leaves export locked", async ({
  page,
  request,
}, info) => {
  const database = resolve("data/playwright.sqlite");
  const db = connect(database);
  try {
    save(db, seed());
    ensureScheduler(db);
    db.exec(
      "DELETE FROM report_schedules; DELETE FROM report_jobs; DELETE FROM report_worker;",
    );
  } finally {
    db.close();
  }
  await page.goto("/#dashboard");
  const panel = page.getByRole("region", {
    name: "Background report scheduler",
  });
  await panel
    .getByLabel("Schedule Family Futures 2026", { exact: true })
    .check();
  await expect(
    panel.getByLabel("Schedule Family Futures 2026", { exact: true }),
  ).toBeChecked();
  const date = dueDate(new Date());
  expect(
    (
      await request.post("/api/workspace", {
        data: { action: "report-date", grantId: "g1", date },
      })
    ).status(),
  ).toBe(200);
  await page.goto("about:blank");
  await promisify(execFile)(
    process.execPath,
    ["--import", "tsx", "scripts/report-worker.ts", "--once"],
    {
      cwd: process.cwd(),
      env: { ...process.env, GRANTPROOF_DB: database, OPENAI_API_KEY: "" },
    },
  );
  const state = await (await request.get("/api/workspace")).json();
  expect(state.scheduler.jobs[0].status).toBe("complete");
  expect(state.drafts).toHaveLength(2);
  expect(state.approvals).toHaveLength(0);
  expect((await request.get("/api/export?grant=g1")).status()).toBe(409);
  await page.goto("/#dashboard");
  await expect(panel.getByText("Scheduled run: complete")).toBeVisible();
  await panel.screenshot({ path: info.outputPath("background-scheduler.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await promisify(execFile)(
    process.execPath,
    ["--import", "tsx", "scripts/report-worker.ts", "--once"],
    {
      cwd: process.cwd(),
      env: { ...process.env, GRANTPROOF_DB: database, OPENAI_API_KEY: "" },
    },
  );
  const after = await (await request.get("/api/workspace")).json();
  expect(after.drafts).toEqual(state.drafts);
  expect(after.scheduler.jobs).toHaveLength(1);
  await panel
    .getByLabel("Schedule Family Futures 2026", { exact: true })
    .uncheck();
  await expect(
    panel.getByLabel("Schedule Family Futures 2026", { exact: true }),
  ).not.toBeChecked();
});
