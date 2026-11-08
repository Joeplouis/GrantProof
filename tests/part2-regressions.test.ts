import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  seed,
  parseCSV,
  importCSV,
  allocate,
  connect,
  save,
  read,
  fixtureDraft,
  approve,
  currentApproval,
  hash,
} from "../lib/store";
test("malformed trailing characters after quoted CSV fields are rejected before importing any rows", () => {
  const s = seed();
  const before = JSON.stringify(s.transactions);
  assert.throws(
    () =>
      importCSV(
        s,
        'id,date,payee,amount\nGOOD,2026-09-01,Valid vendor,10.00\nBAD,2026-09-02,"Vendor"junk,20.00',
      ),
    /Malformed quote/,
  );
  assert.equal(JSON.stringify(s.transactions), before);
});
test("allocation categories must belong to the grant, not Object.prototype", () => {
  const s = seed();
  const before = s.allocations.length;
  for (const category of ["toString", "constructor", "__proto__"])
    assert.throws(() => allocate(s, "T004", "g2", category, 100), /valid/);
  assert.equal(s.allocations.length, before);
});
test("persisted evidence revocation cannot revive an old application approval when a fact is reapproved", () => {
  const db = connect(":memory:");
  try {
    let s = seed();
    s.drafts = s.questions
      .filter((q) => q.grantId === "g1")
      .map((q) => fixtureDraft(s, q));
    const original = approve(s, "g1", "Part 2 QA");
    const sealed = JSON.stringify(original.snapshot);
    save(db, s);
    s = read(db);
    s.facts[0].approved = false;
    save(db, s);
    s = read(db);
    s.facts[0].approved = true;
    save(db, s);
    s = read(db);
    assert.equal(currentApproval(s, "g1"), undefined);
    assert.equal(JSON.stringify(s.approvals[0].snapshot), sealed);
    assert.equal(hash(s.approvals[0].snapshot), original.hash);
    const fresh = approve(s, "g1", "New staff review");
    save(db, s);
    assert.equal(currentApproval(read(db), "g1")?.id, fresh.id);
  } finally {
    db.close();
  }
});
test("CSV supports BOM, escaped quotes, CRLF and embedded newlines without changing cents", () => {
  const s = seed();
  const result = importCSV(
    s,
    '\uFEFF"id",date,payee,amount\r\nNEW1,2026-08-01,"Family ""coaching"", Miami",12.34\r\nNEW2,2026-08-02,"Workshop\r\nmaterials",0.01\r\n',
  );
  assert.equal(result.imported, 2);
  assert.deepEqual(result.errors, []);
  assert.equal(s.transactions.at(-2)?.payee, 'Family "coaching", Miami');
  assert.equal(s.transactions.at(-2)?.cents, 1234);
  assert.equal(s.transactions.at(-1)?.cents, 1);
  assert.equal(s.transactions.at(-1)?.payee, "Workshop\r\nmaterials");
});
test("invalidated approval status survives restart and cannot be dropped by stale state", () => {
  const directory = mkdtempSync(join(tmpdir(), "grantproof-part2-"));
  const file = join(directory, "state.sqlite");
  let db = connect(file);
  try {
    let s = seed();
    s.drafts = s.questions
      .filter((q) => q.grantId === "g1")
      .map((q) => fixtureDraft(s, q));
    approve(s, "g1", "Staff");
    save(db, s);
    const stale = read(db);
    s.allocations[0].cents--;
    save(db, s);
    assert.ok(read(db).approvals[0].invalidatedAt);
    db.close();
    db = connect(file);
    assert.ok(read(db).approvals[0].invalidatedAt);
    save(db, stale);
    assert.ok(read(db).approvals[0].invalidatedAt);
    assert.ok(!currentApproval(read(db), "g1"));
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});
test("unrelated evidence changes do not invalidate a grant snapshot", () => {
  const db = connect(":memory:");
  try {
    const s = seed();
    s.drafts = s.questions
      .filter((q) => q.grantId === "g1")
      .map((q) => fixtureDraft(s, q));
    const a = approve(s, "g1", "Staff");
    save(db, s);
    s.facts.find((f) => f.id === "f3")!.approved = true;
    save(db, s);
    assert.equal(currentApproval(read(db), "g1")?.id, a.id);
  } finally {
    db.close();
  }
});
test("a failed persistence transaction cannot partially invalidate approval or replace saved records", () => {
  const db = connect(":memory:");
  try {
    const s = seed();
    s.drafts = s.questions
      .filter((q) => q.grantId === "g1")
      .map((q) => fixtureDraft(s, q));
    approve(s, "g1", "Staff");
    save(db, s);
    const before = read(db);
    s.facts[0].sourceId = "missing-source";
    assert.throws(() => save(db, s), /FOREIGN KEY/);
    assert.deepEqual(read(db), before);
    assert.ok(!s.approvals[0].invalidatedAt);
  } finally {
    db.close();
  }
});
