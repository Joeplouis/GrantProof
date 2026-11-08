import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContext,
  deterministicAnswer,
  validateAnswer,
} from "../lib/assistant";
import { seed } from "../lib/store";

test("assistant answers grant money from the seeded database", () => {
  const answer = deterministicAnswer(
    seed(),
    "How much of Family Futures 2026 is left?",
  );
  assert.match(answer, /\$33,800\.00/);
  assert.match(answer, /\$16,200\.00/);
});

test("assistant lists approved evidence and names unapproved facts", () => {
  const answer = deterministicAnswer(seed(), "Which facts are approved evidence?");
  assert.match(answer, /120 families/);
  assert.match(answer, /Not approved/);
});

test("assistant explains the goals gap from unapproved goal facts", () => {
  const answer = deterministicAnswer(
    seed(),
    "Why did the goals question return a gap?",
  );
  assert.match(answer, /not approved/i);
  assert.match(answer, /150 families/);
});

test("assistant refuses to invent answers outside the workspace", () => {
  const answer = deterministicAnswer(seed(), "What is the CEO's salary?");
  assert.match(answer, /isn't in this workspace/);
});

test("validator accepts answers whose figures all exist in the database", () => {
  const good =
    "Family Futures 2026 has $33,800.00 remaining of its $50,000.00 budget, with $16,200.00 spent. Family coaching: $12,000.00 spent of $30,000.00.";
  assert.equal(validateAnswer(seed(), good), true);
});

test("validator rejects invented category figures (browser-run regression)", () => {
  const invented =
    "Family coaching: $15,150.00 remaining ($19,850.00 spent of $35,000.00). Family activities: $6,650.00 remaining ($8,350.00 spent).";
  assert.equal(validateAnswer(seed(), invented), false);
});

test("validator rejects renamed categories even when figures are right", () => {
  const renamed =
    "By category:\n- Program delivery: $18,000.00 remaining ($12,000.00 spent of $30,000.00)\n- Family activities: $7,600.00 remaining ($2,400.00 spent of $10,000.00)";
  assert.equal(validateAnswer(seed(), renamed), false);
});

test("validator rejects computed day counts and invented percentages", () => {
  assert.equal(
    validateAnswer(seed(), "Only 54 of 365 progress days remain."),
    false,
  );
  assert.equal(validateAnswer(seed(), "About 67% of the budget is left."), false);
});

test("validator accepts percentages quoted from the data itself", () => {
  assert.equal(
    validateAnswer(
      seed(),
      "One source text says: “A preliminary estimate suggests a 92% success rate.” It is not approved evidence.",
    ),
    true,
  );
});

test("assistant context carries the full workspace for the live model", () => {
  const ctx = buildContext(seed());
  assert.equal(ctx.facts.length, 4);
  assert.equal(ctx.grants.length, 2);
  assert.equal(ctx.grants[0].remaining, "$33,800.00");
  assert.ok(ctx.transactions.length >= 4);
  assert.ok(ctx.sources.length >= 2);
});
