import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  seed,
  importCSV,
  allocate,
  spending,
  fixtureDraft,
  validateDraft,
  reviewErrors,
  approve,
  currentApproval,
  connect,
  save,
  read,
  hash,
  type State,
  type Fact,
} from "../lib/store";

const fixture = (name: string) =>
  readFileSync(
    new URL(`../fixtures/synthetic/${name}`, import.meta.url),
    "utf8",
  );

test("the synthetic nonprofit can prove claims, reconcile both grants, and revoke a changed approval", () => {
  const expected = JSON.parse(fixture("expected-results.json")) as {
    valid_csv: { first_import_new: number; second_import_duplicates: number };
    invalid_csv: {
      new_imported: number;
      duplicates_skipped: number;
      row_errors: number;
    };
    post_allocation_g1: { spent_cents: number; balance_cents: number };
    post_allocation_g2: { spent_cents: number; balance_cents: number };
    allocations: Array<{
      transactionId: string;
      grantId: string;
      category: string;
      cents: number;
    }>;
  };
  const s: State = seed();
  function addPendingSource(
    name: string,
    start: string,
    end: string,
    kind: Fact["kind"],
  ) {
    const text = fixture(name);
    const sourceId = `synthetic-source-${s.sources.length}`;
    s.sources.push({
      id: sourceId,
      name,
      text,
      periodStart: start,
      periodEnd: end,
    });
    return text
      .trim()
      .split(/\r?\n/)
      .map((excerpt, i) => {
        const fact: Fact = {
          id: `synthetic-fact-${s.facts.length}`,
          sourceId,
          excerpt,
          location: `Line ${i + 1}`,
          kind,
          approved: false,
        };
        s.facts.push(fact);
        return fact;
      });
  }
  const achieved = addPendingSource(
    "05-achieved-program-register-2026.txt",
    "2026-01-01",
    "2026-12-31",
    "achieved",
  );
  const goals = addPendingSource(
    "06-approved-goals-plan-2027.txt",
    "2027-01-01",
    "2027-06-30",
    "goal",
  );
  const unsafe = addPendingSource(
    "07-unapproved-unsafe-claims.txt",
    "2026-01-01",
    "2026-12-31",
    "achieved",
  );
  assert.ok([...achieved, ...goals, ...unsafe].every((f) => !f.approved));
  assert.ok(
    fixtureDraft(
      s,
      s.questions.find((q) => q.id === "q3")!,
    ).gaps.length,
  );

  for (const fact of [...achieved, ...goals]) fact.approved = true;
  s.drafts = s.questions.map((q) => fixtureDraft(s, q));
  for (const draft of s.drafts) assert.deepEqual(validateDraft(s, draft), []);
  const q1 = s.drafts.find((d) => d.questionId === "q1")!;
  const q3 = s.drafts.find((d) => d.questionId === "q3")!;
  assert.ok(q1.claims.some((c) => c.text.includes("74 parent workshops")));
  assert.ok(q3.claims.some((c) => c.text.includes("48 caregiver workshops")));
  assert.ok(
    q1.claims.every((c) => !/48 caregiver workshops|99%|10,000/.test(c.text)),
  );
  assert.ok(
    q3.claims.every((c) => !/74 parent workshops|99%|10,000/.test(c.text)),
  );
  assert.ok(
    unsafe.every(
      (f) =>
        !s.drafts.some((d) => d.claims.some((c) => c.factIds.includes(f.id))),
    ),
  );

  const valid = fixture("01-valid-transactions.csv");
  assert.equal(
    importCSV(s, valid).imported,
    expected.valid_csv.first_import_new,
  );
  assert.equal(
    importCSV(s, valid).duplicates,
    expected.valid_csv.second_import_duplicates,
  );
  const invalid = importCSV(
    s,
    fixture("02-invalid-and-duplicate-transactions.csv"),
  );
  assert.deepEqual(
    [invalid.imported, invalid.duplicates, invalid.errors.length],
    [
      expected.invalid_csv.new_imported,
      expected.invalid_csv.duplicates_skipped,
      expected.invalid_csv.row_errors,
    ],
  );
  assert.ok(reviewErrors(s, "g1").some((e) => /unallocated/i.test(e)));
  assert.ok(reviewErrors(s, "g2").some((e) => /unallocated/i.test(e)));
  assert.throws(() => approve(s, "g1", "Fictional reviewer"), /unallocated/i);

  for (const row of expected.allocations)
    allocate(s, row.transactionId, row.grantId, row.category, row.cents);
  assert.throws(
    () => allocate(s, "X107", "g1", "Family coaching", 1),
    /exceeds the transaction amount/i,
  );
  const g1Report = spending(s, "g1");
  const g2Report = spending(s, "g2");
  assert.deepEqual(
    [g1Report.spent, g1Report.balance],
    [
      expected.post_allocation_g1.spent_cents,
      expected.post_allocation_g1.balance_cents,
    ],
  );
  assert.deepEqual(
    [g2Report.spent, g2Report.balance],
    [
      expected.post_allocation_g2.spent_cents,
      expected.post_allocation_g2.balance_cents,
    ],
  );
  assert.deepEqual(reviewErrors(s, "g1"), []);
  assert.deepEqual(reviewErrors(s, "g2"), []);

  const firstApproval = approve(s, "g1", "Fictional reviewer");
  const secondApproval = approve(s, "g2", "Fictional reviewer");
  const db = connect(":memory:");
  try {
    save(db, s);
    let persisted = read(db);
    assert.equal(currentApproval(persisted, "g1")?.id, firstApproval.id);
    assert.equal(currentApproval(persisted, "g2")?.id, secondApproval.id);
    persisted.drafts.find((d) => d.questionId === "q1")!.claims[0].text =
      "Invented 99% success rate.";
    save(db, persisted);
    persisted = read(db);
    assert.equal(currentApproval(persisted, "g1"), undefined);
    assert.equal(currentApproval(persisted, "g2")?.id, secondApproval.id);
    assert.ok(
      persisted.approvals.find((a) => a.id === firstApproval.id)?.invalidatedAt,
    );
    assert.equal(hash(firstApproval.snapshot), firstApproval.hash);
  } finally {
    db.close();
  }
});
