import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.GRANTPROOF_URL || "http://127.0.0.1:4320";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname))
  throw Error("Run this fictional-data test on loopback only.");
async function post(body, status = 200) {
  const r = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
    },
    body: JSON.stringify(body),
  });
  const result = await r.json();
  assert.equal(r.status, status, result.error || result.message);
  return result;
}
let s = await post({
  action: "csv",
  text: await readFile(
    new URL(
      "../fixtures/synthetic/03-period-boundary-transactions.csv",
      import.meta.url,
    ),
    "utf8",
  ),
});
assert.match(s.message, /5 imported/);
await post({
  action: "allocate",
  transactionId: "B101",
  grantId: "g1",
  category: "Family coaching",
  cents: 5001,
});
await post({
  action: "allocate",
  transactionId: "B102",
  grantId: "g1",
  category: "Program supplies",
  cents: 2501,
});
await post({
  action: "allocate",
  transactionId: "B102",
  grantId: "g2",
  category: "Program supplies",
  cents: 2501,
});
await post({
  action: "allocate",
  transactionId: "B103",
  grantId: "g2",
  category: "Program supplies",
  cents: 5003,
});
s = await post({
  action: "allocate",
  transactionId: "B104",
  grantId: "g2",
  category: "Administration",
  cents: 5004,
});
for (const grantId of ["g1", "g2"]) {
  await post(
    {
      action: "allocate",
      transactionId: "B105",
      grantId,
      category: "Administration",
      cents: 1,
    },
    400,
  );
  await post(
    {
      action: "allocate",
      transactionId: "B102",
      grantId,
      category: "Program supplies",
      cents: 1,
    },
    400,
  );
}
assert.equal(s.reports.find((r) => r.grantId === "g1").spent, 1627502);
assert.equal(s.reports.find((r) => r.grantId === "g2").spent, 12508);
console.log(
  "PASS: all five synthetic boundary rows, inclusive first/last days, shared-period split, outside-both rejection, and cross-grant extra-cent rejection.",
);
