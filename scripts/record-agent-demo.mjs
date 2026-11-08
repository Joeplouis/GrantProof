// Opt-in local recording. One paid generation; fictional isolated workspace only.
import { chromium } from "@playwright/test";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
if (process.env.GRANTPROOF_ALLOW_LIVE_CHECK !== "1")
  throw Error("Authorize one live generation with GRANTPROOF_ALLOW_LIVE_CHECK=1.");
const url = process.env.GRANTPROOF_RECORD_URL || "http://127.0.0.1:4324";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw Error("Use a loopback recording server.");
const output = resolve(process.env.GRANTPROOF_RECORD_OUTPUT || "test-results/agent-demo");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, recordVideo: { dir: output, size: { width: 1440, height: 1080 } } });
const page = await context.newPage();
try {
  await page.goto(url + "/#application");
  await page.getByLabel("Workspace theme").selectOption("ocean-drive");
  await page.getByLabel("Use OpenAI Agents SDK").check();
  async function caption(text) {
    await page.evaluate((text) => {
      let el = document.getElementById("recording-caption");
      if (!el) {
        el = document.createElement("div"); el.id = "recording-caption";
        el.style.cssText = "position:fixed;bottom:12px;left:15%;right:3%;z-index:99999;background:#122d3f;color:white;padding:16px 22px;border-radius:12px;font:18px system-ui;box-shadow:0 3px 18px #0003;pointer-events:none";
        document.body.append(el);
      }
      el.textContent = text;
    }, text);
  }
  await caption("LIVE AI · Fictional records · The agent retrieves evidence and rules, then calls the spending tool.");
  const answer = page.locator(".answercard").first();
  await answer.getByRole("button", { name: "Generate sourced answer" }).click();
  const receipt = answer.getByRole("region", { name: "Generation activity" });
  await receipt.getByText("See what the agent did").waitFor({ timeout: 60000 });
  await receipt.scrollIntoViewIfNeeded();
  await caption("Recorded actions from this live run. Code checks the draft; staff keep the approval decision.");
  await page.waitForTimeout(5000);
  await receipt.getByText("Tool used", { exact: true }).first().click();
  await page.waitForTimeout(4000);
  await receipt.getByRole("button", { name: "View evidence" }).first().click();
  await caption("Open the retrieved evidence: original excerpt, source, dates, and staff approval status.");
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: "Close evidence" }).click();
  await caption("The model drafts. Code validates. Staff approve. This receipt stays attached to the saved draft.");
  await page.waitForTimeout(4000);
  const state = await (await page.request.get(url + "/api/workspace")).json();
  const draft = state.drafts.find((item) => item.questionId === "q1");
  if (draft.activity?.engine !== "live" || draft.activity.events.filter((event) => event.tool).length < 3)
    throw Error("Live tool receipt is incomplete.");
  if (state.draftErrors[draft.id]?.length) throw Error("Draft validation failed.");
  await page.screenshot({ path: resolve(output, "agent-activity-live.png"), fullPage: true });
  await writeFile(resolve(output, "agent-activity-receipt.json"), JSON.stringify({ status: "PASS", generationRequests: 1, data: "fictional isolated workspace", activity: draft.activity }, null, 2));
  const video = page.video();
  await context.close();
  await copyFile(await video.path(), resolve(output, "GrantProof-live-agent-demo.webm"));
  console.log("Live activity recording and receipt saved.");
} finally { await browser.close(); }
