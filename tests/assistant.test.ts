import test from "node:test";
import assert from "node:assert/strict";
import { buildContext, deterministicAnswer } from "../lib/assistant";
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

test("assistant context carries the full workspace for the live model", () => {
  const ctx = buildContext(seed());
  assert.equal(ctx.facts.length, 4);
  assert.equal(ctx.grants.length, 2);
  assert.equal(ctx.grants[0].remaining, "$33,800.00");
  assert.ok(ctx.transactions.length >= 4);
  assert.ok(ctx.sources.length >= 2);
});
