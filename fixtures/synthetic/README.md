# GrantProof — synthetic test pack

**All people, organizations, invoices, program results, and transactions here are fictional.** Designed for `gitdot5/GrantProof` on branch `codex/grantproof-mvp`, based on its November 7, 2026 public API contract. Use an isolated/local demo environment, **never a real nonprofit workspace**.

## What is included

| File | What it checks | Expected result |
| --- | --- | --- |
| `01-valid-transactions.csv` | Valid imports, quoted commas, two grants, split allocations | 7 new imports; on repeat, 0 new and 7 duplicates |
| `02-invalid-and-duplicate-transactions.csv` | Bad calendar dates, negatives, bad decimals, missing payee, conflicting ID, duplicates | 0 new; 5 row errors; 2 duplicates skipped |
| `03-period-boundary-transactions.csv` | Inclusive grant boundaries and out-of-period expenses | B101 in g1; B102 in both; B103–B104 in g2; B105 outside both |
| `04-stress-100-transactions.csv` | Bulk import and repeat import | 100 new; retry 100 duplicates; must block approval until allocated |
| `05-achieved-program-register-2026.txt` | Exact achieved-fact citation and 2026 source period | Import all 3 pending; approve manually; regenerate q1, q2 |
| `06-approved-goals-plan-2027.txt` | Goals are different from accomplishments; future funder period | Import both pending; approve as goals; regenerate q3 |
| `07-unapproved-unsafe-claims.txt` | Unapproved estimate and prompt-injection text | Leave both pending; neither can appear in generated claims |
| `expected-results.json` | Machine-readable amounts, source periods, and allocation map | Totals below |
| `run-api-smoke-test.mjs` | Real HTTP requests against running GrantProof | 10 end-to-end test groups, 11 with the optional 100-row stress |

## Expected amounts after test allocations

Seed includes Grant g1 with $50,000 budget and $16,200 spending, and Grant g2 with $25,000 budget and no allocated spending. It also includes a $900 `T004` transaction dated January 1, 2027, which must be allocated to g2 before approving its report.

| Grant | New allocated in pack | Final spending | Final remaining |
| --- | ---: | ---: | ---: |
| g1 — Family Futures 2026 | $3,525.55 | **$19,725.55** | **$30,274.45** |
| g2 — Bridge Fund | $3,025.44 (includes seeded T004) | **$3,025.44** | **$21,974.56** |

`X107` is deliberately split: **$700 to g1 coaching + $500 to g2 coaching = $1,200**; another cent allocated to either grant must fail. `X105` dated Feb 11, 2027 must be rejected if allocated to g1. All amounts use integer cents in API requests.

## Automated test — against the actual app

1. Save or extract this pack somewhere on the machine running GrantProof (or where it can reach a locally running GrantProof server).
2. In the **GrantProof repo**, install and start the app using **two terminals**:

   ```bash
   npm ci
   npm run reset
   npm run dev
   ```

3. In the **second terminal**, in the extracted test-pack folder, run:

   ```bash
   node run-api-smoke-test.mjs
   ```

4. To include the 100-row stress import, start with a reset and run:

   ```bash
   GRANTPROOF_STRESS=1 node run-api-smoke-test.mjs
   ```

5. In the app repo, restore the clean fixture after any test run:

   ```bash
   npm run reset
   ```

**Important:** `run-api-smoke-test.mjs` writes to the fictional local workspace via the actual `/api/workspace` endpoint. It assumes a freshly reset workspace and may fail if you start it in a modified workspace. Do not run it against a public/production server. The app's URL defaults to `http://127.0.0.1:4317`; for a separately authorized local test server set `GRANTPROOF_URL=http://host:port`.

## Manual visual test (screens)

On a clean reset, open the four app workspaces and follow these steps:

1. **Sources & Facts:** paste `05-achieved-program-register-2026.txt` with dates `2026-01-01` to `2026-12-31`; confirm three pending candidates. Approve them. Paste `07-unapproved-unsafe-claims.txt` with the same dates but **do not approve** either line.
2. **Drafts:** generate q1 and q2 in fixture mode. Confirm q2 includes **action plans**. Check that the unapproved 99% claim and instruction-injection text are not used. Import goal document `06-approved-goals-plan-2027.txt` for `2027-01-01`–`2027-06-30`. Before approving its facts, q3 must show a gap; approve them and regenerate, then q3 must use only goal statements.
3. **Spending:** import `01-valid-transactions.csv`; verify seven rows. Repeat import and verify seven duplicate skips. Allocate transaction amounts exactly as in `expected-results.json` (the `allocations` array). Grant g1 must show **$19,725.55 spent / $30,274.45 remaining** and g2 **$3,025.44 spent / $21,974.56 remaining**. Verify grant-category figures and cents. Import `02-invalid-and-duplicate-transactions.csv`, review five errors and two duplicates.
4. **Approve & Export:** approve g1 and g2 using a fictional reviewer name. Download g1 report HTML and JSON and compare spending and hash. Edit q1 to unsupported wording, then verify that g1 export is blocked (HTTP 409) while g2 approval remains valid.
5. **Boundary test (separate reset):** import `03-period-boundary-transactions.csv`; allocate B101 to g1, B103/B104 to g2; allocating B105 to either grant must fail because it is outside both. B102 is within both but cannot be allocated more than its total across them.
6. **Stress test (separate reset):** import `04-stress-100-transactions.csv` twice. First imports 100 rows, repeat imports 0 and skips 100 duplicates. Approval must stay blocked while those in-period expenses remain unallocated. Run `npm run reset` when finished.

## Limits and honesty

This pack is prepared and checked **offline** for file structure, unique IDs, valid dates and expected totals. It is **not proof that the app passes until the script runs against a running GrantProof instance**. The smoke test uses fixture generation; a real OpenAI Agents SDK call still needs separate testing with an authorized API key. Visual browser responsiveness, accessibility, login, and deployment are separate acceptance steps.

## Verified local execution — November 7, 2026

The fixture API pack has now passed against an isolated combined Part 1/Part 2 production build: 11 scenario groups with the 100-row stress case, including an explicit approval block while stress rows remain unallocated. All five records in `03-period-boundary-transactions.csv` were also checked through the API with `node tests/synthetic-boundaries-api.mjs` from the repo root. The combined engine/UI suite passed all 30 tests, with no skips. See [the verification receipt](verification-2026-11-07.json) for code revisions, exact totals and limits. These results use fictional fixture generation; live AI and native visual browser QA remain unverified.
