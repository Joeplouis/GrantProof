import { test, expect } from "@playwright/test";
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

test("Part 3 fixture/API preserves Part 2 approvals on failed generation and shows Part 1 evidence gaps", async ({
  page,
  request,
}) => {
  const initial = await (await request.get("/api/workspace")).json();
  expect(initial.liveAvailable).toBe(false);
  for (const id of ["q1", "q2"]) {
    const response = await request.post("/api/workspace", {
      data: { action: "generate", id },
    });
    expect(response.status()).toBe(200);
  }
  const approval = await request.post("/api/workspace", {
    data: { action: "approve", grantId: "g1", reviewer: "Fictional Part 3 QA" },
  });
  expect(approval.status()).toBe(200);
  const sealed = await (await request.get("/api/export?grant=g1")).json();
  const before = await (await request.get("/api/workspace")).json();
  const failed = await request.post("/api/workspace", {
    data: { action: "generate", id: "q1", live: true },
  });
  expect(failed.status()).toBe(400);
  expect((await failed.json()).error).toContain("Live AI is unavailable");
  expect(await (await request.get("/api/workspace")).json()).toEqual(before);
  expect(await (await request.get("/api/export?grant=g1")).json()).toEqual(
    sealed,
  );

  await page.goto("/#application");
  await expect(page.getByLabel("Current grant")).toBeVisible();
  await page.getByLabel("Current grant").selectOption("g2");
  await page.getByRole("button", { name: "✧ Generate sourced answer" }).click();
  await expect(
    page.getByText("Missing approved evidence for goal.", { exact: true }),
  ).toBeVisible();
  let state = await (await request.get("/api/workspace")).json();
  let goal = state.drafts.find(
    (draft: { questionId: string }) => draft.questionId === "q3",
  );
  expect(goal.claims).toEqual([]);
  expect(goal.gaps.length).toBeGreaterThan(0);
  const approvedFact = await request.post("/api/workspace", {
    data: { action: "fact", id: "f3", approved: true },
  });
  expect(approvedFact.status()).toBe(200);
  await page.reload();
  await page.getByLabel("Current grant").selectOption("g2");
  await page.getByRole("button", { name: "↻ Regenerate" }).click();
  await expect(
    page.locator(".draftcontent p").filter({
      hasText: "Tidepath aims to support 150 families by June 2027.",
    }),
  ).toBeVisible();
  state = await (await request.get("/api/workspace")).json();
  goal = state.drafts.find(
    (draft: { questionId: string }) => draft.questionId === "q3",
  );
  expect(goal.claims).toEqual([
    {
      text: "Tidepath aims to support 150 families by June 2027.",
      factIds: ["f3"],
    },
  ]);
  expect(goal.gaps).toEqual([]);
  expect(
    state.currentApprovals.some(
      (item: { grantId: string }) => item.grantId === "g1",
    ),
  ).toBe(true);
  await page.getByLabel("Current grant").selectOption("g1");
  await page.getByRole("button", { name: /Review & export/ }).click();
  await expect(
    page.getByRole("link", { name: "↓ Export audit package · JSON" }),
  ).toBeVisible();
});
