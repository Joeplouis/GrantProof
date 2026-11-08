import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  seed,
  fixtureDraft,
  validateDraft,
  importCSV,
  allocate,
  spending,
  approve,
  currentApproval,
  connect,
  save,
  read,
  hash,
  inPeriod,
  parseCSV,
} from "../lib/store";
test("unapproved facts excluded; unsupported statistic yields evidence gap", () => {
  const s = seed();
  const q = { ...s.questions[0], required: "92%" };
  const d = fixtureDraft(s, q);
  assert.equal(d.claims.length, 0);
  assert.match(d.gaps[0], /Missing approved evidence/);
  assert.ok(
    !fixtureDraft(s, s.questions[0]).claims.some((c) =>
      c.factIds.includes("f4"),
    ),
  );
});
test("goals stay separate from achieved outcomes and period filtering works", () => {
  const s = seed();
  assert.equal(fixtureDraft(s, s.questions[2]).claims.length, 0);
  s.facts.find((f) => f.id === "f3")!.approved = true;
  assert.equal(fixtureDraft(s, s.questions[2]).claims.length, 1);
  assert.ok(
    !fixtureDraft(s, s.questions[0]).claims.some((c) =>
      c.factIds.includes("f3"),
    ),
  );
});
test("word limits enforced without truncating a factual claim", () => {
  const s = seed();
  const q = { ...s.questions[0], limit: 3 };
  assert.equal(fixtureDraft(s, q).claims.length, 0);
  const d = fixtureDraft(s, s.questions[0]);
  s.questions[0].limit = 3;
  assert.ok(validateDraft(s, d).includes("Word limit exceeded."));
});
test("citation IDs, approval, period, exact excerpt and goal type are checked", () => {
  const s = seed();
  const d = fixtureDraft(s, s.questions[0]);
  assert.deepEqual(validateDraft(s, d), []);
  d.claims[0].factIds = ["invented"];
  assert.match(validateDraft(s, d).join(), /Invalid or unapproved/);
  d.claims[0].factIds = ["f1"];
  d.claims[0].text = "We served 9999 families.";
  assert.match(validateDraft(s, d).join(), /Edited wording/);
  s.facts[0].approved = false;
  assert.match(validateDraft(s, d).join(), /unapproved/);
  s.facts[0].approved = true;
  s.sources[0].periodStart = "2025-01-01";
  assert.match(validateDraft(s, d).join(), /Invalid/);
});
test("CSV repeat import and alternate-ID duplicate do not double count", () => {
  const s = seed();
  const csv = readFileSync("fixtures/quickbooks-sample.csv", "utf8");
  assert.deepEqual(importCSV(s, csv), {
    imported: 0,
    duplicates: 4,
    errors: [],
  });
  assert.equal(s.transactions.length, 4);
  assert.equal(
    importCSV(s, "id,date,payee,amount\nALT,2026-01-01,Coaching team,12000.00")
      .duplicates,
    1,
  );
  assert.equal(
    importCSV(s, "id,date,payee,amount\nT001,2026-01-01,Changed,12000.00")
      .errors.length,
    1,
  );
});
test("malformed rows reported; quoted commas work; invalid calendar dates rejected", () => {
  const s = seed();
  const r = importCSV(s, readFileSync("fixtures/import-errors.csv", "utf8"));
  assert.equal(r.imported, 1);
  assert.equal(r.duplicates, 1);
  assert.equal(r.errors.length, 2);
  assert.equal(s.transactions.at(-1)?.payee, "Family supplies, Miami");
  assert.throws(() => parseCSV('id,date,payee,amount\n"unclosed'), /Unclosed/);
  assert.throws(() => importCSV(s, "bad,columns"), /columns/);
});
test("inclusive period boundaries and fiscal year use funder dates", () => {
  const s = seed();
  assert.ok(inPeriod("2026-01-01", s.grants[0]));
  assert.ok(inPeriod("2026-12-31", s.grants[0]));
  assert.ok(!inPeriod("2027-01-01", s.grants[0]));
  assert.ok(inPeriod("2027-01-01", s.grants[1]));
  assert.equal(spending(s, "g1").spent, 1620000);
  assert.equal(spending(s, "g1").balance, 3380000);
  assert.equal(spending(s, "g2").spent, 0);
});
test("cross-grant over-allocation, fractional cents and out-of-period rejected", () => {
  const s = seed();
  assert.throws(
    () => allocate(s, "T003", "g2", "Administration", 1),
    /exceeds/,
  );
  assert.throws(
    () => allocate(s, "T004", "g1", "Administration", 100),
    /outside/,
  );
  assert.throws(
    () => allocate(s, "T004", "g2", "Administration", 1.5),
    /valid/,
  );
  allocate(s, "T004", "g2", "Administration", 90000);
  assert.equal(spending(s, "g2").spent, 90000);
});
test("category and report budgets, spending and balances reconcile", () => {
  const s = seed();
  const r = spending(s, "g1");
  assert.equal(
    r.rows.reduce((n, x) => n + x.spent, 0),
    r.spent,
  );
  assert.equal(r.budget - r.spent, r.balance);
  assert.deepEqual(
    r.rows.map((r) => r.spent),
    [1200000, 240000, 180000],
  );
});
test("approval blocks gaps; edits invalidate; approved snapshot remains exact", () => {
  const s = seed();
  assert.throws(() => approve(s, "g1", "Jamie"), /Generate/);
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  const a = approve(s, "g1", "Jamie");
  assert.equal(currentApproval(s, "g1")?.id, a.id);
  const original = JSON.stringify(a.snapshot);
  s.drafts[0].claims[0].text = "Edited unsupported claim";
  s.drafts[0].version++;
  assert.equal(currentApproval(s, "g1"), undefined);
  assert.equal(JSON.stringify(a.snapshot), original);
  assert.equal(hash(a.snapshot), a.hash);
});
test("evidence revocation and financial changes invalidate approvals", () => {
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  approve(s, "g1", "Jamie");
  s.facts[0].approved = false;
  assert.equal(currentApproval(s, "g1"), undefined);
  s.facts[0].approved = true;
  s.allocations[0].cents--;
  assert.equal(currentApproval(s, "g1"), undefined);
});
test("unallocated spending and over-budget categories block approval", () => {
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  s.allocations.pop();
  assert.throws(() => approve(s, "g1", "Jamie"), /unallocated/);
  s.allocations = seed().allocations;
  s.grants[0].categories.Administration = 100;
  assert.throws(() => approve(s, "g1", "Jamie"), /over-budget/);
});
test("SQLite persistence survives close/reopen; relational FK rejects dangling facts", () => {
  const dir = mkdtempSync(join(tmpdir(), "grantproof-"));
  const path = join(dir, "test.sqlite");
  try {
    let db = connect(path);
    const s = seed();
    s.drafts = [fixtureDraft(s, s.questions[0])];
    save(db, s);
    db.close();
    db = connect(path);
    assert.deepEqual(read(db), s);
    const fk = db.prepare("PRAGMA foreign_key_list(facts)").all();
    assert.ok(fk.length);
    assert.throws(
      () =>
        db
          .prepare("INSERT INTO facts (id,body) VALUES (?,?)")
          .run(
            "bad",
            JSON.stringify({ ...s.facts[0], id: "bad", sourceId: "missing" }),
          ),
      /FOREIGN KEY/,
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test("export appendix excludes unrelated unapproved facts and escapes imported HTML", async () => {
  const { reportHTML } = await import("../lib/export");
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  const a = approve(s, "g1", "<script>alert(1)</script>");
  assert.deepEqual(
    a.snapshot.facts.map((f) => f.id),
    ["f1", "f2"],
  );
  const html = reportHTML(a);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("92%"));
  assert.ok(html.includes("$16,200.00"));
});
test("extra unrelated citation is rejected and new in-period transaction invalidates approval", () => {
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  s.drafts[0].claims[0].factIds.push("f2");
  assert.ok(validateDraft(s, s.drafts[0]).some((e) => e.includes("Invalid")));
  s.drafts[0].claims[0].factIds = ["f1"];
  approve(s, "g1", "Jamie");
  importCSV(s, "id,date,payee,amount\nNEW,2026-09-01,New expense,1.01");
  assert.equal(currentApproval(s, "g1"), undefined);
});
