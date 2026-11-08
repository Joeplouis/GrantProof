// Opt-in: one coordinator run plus up to two draft runs on a fresh fictional DB.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
if (process.env.GRANTPROOF_ALLOW_LIVE_CHECK !== "1")
  throw Error("Explicit live check authorization required.");
const output = resolve(
  process.env.GRANTPROOF_RECORD_OUTPUT || "test-results/workflow-demo",
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  recordVideo: { dir: output, size: { width: 1440, height: 1080 } },
});
const page = await context.newPage();
try {
  await page.goto("http://127.0.0.1:4324/#dashboard");
  await page.getByLabel("Workspace theme").selectOption("ocean-drive");
  const panel = page.getByRole("region", {
    name: "Grant workflow preparation",
  });
  await panel.getByLabel("Use live workflow agent").check();
  const prior = await (await page.request.get("http://127.0.0.1:4324/api/workspace")).json();
  if (!prior.workflowRuns.some((run) => run.grantId === "g1" && run.mode === "live")) {
    await panel.getByRole("button", { name: "Prepare grant for review", exact: true }).click();
  }
  await panel
    .getByText("Workflow agent handoff", { exact: true })
    .waitFor({ timeout: 125000 });
  await panel.locator(".preparation-receipt").scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  await panel.getByText("Tool used", { exact: true }).first().click();
  await page.waitForTimeout(3000);
  await panel.screenshot({ path: resolve(output, "workflow-live.png") });
  const state = await (await page.request.get("http://127.0.0.1:4324/api/workspace")).json();
  const receipt = state.workflowRuns.find((run) => run.grantId === "g1");
  if (
    receipt?.mode !== "live" ||
    receipt.events.length !== 4 ||
    receipt.prepared !== 2 ||
    receipt.blockers.length ||
    state.approvals.length
  )
    throw Error("Live preparation acceptance failed.");
  if (state.drafts.some((draft) => draft.activity?.engine !== "live"))
    throw Error("Expected live drafts.");
  if ((await page.request.get("http://127.0.0.1:4324/api/export?grant=g1")).status() !== 409)
    throw Error("Export must require staff approval.");
  await writeFile(
    resolve(output, "workflow-live-receipt.json"),
    JSON.stringify(
      {
        status: "PASS",
        data: "fictional isolated workspace",
        liveCoordinatorRuns: 1,
        liveDraftRuns: 2,
        unapprovedExportStatus: 409,
        receipt,
      },
      null,
      2,
    ),
  );
  await panel.getByRole("button", { name: "Inspect answers" }).click();
  await page
    .getByRole("region", { name: "Generation activity" })
    .first()
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  const video = page.video();
  await context.close();
  await copyFile(
    await video.path(),
    resolve(output, "GrantProof-workflow-live-demo.webm"),
  );
  console.log(
    "PASS: coordinator and two live drafts; four workflow tools; export blocked until staff approval.",
  );
} finally {
  await browser.close();
}
