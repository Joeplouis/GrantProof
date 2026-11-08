import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setDefaultModelProvider,
  Usage,
  type Model,
  type ModelRequest,
  type ModelResponse,
} from "@openai/agents";
import {
  prepareGrant,
  preparePortfolio,
  grantPortfolio,
} from "../lib/workflow";
import {
  seed,
  fixtureDraft,
  hash,
  workflowHash,
  connect,
  save,
  read,
  approve,
  reviewErrors,
} from "../lib/store";

globalThis.fetch = async () => {
  throw Error("Network disabled in workflow tests");
};
process.env.OPENAI_API_KEY = "offline-placeholder-not-a-credential";
let active: Model;
setDefaultModelProvider({ getModel: () => active });
function response(output: ModelResponse["output"]): ModelResponse {
  return { output, usage: new Usage({ requests: 1 }) };
}
function calls(names: string[]) {
  return response(
    names.map((name) => ({
      type: "function_call" as const,
      callId: name,
      name,
      arguments: "{}",
    })),
  );
}
function final(value: unknown) {
  return response([
    {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: JSON.stringify(value) }],
    },
  ]);
}
function model(step: (request: ModelRequest) => ModelResponse) {
  active = {
    getResponse: async (request) => step(request),
    async *getStreamedResponse() {
      throw Error("Not streaming");
    },
  };
}

test("fixture prepares all missing answers atomically, persists a current receipt, and still needs staff approval", async () => {
  const s = seed(),
    before = hash(s);
  const result = await prepareGrant(s, "g1", false);
  assert.equal(hash(s), before);
  assert.equal(result.receipt.prepared, 2);
  assert.equal(result.receipt.mode, "fixture");
  assert.ok(result.receipt.events.every((event) => !event.tool));
  assert.deepEqual(result.receipt.blockers, []);
  s.drafts = result.drafts;
  s.workflowRuns = [result.receipt];
  assert.equal(result.receipt.workspaceHash, workflowHash(s));
  assert.equal(s.approvals.length, 0);
  const db = connect(":memory:");
  try {
    save(db, s);
    assert.deepEqual(read(db).workflowRuns, s.workflowRuns);
  } finally {
    db.close();
  }
  approve(s, "g1", "Fictional staff reviewer");
  assert.equal(
    result.receipt.workspaceHash,
    workflowHash(s),
    "staff approval alone does not stale the handoff",
  );
});

test("staff-edited answers, pending facts, and allocations are preserved while blockers are handed back", async () => {
  const s = seed();
  const edited = fixtureDraft(s, s.questions[0]);
  edited.claims[0].text = "Unsupported 99% result.";
  s.drafts = [edited];
  s.allocations = s.allocations.filter((a) => a.transactionId !== "T001");
  const before = structuredClone(s);
  const result = await prepareGrant(s, "g1", false);
  assert.deepEqual(s, before);
  assert.deepEqual(
    result.drafts.find((d) => d.id === edited.id),
    edited,
  );
  assert.equal(result.receipt.preserved, 1);
  assert.equal(result.receipt.prepared, 1);
  assert.deepEqual(result.receipt.spending.unallocated, ["T001"]);
  assert.ok(result.receipt.blockers.some((e) => /citation|supported/i.test(e)));
  assert.ok(result.receipt.blockers.some((e) => /unallocated/.test(e)));
  assert.equal(result.receipt.evidence.pending, 0);
  assert.equal(result.receipt.evidence.outside, 2);
  assert.notEqual(result.receipt.workspaceHash, workflowHash(s));
  s.drafts = result.drafts;
  assert.equal(result.receipt.workspaceHash, workflowHash(s));
  s.facts[0].approved = false;
  assert.notEqual(result.receipt.workspaceHash, workflowHash(s));
});

