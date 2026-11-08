import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  importCSV,
  allocate,
  spending,
  approve,
  fixtureDraft,
  connect,
  save,
  read,
} from "../lib/store";
function ready() {
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  return s;
}
function large() {
  const s = seed();
  const result = importCSV(
    s,
    "id,date,payee,amount\nMAX1,2027-01-02,Large fictional expense,90071992547409.90\nMAX2,2027-01-03,Small fictional expense,0.02",
  );
  assert.equal(result.imported, 2);
  return s;
}
test("aggregate cent overflow is rejected before allocation mutates the ledger", () => {
  const s = large();
  allocate(s, "MAX1", "g2", "Administration", 9007199254740990);
  const before = JSON.stringify(s.allocations);
  assert.throws(
    () => allocate(s, "MAX2", "g2", "Administration", 2),
    /supported.*cent|cent.*range/i,
  );
  assert.equal(JSON.stringify(s.allocations), before);
  assert.equal(spending(s, "g2").spent, 9007199254740990);
});
test("persistence rejects unsafe report totals without replacing valid saved data", () => {
  const db = connect(":memory:");
  try {
    save(db, seed());
    const before = read(db);
    const s = large();
    s.allocations.push(
      {
        id: "L1",
        transactionId: "MAX1",
        grantId: "g2",
        category: "Administration",
        cents: 9007199254740990,
      },
      {
        id: "L2",
        transactionId: "MAX2",
        grantId: "g2",
        category: "Administration",
        cents: 2,
      },
    );
    assert.throws(() => save(db, s), /supported.*cent|cent.*range/i);
    assert.deepEqual(read(db), before);
  } finally {
    db.close();
  }
});
test("unknown legacy allocation categories block approval instead of disappearing from totals", () => {
  const s = ready();
  s.allocations[2].category = "toString";
  assert.throws(() => approve(s, "g1", "Staff"), /categor|allocation/i);
});
test("legacy cross-grant over-allocation blocks approval", () => {
  const s = ready();
  s.allocations.push({
    id: "bad-over",
    transactionId: "T003",
    grantId: "g2",
    category: "Administration",
    cents: 1,
  });
  assert.throws(() => approve(s, "g1", "Staff"), /over-allocated/i);
});
test("out-of-period legacy allocations must be resolved before approval", () => {
  const s = ready();
  s.allocations.push({
    id: "bad-period",
    transactionId: "T004",
    grantId: "g1",
    category: "Administration",
    cents: 90000,
  });
  assert.throws(() => approve(s, "g1", "Staff"), /out-of-period/i);
});
test("risk thresholds are exact at 80 percent, budget and over-budget boundaries", () => {
  const s = seed();
  s.grants[1].categories.Administration = 100;
  const risk = () =>
    spending(s, "g2").rows.find((r) => r.category === "Administration")!.risk;
  allocate(s, "T004", "g2", "Administration", 79);
  assert.equal(risk(), "On track");
  allocate(s, "T004", "g2", "Administration", 1);
  assert.equal(risk(), "Near limit");
  allocate(s, "T004", "g2", "Administration", 20);
  assert.equal(risk(), "Near limit");
  allocate(s, "T004", "g2", "Administration", 1);
  assert.equal(risk(), "Over budget");
  const empty = seed();
  empty.grants[1].categories.Administration = 0;
  assert.equal(
    spending(empty, "g2").rows.find((r) => r.category === "Administration")!
      .risk,
    "On track",
  );
});
test("aggregate budgets outside the supported cent range cannot produce a report", () => {
  const s = seed();
  s.grants[1].categories = {
    "First category": Number.MAX_SAFE_INTEGER,
    "Second category": 1,
  };
  assert.throws(() => spending(s, "g2"), /supported.*cent|cent.*range/i);
});
