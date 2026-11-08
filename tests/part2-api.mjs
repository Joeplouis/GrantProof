import assert from "node:assert/strict";
const base = process.env.GRANTPROOF_URL || "http://127.0.0.1:4319";
async function state() {
  const r = await fetch(base + "/api/workspace");
  assert.equal(r.status, 200);
  return r.json();
}
async function post(body, status = 200) {
  const r = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(body),
  });
  const result = await r.json();
  assert.equal(r.status, status, result.error || result.message);
  return result;
}
let s = await state();
const count = s.transactions.length;
const allocations = s.allocations.length;
await post(
  {
    action: "csv",
    text: 'id,date,payee,amount\nGOOD,2026-09-01,Good vendor,10.00\nBAD,2026-09-02,"Vendor"junk,20.00',
  },
  400,
);
assert.equal((await state()).transactions.length, count);
await post(
  {
    action: "allocate",
    transactionId: "T004",
    grantId: "g2",
    category: "toString",
    cents: 100,
  },
  400,
);
assert.equal((await state()).allocations.length, allocations);
await post({ action: "generate", id: "q1" });
await post({ action: "generate", id: "q2" });
s = await post({ action: "approve", grantId: "g1", reviewer: "Part 2 API QA" });
const original = s.currentApprovals.find((a) => a.grantId === "g1");
assert.ok(original);
let response = await fetch(base + "/api/export?grant=g1");
assert.equal(response.status, 200);
const sealed = (await response.json()).approval.snapshot;
await post({ action: "fact", id: "f1", approved: false });
assert.equal((await fetch(base + "/api/export?grant=g1")).status, 409);
s = await post({ action: "fact", id: "f1", approved: true });
assert.equal((await fetch(base + "/api/export?grant=g1")).status, 409);
assert.ok(s.approvals.find((a) => a.id === original.id).invalidatedAt);
assert.deepEqual(
  s.approvals.find((a) => a.id === original.id).snapshot,
  sealed,
);
s = await post({
  action: "approve",
  grantId: "g1",
  reviewer: "New explicit staff review",
});
const fresh = s.currentApprovals.find((a) => a.grantId === "g1");
assert.ok(fresh);
assert.notEqual(fresh.id, original.id);
response = await fetch(base + "/api/export?grant=g1");
assert.equal(response.status, 200);
assert.deepEqual((await response.json()).approval.snapshot, fresh.snapshot);
assert.equal(s.reports.find((r) => r.grantId === "g1").spent, 1620000);
console.log(
  "PASS: malformed CSV and inherited categories rejected through unchanged API; revocation/restoration keeps export blocked until a fresh explicit staff approval; sealed snapshots and totals remain exact.",
);
