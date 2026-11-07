# Acceptance evidence — November 7, 2026

Fictional demo data only. No production records, submissions, deployments or messages.

| Check                                          | Evidence / status                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unsupported statistic becomes an evidence gap  | PASS — core test 1, pending 92% statistic excluded.                                                                                                                                                    |
| Unapproved fact excluded                       | PASS — core tests 1–2; runtime import injection line remains pending.                                                                                                                                  |
| Achieved outcomes separate from goals          | PASS — core test 2 and fiscal-period runtime scenario.                                                                                                                                                 |
| Word limit                                     | PASS — core test 3; full factual excerpts are not truncated into misleading partial claims.                                                                                                            |
| Citation referential integrity                 | PASS — core tests 4 and 15 check IDs, exact excerpt, approval, period, type, and extra unrelated citations.                                                                                            |
| Repeat CSV import                              | PASS — core test 5 and runtime check: zero imported, four duplicate skips.                                                                                                                             |
| Malformed rows                                 | PASS — core test 6: invalid calendar date, negative amount, unclosed quote; quoted comma parses.                                                                                                       |
| Inclusive funder boundaries                    | PASS — core test 7: Jan 1 and Dec 31 count; next Jan 1 excluded from g1 but included in July–June g2.                                                                                                  |
| Cross-grant over-allocation                    | PASS — core test 8; runtime API rejects one cent over an already allocated transaction.                                                                                                                |
| Category/report reconciliation                 | PASS — core test 9: g1 $16,200 spent; $33,800 balance; category totals sum exactly.                                                                                                                    |
| Editing invalidates approval                   | PASS — core tests 10–11; runtime and component flows verify export lock after unsupported edit.                                                                                                        |
| Unallocated / over-budget blocks               | PASS — core test 12 and new in-period transaction in test 15.                                                                                                                                          |
| Approved snapshot is immutable                 | PASS — core test 10; stored snapshot copy/hash unchanged by live draft edits.                                                                                                                          |
| Exact approved export                          | PASS — runtime JSON deep equality to stored snapshot; HTML uses the same values/hash.                                                                                                                  |
| Pending evidence excluded from export appendix | PASS — core test 14; 92% pending estimate absent; HTML escapes staff/source text.                                                                                                                      |
| Production server restart                      | PASS — all eight entity collections deep-equal before dev shutdown and after `npm start`; final runtime suite also passed against production.                                                          |
| SQLite relational persistence                  | PASS — core test 13 closes/reopens an on-disk DB, preserves all entities, rejects dangling Source FK.                                                                                                  |
| Four integrated React screens                  | PASS — `qa:ui` JSDOM test uses the real running API, clicks generation/citations/navigation/approval, checks spending and download links, edits a claim, confirms approval disabled and export absent. |
| TypeScript / production build                  | PASS — `npm run typecheck`; `npm run build` (Next.js 16.4.5).                                                                                                                                          |
| Real-browser functional QA                     | PASS on the integration branch — Playwright desktop/mobile Chrome runs synthetic source and CSV imports, evidence and drafts, real HTML/JSON downloads, approval invalidation, keyboard layout persistence, and a two-session stale-export check. |
| Screenshot visual QA | PASS — Codex inspected desktop, Pixel 7, and compact-phone screen/dialog captures; corrected mobile money layout. See [visual QA](VISUAL-QA.md). Physical devices and Safari remain untested. |
| Live OpenAI generation                         | **NOT VERIFIED** — no authorized API credential or credential-setup tool available. Fixture output is labeled; live path typechecks but has not called the API.                                        |
| Actual submission-tab deliverable fields       | **NOT VERIFIED** — official URL returned a client-rendered shell; browser unavailable. See demo checklist.                                                                                             |

## Reproduce

On a reset fixture server:

```sh
npm test
npm run typecheck
npm run build
npm run reset
npm run dev
# Separate terminal:
npm run qa:runtime
npm run reset
npm run qa:ui
npm run reset
npm run test:e2e  # production build + isolated desktop/mobile Chrome checks
```

Core tests are in `tests/core.test.ts`; React integration in `tests/ui.test.tsx`; runtime API assertions in `scripts/runtime-check.mjs`. Runtime/component checks intentionally change only the fictional workspace. Do not run both at once; reset between them.

Playwright now verifies browser focus behavior, downloads, and dashboard width on desktop and mobile Chrome using an isolated fictional database. JSDOM remains the component-level check; screenshot inspection is documented in [visual QA](VISUAL-QA.md). Live AI testing remains a separate handoff check.
