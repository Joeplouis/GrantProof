# Architecture and contracts

Next.js App Router + React + TypeScript; Node route handlers; `better-sqlite3` SQLite persistence; optional `@openai/agents`. Everything runs on the Mac Studio loopback interface. No cloud provisioning.

## Shared data

| Entity      | Contract                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Source      | Stable ID, document name, original text, inclusive ISO period start/end.                                                 |
| Fact        | Stable ID, Source FK, exact excerpt, line location, achieved/goal kind, staff approval boolean.                          |
| Grant       | ID, funder, inclusive start/end, category budgets in integer cents.                                                      |
| Question    | Grant FK, prompt, positive word limit, fact kind and optional required phrase.                                           |
| Transaction | Export ID, ISO calendar date, payee, positive integer cents, unique date/payee/amount fingerprint.                       |
| Allocation  | Transaction FK, Grant FK, permitted category, positive integer cents. Sum across grants cannot exceed transaction cents. |
| Draft       | Question FK (one current draft), version, claims with cited fact IDs, explicit gaps, generation mode.                    |
| Approval    | Grant FK, reviewer, UTC time, independent immutable snapshot copy and SHA-256. Prior approvals remain history.           |

Each entity has a SQLite table containing its JSON representation plus stored generated relational columns. Foreign keys enforce source, grant, question and transaction references. Transaction fingerprints and draft/question associations are unique. Integer-cent constraints protect transaction/allocation amounts. Workspace replacement occurs atomically in a SQLite transaction with FK-safe ordering. SQLite WAL supports durable local persistence. A live generation request checks the initial workspace hash before saving so it cannot silently overwrite intervening edits.

## Deterministic boundaries

Amounts parse from decimal strings directly to cents (no floating-point currency summation). Dates are canonical `YYYY-MM-DD`, validated against the calendar, and compared inclusively without local-time conversion. Report totals sum only this grant's allocations attached to transactions within the funder's period. Budget = spent + remaining; over-budget categories and in-period unallocated balances block approval.

Every generated claim must equal an exact approved excerpt with a valid fact ID. Its source must contain the excerpt, fall entirely inside the funder period, and match achieved/goal classification. A required phrase and word limit are checked. Broad source periods are intentionally excluded rather than assuming partial-period applicability. No unsupported free-form paraphrase can pass final approval. Editing preserves linked IDs but triggers validation and a new version.

The hash covers current grant requirements, current question drafts, referenced facts/sources, the period ledger, grant allocations and deterministic totals. `currentApproval` recomputes the snapshot and readiness checks. Export only accepts the current approved snapshot and serializes that stored snapshot, not a reconstruction with new content. Only cited evidence is in the exported appendix; unrelated pending facts are excluded. HTML escapes all imported text and has a restrictive content security policy. JSON is the exact audit package; HTML is a readable rendering of the same approved values, sources and hash.

## Bounded agent

A single SDK agent has only three read-only tools. It must retrieve approved facts, requirements, and deterministic spending/validation. Structured output is rechecked by deterministic code. All three tool calls must occur; incomplete orchestration, timeout, or missing credentials yields an error without saving a fabricated result. Tools cannot mutate state or approve anything. Source text is labeled untrusted data. Tracing is disabled to avoid source telemetry. Fixture generation is a separate explicit branch, never a silent fallback after a failed live call.

Official implementation reference: [OpenAI Agents SDK quickstart](https://developers.openai.com/api/docs/guides/agents/quickstart), fetched November 7, 2026. Installed package types and local Next.js documentation were checked during implementation.

## HTTP surface

- `GET /api/workspace`: state, reports, readiness errors, current approvals, credential-presence boolean only.
- `POST /api/workspace`: explicit action among source/fact/generate/edit/csv/allocate/unallocate/approve; validates input; same-origin mutation guard. No reset endpoint.
- `GET /api/export?grant=g1`: 409 until approved; current snapshot JSON download.
- `GET /api/export?grant=g1&format=html`: same gate; escaped readable report download.

No credentials are returned. Only fictional inputs are authorized. Host binding and lack of CORS reduce exposure, but this is not an authenticated deployment.
