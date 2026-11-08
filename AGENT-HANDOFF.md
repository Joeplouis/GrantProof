# GrantProof — Agent Handoff: The 3-Person Split

**Current integration update (2026-11-07):** `codex/part1-part2-integration` combines the latest Part 2 engine and Part 1 screens with synthetic and Playwright tests. Read [the integration handoff](docs/INTEGRATION-HANDOFF.md) for the changes, test commands, and remaining checks. The assignments below describe the original split.

**Read this first. Pick your part. Stay in your part.**
One file = one owner. Nobody edits another person's files. If you need a change in someone else's part, ask that person — do not edit it yourself.

**What we are building for the client:** GrantProof for a nonprofit (demo client: the fictional Tidepath Family Alliance).
Source-backed grant applications and reconciled grant reporting — *every claim has evidence, every grant dollar reconciles* — so the nonprofit's coordinator no longer spends hours writing reports from memory and reconciling spending by hand. After handover, the client only reviews and approves.

**Repo state at handoff (2026-11-07):** engine + agent + API are drafted on `codex/grantproof-mvp`. The UI is missing (`app/page.tsx`, `app/globals.css` do not exist yet), `tests/` is missing, and there is no README yet. Each part below finishes one layer.

**Shared contract — agreed before anyone types:**

- Data shapes live in `lib/store.ts` (`Source`, `Fact`, `Grant`, `Question`, `Tx`, `Allocation`, `Claim`, `Draft`, `Approval`, `State`). Person 2 owns changes to them; the other two ask Person 2.
- The API is one door: `GET /api/workspace` returns the whole workspace. `POST /api/workspace` accepts only these actions: `source`, `fact`, `generate`, `edit`, `csv`, `allocate`, `unallocate`, `approve`. Export is `GET /api/export?grant=<grantId>` and only works after approval.
- Money is integer cents everywhere. Never floats for money.
- A claim is valid only if it is an exact excerpt of an *approved* fact. Missing evidence = a gap, never an invented claim.
- Branches: each person branches off `codex/grantproof-mvp` (`part1-ui`, `part2-engine`, `part3-agent`). Merge order: **Part 2 → Part 3 → Part 1**.
- Sync every 90 minutes, 5 minutes: does my part still connect to yours? One full end-to-end run tonight, not tomorrow morning.
- Hackathon rules: made-up people/data only, never real client data. The app must use Codex / the OpenAI API / the OpenAI Agents SDK (it does: `@openai/agents`).

---

## PART 1 — THE SCREENS (Front-end) — most Codex tokens

**Mission:** everything the client sees and clicks. No backend, no AI.

**Owns (only you edit these):**

- `app/page.tsx` — CREATE (does not exist yet; biggest job in the app)
- `app/globals.css` — CREATE (missing; `app/layout.tsx` already imports it, the app will not render without it)
- `components/**` — CREATE if you want components

**Build these 4 screens, calling only the shared API above:**

