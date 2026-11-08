# Three-minute demo

Prepare: `npm run reset`; start the app; open http://127.0.0.1:4317 on the Mac Studio or an explicitly authorized remote desktop. Keep fixture mode visible. Do not describe the CSV as a live accounting integration.

**0:00–0:25 — The problem.** “Tidepath is fictional, but the paperwork problem is real: staff rewrite the same story for each funder, then reconcile different categories and fiscal years. GrantProof connects a claim to its record and a dollar to its grant. Staff keep control.”

**0:25–0:55 — Evidence.** Open Evidence library. Show the approved 120-family record and original line location. Show the pending 92% estimate: it cannot be used. Explain that importing text creates candidates, not truth. Achieved outcomes and future goals are separate.

**0:55–1:30 — Application.** Generate both Family Futures answers. Show word counts and fixture label. Click `[1]` to open source excerpt, document, location and period. “These are exact approved sentences. We flag missing evidence instead of inventing a statistic.” Briefly show Bridge Fund generation with a pending goal: an evidence gap appears. Switch back.

**1:30–2:05 — Money.** Open Grant spending. Show $50,000 budget, $16,200 spending, $33,800 remaining; category rows sum to the total. January 1 and December 31 count; January 1, 2027 does not. Import the sample CSV again: four duplicates skipped, totals unchanged. “This is a CSV export workflow; QuickBooks stays where it is.”

**2:05–2:40 — Human control.** Open Review & export. Enter reviewer name and approve. Download the readable approved report and JSON audit package. Show snapshot ID/hash and source references. Edit one answer to an unsupported number: approval becomes invalid, export locks, and the evidence check identifies edited wording. Regenerate to restore the sourced version.

**2:40–3:00 — Close.** “One grant, one source trail, one reconciled report. A different fiscal period is already modeled. The optional bounded OpenAI Agents SDK path is implemented; today's verified demonstration is deterministic fixture mode. Next: staff pilots and richer document parsing.”

# Submission checklist

Official event URL supplied by the coordinating chat: [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h?tab=problem-statements). Selected challenge: “Grant applications and reports, each with its own rules.”

The coordinating chat verified the required three outcomes and judging categories before dispatch. This build maps to them:

| Required outcome / judging theme                           | Demonstration evidence                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sourced answers, word limits, approved facts, missing gaps | Evidence + Application; citation/approval/word-limit tests.                          |
| Spending and balances by category and spend-by date        | Spending; integer-cent reconciliation and allocation tests.                          |
| Funder reporting dates                                     | Inclusive calendar-year and July–June fiscal-year tests.                             |
| Problem fit                                                | One fictional nonprofit grant completed from records through staff approval/export.  |
| Originality                                                | Shared evidence and financial approval snapshot; invalidation closes the loop.       |
| Codex/OpenAI use                                           | Codex implementation; bounded Agents SDK integration present, live API unverified.   |
| Feasibility/thoughtfulness                                 | Local persistence, CSV accounting workflow, explicit gaps, no autonomous submission. |
| Presentation                                               | Four focused screens and this three-minute script. Visual browser QA pending.        |

**Exact submission-tab fields are NOT verified.** A public HTTP fetch returned the client-rendered shell, and browser control was unavailable. No deliverable field, video requirement, repository visibility requirement or submission format has been invented. Git must inspect the actual submission tab before delivery.

- [x] Working source repository and draft PR: https://github.com/gitdot5/GrantProof/pull/1
- [x] Fictional fixtures and expected totals documented.
- [x] README, architecture/contracts and acceptance evidence included.
- [x] Three-minute demo script prepared.
- [ ] Verify actual submission form fields and upload/link requirements on the official page.
- [ ] Verify team registration and Git/Joe details personally; this app did not register anyone.
- [ ] Decide an authorized judging-access method. Loopback on the Studio is not a Miami-accessible demo URL.
- [ ] Complete visual desktop/mobile browser QA and capture any required demo recording.
- [ ] If live API is required, owner configures credentials and verifies actual live generation first.
- [ ] Confirm the published deadline in the actual event UI. Dispatch context reports November 8, 2026 at 4:45 PM America/New_York; internal readiness target is 3:45 PM.
- [ ] Git submits the final package. No registration, external message, public deploy, spending, or submission was performed here.
