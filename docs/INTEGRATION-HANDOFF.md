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
| `npm test` | 30 passed, 0 failed; 2 server-dependent tests skipped unless their URL variables are set |
| `npm run typecheck` | Passed |
| `npm run test:e2e` | Production build passed; 4 Playwright cases passed across desktop and mobile Chrome |
| Synthetic API smoke with 100-row stress | 11 groups passed against an isolated local server |
| Synthetic period-boundary API check | Passed against an isolated local server |

To reproduce the browser run, install dependencies with `npm ci`, ensure Google Chrome is installed, then run `npm run test:e2e`. The browser runner starts its own loopback server on port 4318, resets its own fictional database before each test, and refuses to reuse an existing server on that port. See [the synthetic pack guide](../fixtures/synthetic/README.md) for the additional API and JSDOM workflows.

## Remaining checks

- Live OpenAI generation has not been exercised with an authorized API key; fixture mode is the verified path.
- Playwright checks browser behavior and dashboard width, but no manual screenshot review or full visual layout assessment has been completed.
- The app still runs on loopback only. No public deployment, funder submission, or real nonprofit data is included.