test("live coordinator executes all four tools without approval tools or overwriting existing drafts", async () => {
  const s = seed();
  s.drafts = s.questions
    .filter((q) => q.grantId === "g1")
    .map((q) => fixtureDraft(s, q));
  const before = hash(s);
  let turn = 0;
  model((request) => {
    const names = request.tools.map((tool) => tool.name);
    assert.deepEqual(names, [
      "audit_grant_evidence",
      "audit_grant_spending",
      "prepare_missing_answers",
      "inspect_review_readiness",
    ]);
    turn++;
    if (turn === 1) return calls(names.slice(0, 2));
    if (turn === 2) return calls([names[2], names[2]]);
    if (turn === 3) return calls([names[3]]);
    return final({
      summary: "Ready for staff review, with existing answers preserved.",
    });
  });
  const result = await prepareGrant(s, "g1", true);
  assert.equal(hash(s), before);
  assert.equal(result.receipt.mode, "live");
  assert.equal(
    result.receipt.events.length,
    4,
    "repeated preparation does not run twice",
  );
  assert.equal(result.receipt.prepared, 0);
  assert.deepEqual(result.drafts, s.drafts);
  assert.deepEqual(result.receipt.blockers, []);
});

test("live workflow failure after generating one answer cannot publish a partial package", async () => {
  const s = seed(),
    before = hash(s);
  let coordinatorTurn = 0,
    draftTurn = 0;
  model((request) => {
    if (request.tools.some((t) => t.name === "audit_grant_evidence")) {
      coordinatorTurn++;
      if (coordinatorTurn === 1)
        return calls(["audit_grant_evidence", "audit_grant_spending"]);
      if (coordinatorTurn === 2) return calls(["prepare_missing_answers"]);
      return final({ summary: "Incomplete preparation." });
    }
    draftTurn++;
    if (draftTurn === 1)
      return calls([
        "retrieve_approved_facts",
        "retrieve_requirements",
        "deterministic_spending_validation",
      ]);
    if (draftTurn === 2) return final(fixtureDraft(s, s.questions[0]));
    throw Error("Synthetic second-answer provider failure");
  });
  await assert.rejects(prepareGrant(s, "g1", true));
  assert.equal(hash(s), before);
  assert.equal(s.drafts.length, 0);
  assert.equal(s.approvals.length, 0);
});

test("missing goal evidence stays a blocker; unsupported grant IDs fail without changes", async () => {
  const s = seed(),
    before = hash(s);
  const result = await prepareGrant(s, "g2", false);
  assert.ok(
    result.receipt.blockers.some((message) =>
      /Missing approved evidence/.test(message),
    ),
  );
  assert.ok(result.receipt.spending.unallocated.includes("T004"));
  assert.equal(hash(s), before);
  await assert.rejects(prepareGrant(s, "unknown", false), /Unknown grant/);
  assert.ok(reviewErrors(s, "g2").length);
});

test("portfolio prepares due grants only and keeps independent January, July, and October rules", async () => {
  const s = seed();
  s.grants[0].reportDue = "2026-11-08";
  s.grants[1].reportDue = "2027-07-15";
  s.grants.push({
    ...structuredClone(s.grants[1]),
    id: "g3",
    name: "October grant",
    start: "2026-10-01",
    end: "2027-09-30",
    reportDue: "2026-11-09",
  });
  s.questions.push({ ...s.questions[2], id: "q4", grantId: "g3", limit: 250 });
  s.grants[0].categories["Family coaching"] = 1500000;
  assert.equal(grantPortfolio(s, "2026-11-08")[0].risks[0].risk, "Near limit");
  const before = hash(s);
  const due = await preparePortfolio(s, "2026-11-08", "due", false);
  assert.equal(due.count, 1);
  assert.deepEqual(
    due.drafts.map((d) => d.questionId),
    ["q1", "q2"],
  );
  assert.equal(hash(s), before);
  const all = await preparePortfolio(s, "2026-11-08", "all", false);
  assert.equal(all.count, 3);
  assert.deepEqual(
    all.drafts.map((d) => d.questionId),
    ["q1", "q2", "q3", "q4"],
  );
  assert.equal(all.workflowRuns.length, 3);
  const prepared = { ...s, drafts: all.drafts, workflowRuns: all.workflowRuns };
  assert.ok(
    all.workflowRuns.every(
      (run) => run.workspaceHash === workflowHash(prepared),
    ),
  );
  assert.equal(prepared.approvals.length, 0);
  await assert.rejects(
    preparePortfolio(s, "2026-11-07", "due", false),
    /No reports are due/,
  );
  await assert.rejects(
    preparePortfolio(s, "invalid", "all", false),
    /valid planning date/,
  );
});
