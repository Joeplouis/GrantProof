// Opt-in provider check. Not included by npm test; uses fictional in-memory data.
import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { generate } from "../lib/agent";
import { seed, hash, validateDraft, fixtureDraft, approve } from "../lib/store";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.GRANTPROOF_ALLOW_LIVE_CHECK !== "1")
    throw Error(
      "Live check not authorized. Set GRANTPROOF_ALLOW_LIVE_CHECK=1 only after authorizing one paid synthetic generation.",
    );
  if (!process.env.OPENAI_API_KEY)
    throw Error(
      "Configure OPENAI_API_KEY privately in .env.local or the process environment. Do not paste it into chat.",
    );
  const state = seed(),
    original = hash(state);
  const question = state.questions.find((question) => question.id === "q1")!;
  const draft = await generate(state, question, true);
  assert.equal(
    hash(state),
    original,
    "generation changed the source workspace",
  );
  assert.deepEqual(
    validateDraft(state, draft),
    [],
    "live output failed deterministic validation",
  );
  assert.ok(
    draft.claims.length > 0,
    "the approved seed evidence should produce at least one claim",
  );
  state.drafts = [
    draft,
    fixtureDraft(
      state,
      state.questions.find((question) => question.id === "q2")!,
    ),
  ];
  approve(state, "g1", "Fictional live-check reviewer");
  assert.equal(state.approvals.length, 1);
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        verifiedAt: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        mode: draft.mode,
        questionId: question.id,
        claimCount: draft.claims.length,
        gapCount: draft.gaps.length,
        validationErrors: [],
        approvalHash: state.approvals[0].hash,
        data: "fictional in-memory seed only",
        persistence: "none",
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  // Provider errors can carry request metadata; report only the safe category.
  const local =
    error instanceof assert.AssertionError ||
    (error instanceof Error &&
      /^(Live check not authorized|Configure OPENAI_API_KEY)/.test(
        error.message,
      ));
  console.error(
    local && error instanceof Error
      ? error.message
      : "Live agent check failed; no approval receipt was produced.",
  );
  process.exitCode = 1;
});
