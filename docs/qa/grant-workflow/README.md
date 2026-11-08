# Grant workflow and portfolio acceptance

The workflow coordinator audits approved/pending evidence in the grant period, checks spending and transactions needing allocation, prepares missing answers, and inspects deterministic review readiness. All four tools must complete before the route saves the staged result. Existing answers, staff edits, facts, and allocations are preserved. A failed preparation or optimistic concurrency conflict saves no partial changes. The coordinator has no approval, allocation, import, export, or messaging tool.

Dashboard and Review show saved handoffs and current blockers separately. Any workspace-content change marks an earlier handoff stale. Staff continue through the existing approval/export flow. The Dashboard portfolio additionally shows each grant's own period, exact balances, category warnings, and staff-set report due dates. Due/all-grant queues are user-triggered and atomic across the selected grants. Blank dates are not guessed; background scheduling is not implemented. The 80% category warning reports current budget use, not a forecast. The model's note cannot override readiness checks.

Validation on November 8:

- 46 offline checks passed; two opt-in server JSDOM tests skipped.
- 18 Chromium browser cases passed: 15 existing regressions plus the three new workflow cases on desktop, Pixel 7, and compact phone. The new cases passed after narrowing an initially ambiguous evidence-text assertion; no app behavior changed for that correction.
- Production build and typecheck passed. The automatically created `workflowRuns` table stores one latest handoff per grant; existing tables and approval snapshots retain their contents.
- Synthetic tests cover January, July, and October funder periods, different word limits, due-only/all-grant selection, preserved staff edits, missing evidence, unallocated expenses, repeated tool calls, stale handoffs, and atomic failure.
- One real live coordinator run prepared two live answer drafts, executed all four workflow tools, and returned no blockers for the fictional first grant. Export remained HTTP 409 because staff had not approved. See [live-receipt.json](live-receipt.json).

Desktop/phone and live-handoff screenshots were visually inspected. A local silent video addendum inspects the saved live handoff and drafts. The first recording completed generation but its verification used a relative request URL; the URL was corrected, and the saved result was reused without more model calls. No video was uploaded or contest entry submitted. Personal preview data was preserved; live acceptance used a separate fictional database.
