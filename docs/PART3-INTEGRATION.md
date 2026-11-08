# Part 3 status and compatibility — November 7, 2026

**Latest update — November 8:** The full live browser journey now passes with all three parts connected: source/fact review, two real AI generations, CSV allocation, saved dashboard order, approval, HTML/JSON downloads, reload persistence, and blocked export after an unsupported edit. See [live browser acceptance](LIVE-BROWSER-QA.md) and its receipt. The records below describe the preceding module-level and offline checks.

**Update — November 8:** The authorized live SDK check passed at 9:16 a.m. Eastern on revision `c8b7f18`, using `gpt-4.1-mini`. It returned two claims, zero gaps, and zero deterministic validation errors; the resulting draft passed the Part 2 approval seal check with a fixture answer for the second question. The generator's all-three-tools requirement also passed. See the [live receipt](qa/2026-11-08/live-agent-receipt.json). This verifies one real model generation and its engine compatibility; it does not claim broad model reliability or a live UI/API browser journey. The previous checks below are retained as the November 7 record.

GitHub was checked after fetching the repository. Joe (`Joeplouis`) committed the Part 3 problem-first README, demo script, and run instructions in `8806a9e`. That commit is already an ancestor of `codex/part1-part2-integration`. His later `074e422` synthetic data pack is also included. No `part3-agent` branch, separate Part 3 PR, or repository fork was published at the time of this check. The existing AI/API implementation is already in the combined branch; no newer Joe-authored implementation was found.

| Part 3 acceptance item | Evidence |
| --- | --- |
| Fixture claims are approved excerpts; unsupported questions show gaps | Passed in the existing combined browser journey and the additional Part 3 checks. The UI shows a goal gap before approval, then the exact approved goal with its fact ID after approval. |
| Export is blocked before approval and sealed afterward | Passed in the desktop/mobile combined browser journey, including actual HTML/JSON downloads and stale-session rejection after evidence revocation. |
| Missing live credentials fail safely | Two additional browser cases passed, desktop and mobile. A live request without a key returns 400 and an explicit unavailable message; the full workspace, current approval, and sealed export remain unchanged. No live provider call occurs. |
| README problem statement, run instructions, demo script | Present in Joe's committed README and included in the combined branch. |
| Live generation calls all three tools and passes deterministic validation | **Not verified by a live run.** Code contains the tool-call requirement, structured output, and `validateDraft` check, but no successful provider execution evidence was found. |

The additional checks are in `e2e/part3-contract.spec.ts`; both passed against the production build used for the completed visual review. `npm run typecheck` passed. The preceding seven browser tests, 33 engine/component checks, production build, and screenshot review are documented in [visual QA](VISUAL-QA.md). No Part 3 source file or README was changed during this compatibility check.

Reproduce the additional checks with installed dependencies and Google Chrome:

```sh
npm run build
./node_modules/.bin/playwright test e2e/part3-contract.spec.ts --project desktop-chrome --project mobile-chrome
```

The runner uses only fictional data in `data/playwright.sqlite`, a loopback server, and an empty API-key environment. Fixture-mode compatibility is verified; Part 3 cannot be called fully accepted until the live-generation criterion has execution evidence.

## Offline SDK checks and prepared live check

`tests/agent-runtime.test.ts` runs the installed Agents SDK with a scripted model provider, the actual three application tools, and the actual Part 2 validator/approval engine. Its six checks passed: correct tool results and valid output; omitted spending tool rejected; invented/unapproved claims block approval; malformed structured output rejected; repeated tool calls stop after five turns; and provider failure leaves the caller's workspace unchanged. Network access is disabled in that test process. These checks exercise orchestration and deterministic safeguards; they do not establish real model behavior or provider availability. Model-provider configuration is described in the [official OpenAI documentation](https://developers.openai.com/api/docs/guides/agents/models).

After adding those checks, `npm test` passed 36 engine/SDK/acceptance tests and 3 standalone component checks, with the same two server-dependent JSDOM tests skipped by default. Typecheck passed. The live-check opt-in refusal was also verified.

The remaining provider check is prepared in `tests/live-agent-check.ts`. It generates one answer from fictional in-memory seed data, runs `validateDraft`, verifies that generation preserved the input, and tests approval with a fixture answer for the second question. It prints a small acceptance receipt, never an API key, and does not write to SQLite. The existing generator limits the agent loop to five turns with a 45-second signal; this is not a dollar spending cap.

Run only after authorizing API usage and privately configuring `OPENAI_API_KEY` in `.env.local` or the environment:

```sh
GRANTPROOF_ALLOW_LIVE_CHECK=1 node --import tsx tests/live-agent-check.ts
```

Without the explicit opt-in, the script refuses before attempting generation. No live call has been made during this work; the application's key-presence check returned false.
