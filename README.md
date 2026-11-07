# GrantProof — every claim has evidence, every grant dollar reconciles

## The problem

**Denise, the part-time coordinator at Tidepath Family Alliance (a fictional nonprofit), is the only person who writes her funder reports — and she writes them from memory:**

Tidepath runs on two small grants. Four times a year Denise owes each funder a report: what the program achieved, and how every dollar was spent. She spends about **14 hours a week** during reporting season digging through registers, receipts, and spreadsheets, trying to remember which numbers were real. Twice, numbers went into a report that she could not prove when the funder asked — once she had mixed a *goal* ("we aim to support 150 families") into a report as if it had already happened. Last year a report went in **three weeks late** because the spending in her spreadsheet did not add up against the bank records, and the funder froze the next payment while it was sorted out. The families waiting on coaching sessions are the ones who pay when the money is frozen.

Denise does not need another spreadsheet. She needs a system where **a claim cannot be written unless the evidence for it exists and was approved**, and where **grant spending reconciles itself** — so a report takes an afternoon of reviewing, not weeks of digging, and nothing unproven ever reaches a funder.

*(Tidepath Family Alliance, Denise, and all data in this repo are fictional, per hackathon rules.)*

**When this is solved, a judge can see in the demo:**

1. A generated grant answer where **every claim is an exact quote of an approved fact** — and a question the AI *refuses* to answer because its only evidence is an unapproved goal, returning a "gap" instead of inventing a number.
2. Spending imported from a CSV and **reconciled against the grant budget in cents** — $16,200 spent, $33,800 remaining on Grant 1 — with over-budget and unallocated money flagged before a report can be approved.
3. An approval that **seals the whole application + report with a hash**: change one word afterward and the approval disappears and export is blocked until a human re-approves.

## What GrantProof does

1. **Sources → facts.** Staff import a source document (program register, board plan). Each line becomes a candidate fact, tagged `achieved` or `goal`. Nothing is usable until a human approves it.
2. **Evidence-bound drafting.** For each funder question, an agent drafts an answer using *only* approved facts from the right period and kind. Every claim must be an exact excerpt of one approved fact, cited by fact ID. Missing evidence comes back as a gap — never a made-up number. A deterministic validator re-checks every draft after the agent; the LLM never gets the last word.
3. **Reconciled spending.** Transactions are imported from a QuickBooks-style CSV (duplicates and bad rows rejected), allocated to grant budget categories, and reconciled in integer cents inside the funder's period.
4. **Approve → seal → export.** A reviewer can approve only when every question has a valid draft, no category is over budget, and no in-period transaction is unallocated. Approval seals a SHA-256 snapshot. Any later change invalidates it, and export returns the sealed snapshot only while the approval is current.

## Built with

Codex and the **OpenAI Agents SDK** (`@openai/agents`) · Next.js 16 · React 19 · TypeScript · SQLite (`better-sqlite3`) · Zod

- **Live mode** — set `OPENAI_API_KEY` (model: `OPENAI_MODEL`, default `gpt-4.1-mini`). The agent must call three tools before answering: approved-fact retrieval, requirement retrieval, and deterministic spending validation.
- **Fixture mode (default, no key needed)** — a deterministic generator builds drafts from the same approved facts, so the full flow always works, including live on stage.

## The team split

Three builders, one layer each — full assignments, file ownership, contracts, and acceptance tests are in [AGENT-HANDOFF.md](AGENT-HANDOFF.md):

- **Part 1 — The Screens:** `app/page.tsx`, `app/globals.css` — Sources & Facts, Drafts, Spending, Approve & Export
- **Part 2 — The Money + Data:** `lib/store.ts`, `fixtures/`, `tests/` — storage, CSV import, reconciliation in cents, approval seal, seed data
- **Part 3 — The AI Brain + Package:** `lib/agent.ts`, `app/api/` — the Agents SDK drafter, the workspace/export API, this README

## Run it

```bash
npm install
npm run reset   # seeds the fictional Tidepath workspace (Grant 1: $16,200 spent / $33,800 remaining)
npm run dev     # http://127.0.0.1:4317
```

Optional live AI: copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.

Checks: `npm run typecheck` · `npm test`

## Demo script (about 3 minutes)

1. **Reset** the workspace. Show the seed: 2 sources, 4 facts (2 approved achievements, 1 unapproved goal, 1 unapproved estimate), 2 grants, 3 funder questions.
2. **Generate Question 1** ("What did your program achieve?") in fixture mode → 2 claims, each an exact approved excerpt, each cited. Validation: clean.
3. **Generate Question 3** ("What are your goals…?") → **zero claims, one gap**: the only goal fact is unapproved, so the system refuses rather than inventing. *This is the moment the old way failed Denise — a goal reported as an achievement.* Approve the goal fact, regenerate → the claim appears.
4. **Spending:** show Grant 1 reconciled — $50,000 budget, $16,200 spent, $33,800 balance, every category On track. Import `fixtures/import-errors.csv` → bad date and negative amount rejected, duplicate skipped.
5. **Approve** Grant 1 as the reviewer → snapshot sealed with a hash. **Export** → sealed JSON downloads.
6. **Tamper:** edit one claim's wording → the approval vanishes, validation flags "Edited wording requires evidence review," and export is blocked (409) until a human re-approves.

## Rules the system enforces (not promises — code)

- No claim without an approved fact; no claim that is not an exact excerpt of one.
- Goals are never reported as achievements (fact kind must match question kind, source period must fall inside the funder period).
- Money is integer cents; allocations cannot exceed a transaction across grants or fall outside the funder period.
- Approval is a hash seal, not a checkbox: any change to content or evidence requires a new human approval before export.
- Source documents are treated as untrusted data by the agent — instructions embedded in a source are never followed.
