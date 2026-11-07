# Part 1 + Part 2 integration handoff

- **Branch:** `codex/part1-part2-integration`
- **Base:** `codex/grantproof-mvp` at `074e422` (includes the fictional synthetic data pack)
- **Merged in order:** `part2-engine` at `2f3f2d9`, then `part1-ui` at `1f5dd3b`. Both source branches remain intact.

This branch combines the latest screens, engine, and synthetic fixtures for full-system testing. It does not merge into `codex/grantproof-mvp` or `main` by itself.

## What changed

- **Part 1 screens:** A moveable dashboard with saved order, keyboard and touch controls; evidence search, status and grant-period cues; source-file preview and import errors; dialog focus handling; clearer recovery from failed loads; and refreshed remaining cents after a partial allocation. The four-screen workflow remains Sources & Facts → Drafts → Spending → Review & Export.
- **Part 2 engine:** Strict CSV parsing and duplicate handling; category and cross-grant allocation checks; exact integer-cent totals and budget thresholds; invalid-ledger approval blockers; and permanent approval invalidation after evidence or financial changes. `Approval.invalidatedAt` records an invalidated seal without changing the stored approved snapshot.
- **Combined checks:** Part 1 component tests, Part 2 accounting and API regressions, a synthetic problem-acceptance test that runs in `npm test`, and a synthetic UI/API test against a running local server. The original `fixtures/synthetic/expected-results.json` remains the source of expected two-grant totals.
- **Real-browser checks added here:** `npm run test:e2e` builds the production app and runs Playwright in desktop Chrome and emulated Pixel 7 Chrome. It tests synthetic text/CSV file imports, approved versus pending evidence, generated citations, reconciled balances, actual JSON/HTML downloads, export locking after an edit, keyboard dashboard order after reload, and a stale export attempted from one session after another revokes evidence. The tests reset only ignored `data/playwright.sqlite` and run one worker to keep cases isolated.

## Verified on this branch

| Check | Result |
| --- | --- |
| `npm test` | 33 passed (30 engine/acceptance + 3 component), 0 failed; 2 server-dependent tests skipped unless their URL variables are set |
| `npm run typecheck` | Passed |
| `npm run test:e2e` | Production build passed; 7 Playwright cases passed across desktop, Pixel 7, and compact-phone Chrome |
| Synthetic API smoke with 100-row stress | 11 groups passed against an isolated local server |
| Synthetic period-boundary API check | Passed against an isolated local server |

To reproduce the browser run, install dependencies with `npm ci`, ensure Google Chrome is installed, then run `npm run test:e2e`. The browser runner starts its own loopback server on port 4318, resets its own fictional database before each test, and refuses to reuse an existing server on that port. See [the synthetic pack guide](../fixtures/synthetic/README.md) for the additional API and JSDOM workflows.

## Remaining checks

Part 3's README is already included. Its fixture/API compatibility and two additional browser checks are recorded in [the Part 3 integration status](PART3-INTEGRATION.md); live-generation acceptance remains unverified.

- Live OpenAI generation has not been exercised with an authorized API key; fixture mode is the verified path.
- Chromium screenshot inspection is complete at desktop, Pixel 7, and compact-phone sizes. See [visual QA](VISUAL-QA.md) for the mobile layout fix, screenshots, and seven passing browser checks. Physical-device and Safari checks remain outside this review.
- The app still runs on loopback only. No public deployment, funder submission, or real nonprofit data is included.

## Part 1 completion check

The dashboard now cancels a keyboard move when its handle loses focus, preserving the saved order and clearing the picked-up state. Its regression test failed before the fix and passes afterward. Mouse drop, touch events, keyboard placement/cancellation, saved order, reset, and unavailable-storage recovery remain covered by component tests.

`npm test` now includes the three standalone Part 1 component checks (dashboard, dialog focus, and error/evidence recovery). On this revision, 30 engine/acceptance tests and all three component checks passed. The two server-dependent tests were then run separately against a fresh fictional production server on loopback port 4320, resetting between them; both passed without skips. Production build and typecheck also passed. The later [visual QA pass](VISUAL-QA.md) reran the combined browser workflow and inspected screenshots after the focus fix and mobile layout improvement. Live AI remains unverified.

To rerun the combined UI/API checks, start a production server with an isolated `GRANTPROOF_DB`, then run these separately, resetting that same fictional database between runs:

```sh
GRANTPROOF_INTEGRATION_URL=http://127.0.0.1:4320 node --import tsx --test tests/part1-part2.test.ts
GRANTPROOF_SYNTHETIC_URL=http://127.0.0.1:4320 node --import tsx --test tests/synthetic-flow.test.ts
```
