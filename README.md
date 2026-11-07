# GrantProof

**Every claim has evidence. Every grant dollar reconciles.**

A local-first hackathon app for the fictional Tidepath Family Alliance. Four integrated workspaces connect staff-approved evidence, sourced application answers, QuickBooks-style CSV spending, and a versioned approval/export package.

## Run on this Mac Studio

Requires Node.js 22+ and npm. No cloud services or API key are required for fixture mode.

```sh
cd /Users/git/Desktop/GrantProof
npm ci
npm run reset
npm run dev
```

Open [GrantProof locally](http://127.0.0.1:4317). It binds **127.0.0.1 only**. A URL on the Mac Studio is not a remote preview for Miami; no tunnel, public deployment, or remote access was created. Do not expose this unauthenticated prototype to the network.

For the production build:

```sh
npm run build
npm start
```

Stop the dev server before `npm start`; both use port 4317. Reset only this fictional workspace with `npm run reset`. The ignored SQLite database lives in `data/grantproof.sqlite`. Reset replaces its demo records and approvals. Avoid resetting while another person is editing the demo.

## What works

- **Evidence library:** upload `.txt`/`.md` or paste text; each nonempty line becomes a pending candidate with source, line location, applicable period, and achieved/goal classification. Staff approve or revoke each fact. Pending facts never enter generated answers.
- **Application:** generate per-question answers within word limits; exact approved excerpts carry clickable fact references. Missing evidence is shown instead of an invented statistic. Edit creates a new version and unsupported wording blocks approval.
- **Spending:** import `id,date,payee,amount` CSV; report malformed rows and duplicate skips; allocate cents across grants without exceeding an expense; exclude dates outside each funder's inclusive period; show category budget, spent, balance, and near/over-budget status.
- **Review/export:** approve the exact application, relevant evidence, ledger, and report snapshot; edits, evidence changes, or relevant financial changes invalidate eligibility. Download the approved HTML report or JSON audit package. HTML can be printed to PDF in a browser. No automatic delivery or funder submission.
- **Second period:** the Bridge Fund uses July 1, 2026–June 30, 2027. Its goal begins pending, so generation first shows an evidence gap. Approve the goal and allocate T004 to demonstrate the different period.

## Honest generation modes

**Deterministic fixture** is the default and the verified mode. It retrieves approved facts matching period/type/question requirements and assembles their exact excerpts. The records are already written as natural sentences; no free paraphrasing is allowed in this prototype.

The optional **OpenAI Agents SDK** path runs server-side with three explicit read-only tools: approved facts, grant requirements, deterministic spending/validation. It uses structured output, a five-turn cap, a 45-second timeout, checks that all tools ran, and validates citations, exact excerpts, approval status, period, fact type and word limits in code. It cannot approve, export, submit, access files, or follow imported document instructions. SDK tracing is disabled. This is evidence validation, not a mathematical proof of factuality.

No authorized API-key setup tool or environment credential was available during this build. No unrelated project's credentials were searched or copied. To opt into live AI, the owner can put a key in ignored `.env.local` using `.env.example` as the variable guide, restart the server, and enable the mode in Application. `OPENAI_MODEL` is configurable; default `gpt-4.1-mini`. Live AI has **not** been verified and should not be presented as verified at the demo. No cost claim is made.

## Demo fixtures and exact totals

All names, records, transactions and organizations are fictional. The CSV represents a QuickBooks-style export; there is **no direct QuickBooks integration**.

| Grant / category                |         Budget |       Spending |      Remaining |
| ------------------------------- | -------------: | -------------: | -------------: |
| Family Futures — coaching       |     $30,000.00 |     $12,000.00 |     $18,000.00 |
| Family Futures — supplies       |     $10,000.00 |      $2,400.00 |      $7,600.00 |
| Family Futures — administration |     $10,000.00 |      $1,800.00 |      $8,200.00 |
| **Family Futures total**        | **$50,000.00** | **$16,200.00** | **$33,800.00** |
| Bridge Fund initial total       |     $25,000.00 |          $0.00 |     $25,000.00 |

T001 is on the first inclusive day, T003 on the final inclusive day. T004 ($900 on January 1, 2027) is outside Family Futures and inside Bridge Fund. After allocating T004 to Bridge Fund administration, that grant spends $900 and has $24,100 remaining. Reimporting `fixtures/quickbooks-sample.csv` adds zero records and reports four duplicate skips. `fixtures/import-errors.csv` yields one valid $100 record, one duplicate skip, and two rejected rows; allocate the valid record before approving the affected period.

## Checks

```sh
npm test
npm run typecheck
npm run build
# On a freshly reset, running fixture server (mutates fictional data):
npm run qa:runtime
# UI component interactions against that running server; start from reset:
npm run qa:ui
# Restore the clean demo afterward:
npm run reset
```

See [acceptance evidence](docs/ACCEPTANCE.md), [architecture and contracts](docs/ARCHITECTURE.md), and the [three-minute demo and submission checklist](docs/DEMO.md). Browser visual QA and live AI remain explicitly separate from fixture/API/component checks.

## Scope and limitations

Single-user local prototype, with an optimistic concurrency check around live generation. SQLite has relational foreign keys and integer constraints, but state is saved as one small transactional workspace; this is not a scalable multi-tenant database design. There is no identity system, production access, OCR/PDF/DOCX parsing, live accounting sync, real donor/client data, cloud deployment, or autonomous submission. Staff review records for accuracy: an approved source can itself contain an error. Duplicate fingerprint checks intentionally err toward flagging/skipping matching date/payee/amount rows; legitimate identical expenses need staff reconciliation before adding them with corrected source data.
