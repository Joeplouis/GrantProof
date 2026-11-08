import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setDefaultModelProvider,
  Usage,
  type Model,
  type ModelRequest,
  type ModelResponse,
} from "@openai/agents";
import { generate } from "../lib/agent";
import { seed, validateDraft, fixtureDraft, approve, hash } from "../lib/store";

// Real SDK orchestration and real application tools, scripted model output only.
// This file runs in its own test process. Any attempted network call fails.
globalThis.fetch = async () => {
  throw Error("Network disabled in offline agent tests");
};
process.env.OPENAI_API_KEY = "offline-test-placeholder-not-a-credential";
const names = [
  "retrieve_approved_facts",
  "retrieve_requirements",
  "deterministic_spending_validation",
];
let activeModel: Model;
setDefaultModelProvider({ getModel: () => activeModel });

function response(output: ModelResponse["output"]): ModelResponse {
  return { output, usage: new Usage({ requests: 1 }) };
}
function calls(selected = names): ModelResponse {
  return response(
    selected.map((name) => ({
      type: "function_call",
      callId: name,
      name,
      arguments: "{}",
    })),
  );
}
function final(value: unknown): ModelResponse {
  return response([
    {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: JSON.stringify(value) }],
    },
  ]);
}
function model(step: (request: ModelRequest, index: number) => ModelResponse) {
  const requests: ModelRequest[] = [];
  const scripted: Model = {
    getResponse: async (request) => {
      requests.push(request);
      return step(request, requests.length - 1);
    },
    async *getStreamedResponse() {
      throw Error("Streaming is not used by this app");
    },
  };
  activeModel = scripted;
  return requests;
}

test("real SDK executes all three application tools and validates their structured answer offline", async () => {
  const s = seed(),
    before = hash(s);
  const q = s.questions.find((q) => q.id === "q1")!;
  const expected = fixtureDraft(s, q);
  const requests = model((_request, index) =>
    index === 0 ? calls() : final({ claims: expected.claims, gaps: [] }),
  );
  const draft = await generate(s, q, true);
  assert.equal(requests.length, 2);
  const input = requests[1].input;
  assert.ok(Array.isArray(input));
  const results = input.filter((item) => item.type === "function_call_result");
  assert.equal(results.length, 3);
  const contents = (name: string) => {
    const item = results.find((item) => item.name === name)!;
    const output = item.output;
    const text =
      typeof output === "string"
        ? output
        : !Array.isArray(output) && "text" in output
          ? output.text
          : undefined;
    assert.ok(typeof text === "string", "tool result contains JSON text");
    return JSON.parse(text);
  };
  assert.deepEqual(
    contents(names[0]).map((fact: { id: string }) => fact.id),
    ["f1", "f2"],
  );
  assert.equal(contents(names[1]).question.id, "q1");
  assert.equal(contents(names[2]).report.spent, 1620000);
  assert.equal(contents(names[2]).report.balance, 3380000);
  assert.deepEqual(draft.claims, expected.claims);
  assert.deepEqual(validateDraft(s, draft), []);
  assert.equal(
    hash(s),
    before,
    "generation must not mutate the caller's workspace",
  );
  s.drafts = [
    draft,
    fixtureDraft(
      s,
      s.questions.find((q) => q.id === "q2")!,
    ),
  ];
  approve(s, "g1", "Fictional offline reviewer");
  assert.equal(s.approvals.length, 1);
});

test("SDK final output without the spending tool is rejected without changing workspace state", async () => {
  const s = seed(),
    before = hash(s),
    q = s.questions[0];
  const expected = fixtureDraft(s, q);
  model((_request, index) =>
    index === 0 ? calls(names.slice(0, 2)) : final(expected),
  );
  await assert.rejects(generate(s, q, true), /all required retrieval tools/);
  assert.equal(hash(s), before);
});

test("hallucinated and unapproved model claims cannot cross the engine approval boundary", async () => {
  const s = seed(),
    q = s.questions[0];
  model((_request, index) =>
    index === 0
      ? calls()
      : final({
          claims: [
            { text: "Invented 99% success.", factIds: ["f1"] },
            {
              text: s.facts.find((fact) => fact.id === "f4")!.excerpt,
              factIds: ["f4"],
            },
          ],
          gaps: [],
        }),
  );
  const draft = await generate(s, q, true);
  assert.ok(draft.gaps.length > 0);
  assert.ok(validateDraft(s, draft).length > 0);
  s.drafts = [draft, fixtureDraft(s, s.questions[1])];
  assert.throws(() => approve(s, "g1", "Fictional offline reviewer"));
  assert.equal(s.approvals.length, 0);
});

test("malformed model output fails SDK structured-output parsing", async () => {
  const s = seed(),
    before = hash(s);
  model((_request, index) =>
    index === 0 ? calls() : final({ claims: "not-an-array", gaps: [] }),
  );
  await assert.rejects(generate(s, s.questions[0], true));
  assert.equal(hash(s), before);
});

test("a tool loop stops at the configured five-turn limit without saving a draft", async () => {
  const s = seed(),
    before = hash(s);
  const requests = model(() => calls());
  await assert.rejects(generate(s, s.questions[0], true), /turn/i);
  assert.equal(requests.length, 5);
  assert.equal(hash(s), before);
});

test("provider failure propagates without changing evidence, money, or approvals", async () => {
  const s = seed(),
    before = hash(s);
  model(() => {
    throw Error("Synthetic provider failure");
  });
  await assert.rejects(
    generate(s, s.questions[0], true),
    /Synthetic provider failure/,
  );
  assert.equal(hash(s), before);
});