1. **Sources & Facts** — paste/import a source document (`source` action), see candidate facts, approve / reclassify each fact (`fact` action: `goal` vs `achieved`).
2. **Drafts** — pick a grant question, Generate (`generate` action, fixture mode by default), see the draft with its evidence citations and gaps, edit claims (`edit` action).
3. **Spending** — import the spending CSV (`csv` action; sample: `fixtures/quickbooks-sample.csv`), allocate transactions to grant categories (`allocate` / `unallocate`), see budget vs spent vs balance per category, with On track / Near limit / Over budget status.
4. **Approve & Export** — see review errors, approve with reviewer name (`approve` action), download the sealed snapshot from `/api/export` (it returns 409 until approved — show that message, don't hide it).

**Acceptance test (you pass when all are true):**

- [ ] App runs (`npm run dev`, port 4317) and renders with no missing-file errors
- [ ] A non-technical person can click through all 4 screens with no help
- [ ] Generate in fixture mode shows a draft with evidence; an unapproved export shows the blocked message

**Codex prompt to start with:**
> Read AGENT-HANDOFF.md Part 1 and the POST actions in app/api/workspace/route.ts. Build app/page.tsx and app/globals.css implementing the 4 screens (Sources & Facts, Drafts, Spending, Approve & Export) using only the shared API contract. Do not edit lib/ or app/api/.

---

## PART 2 — THE MONEY + DATA (Engine)

**Mission:** everything underneath: storage, truth, math. No screens, no AI.

**Owns (only you edit these):**

- `lib/store.ts` — the data shapes, SQLite storage, CSV import, spending reconciliation, draft validation, approval hash seal, seed data
- `scripts/reset.ts` — workspace reset to the fictional seed
- `fixtures/**` — sample CSVs and program register
- `tests/**` — CREATE (missing; `package.json` already runs `tsx --test tests/*.test.ts`)

**Finish / verify:**

- Seed workspace: Tidepath Family Alliance, Grant g1 "Family Futures 2026" (Harbor Community Foundation), Grant g2 "Bridge Fund" (Seabright Trust), questions q1–q3.
- CSV import must reject bad dates, negative amounts, and duplicate IDs/fingerprints (see `fixtures/import-errors.csv`).
- Allocations can never exceed a transaction's amount across grants, and never outside the funder period.
- Approval seals a snapshot by SHA-256 hash; any later content/evidence change invalidates the current approval.

**Acceptance test (you pass when all are true):**

- [ ] `npm run reset` prints the expected line: g1 spending $16,200; remaining $33,800
- [ ] `npm test` passes, covering: CSV errors, duplicate detection, allocation limits, draft validation (unapproved fact = invalid claim), approval invalidation after a change
- [ ] `npm run typecheck` passes

**Codex prompt to start with:**
> Read AGENT-HANDOFF.md Part 2 and lib/store.ts. Create tests/ covering the Part 2 acceptance test, fix any engine bugs they expose, and verify reset/typecheck. Do not edit app/ or lib/agent.ts.

---

## PART 3 — THE AI BRAIN + THE PACKAGE (Agent, API, submission) — Joseph

**Mission:** the part that writes the grant draft — only from approved facts, never invented — plus the package the judges read. No screens, no money math.

**Owns (only you edit these):**

- `lib/agent.ts` — the OpenAI Agents SDK draft generator (`@openai/agents`, model from `OPENAI_MODEL`, default `gpt-4.1-mini`)
- `app/api/workspace/route.ts` — GET returns workspace + reports + current approvals + review errors; POST dispatches the shared actions
- `app/api/export/route.ts` — approved-snapshot export (409 until approved)
- `.env.example` — `OPENAI_API_KEY` optional; fixture mode works with no key
- `README.md` — CREATE (missing; judges open the repo and read this first)

**Finish / verify:**

- Live mode: the agent must call its three tools (approved facts, requirements, deterministic spending validation) and return structured claims + gaps; every claim is then re-checked by `validateDraft` — the LLM never gets the last word.
- Fixture mode (no key): deterministic draft from approved facts, so the demo never dies on stage.
- The README opens with the **problem statement** (who at the nonprofit has the problem, what it costs them today in hours/money/missed reports, and the 2–3 things a judge can see fixed in the demo), then what GrantProof does, the architecture (this 3-part split), and how to run it: `npm install`, `npm run reset`, `npm run dev` (port 4317), fixture mode vs live mode.
- Demo script (in the README): import source → approve facts → generate draft → show a gap where evidence is missing → import CSV → reconcile spending → approve → export.

**Acceptance test (you pass when all are true):**

- [ ] Fixture generate returns a draft whose claims are exact approved excerpts, with gaps listed for missing evidence
- [ ] Live generate (with a key set) returns the same shape and passes `validateDraft`
- [ ] Export returns 409 before approval and a sealed JSON snapshot after approval
- [ ] README with problem statement first is committed, and the demo script runs end-to-end without the team standing behind the user

**Codex prompt to start with:**
> Read AGENT-HANDOFF.md Part 3, lib/agent.ts, and app/api/. Verify the fixture and live generation paths against validateDraft in lib/store.ts (do not edit lib/store.ts — ask Part 2 if a shape must change), then write README.md opening with the problem statement, then the demo script. Do not edit app/page.tsx or app/globals.css.

---

## Definition of done — the whole app

A non-technical person sits down alone and goes: **import a source → approve facts → generate an evidence-bound draft → import spending → reconcile → approve → export** — without help from the team. If they need one of us standing behind them, we are not done.

## Submission checklist

- [ ] All 3 parts merged into `codex/grantproof-mvp` in order (2 → 3 → 1), end-to-end run passes
- [ ] README (problem statement first) is on the branch judges will open
- [ ] Make `codex/grantproof-mvp` the default branch, or merge it to `main` — judges must not land on the empty `main`
- [ ] Fixture mode confirmed working with no API key (demo safety)
