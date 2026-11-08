# GrantProof: three-minute judging demo

Working format, not a claim about the event's required video length. Use fictional records only. The app's guided entry is **Dashboard → Try the demo**. Choose **South Beach** for a light presentation, **Wynwood** for the neon/mural treatment, or **Little Havana** for warm Calle Ocho-inspired storefronts.

## The opening, in plain language

“We built GrantProof to turn a nonprofit's own records into a grant report. Every claim points to approved evidence. Every dollar reconciles against the funder's categories and dates. Staff approve the exact package before it leaves. Change a claim afterward and export locks. Let me show you.”

## Show the product

**0:00–0:20 — The problem.** The supplied Tidepath challenge describes a director and bookkeeper losing days to questions, word limits, spending rules, and different funder years. Say who has the problem and show the workspace immediately. Do not claim measured customer adoption or time savings.

**0:20–0:50 — Evidence.** Open Evidence library. Show an approved 120-family record and the pending 92% estimate. The estimate cannot enter a supported draft. Imported lines are candidates that need staff review.

**0:50–1:25 — Make the agent's work visible.** Enable **Use OpenAI Agents SDK** for a live presentation and generate a Family Futures answer. The in-progress message waits for the actual server result; it does not simulate tool progress. Below the answer, show **See what the agent did**: approved facts retrieved, funder requirements read, exact-cent spending checked, structured draft returned, and deterministic validation. Open **Tool used** to show a real tool name, then **View evidence** to inspect its source. The receipt includes generation version, time, duration, and gaps/check issues. Generate the second answer before approval. Fixture mode instead says **See what the demo ran / No AI call**, with only the deterministic operations that executed. Real live SDK and browser acceptance receipts are in [live browser QA](LIVE-BROWSER-QA.md).

Say: “This is the recorded work for this draft, not the model's private reasoning. The agent retrieves and drafts; code checks; staff approve.” Receipts persist on reload and remain labeled as historical after edits. Older drafts have no backfilled activity; regenerate to record it. Failed generations preserve the previous draft and receipt. A receipt is not an approval or proof that evidence is still current.

**1:25–2:00 — Exact money and funder rules.** Show $50,000 budget, $16,200 spent, and $33,800 remaining. Re-import `fixtures/quickbooks-sample.csv`: four duplicates are skipped and the balance stays unchanged. Briefly select Bridge Fund to show its July–June period; return to Family Futures. Explain the CSV workflow accurately: there is no direct QuickBooks connection.

**2:00–2:45 — The memorable proof.** Approve the application/report together. Download the actual readable HTML report and JSON audit package. Edit a claim to an unsupported 99% result, then return to review: approval is invalidated and export returns 409. The stored approved snapshot remains unchanged. This is the strongest finish because the audience sees a safeguard work.

**2:45–3:00 — Close.** “The model drafts. Code reconciles. Staff approve. The result is one reviewable package, with the records behind it. Next we would pilot the workflow with staff and measure preparation time, correction rate, and report completeness.” These are proposed pilot measures, not results already achieved.

## What prior winners suggest

This is our interpretation of public winner reports, not evidence of a guaranteed winning formula:

- OpenAI's winners include Second Voice, which retains user choice; veTriage, which supports an existing staff workflow; and Echo Canvas, which keeps deterministic calculations outside the model. The common lesson for GrantProof is to make the user benefit and the human/AI boundary visible. [OpenAI winner report](https://developers.openai.com/blog/build-week-winners).
- The University of Utah says its first-place project, Pieces of Them, was recognized for impact, commercial viability, and timely AI use. Our pitch should explain whose grant work improves and what a feasible staff pilot would measure. [Organizer's winner announcement](https://ai.utah.edu/blog/posts/2026/build_with_ai_hackathon-1.php).
- Devpost's guidance stresses a clear problem, usable product, concise working demonstration, and accessible submission links. Its advice from previous winners recommends planning the script and showing actual interaction. The implication here is to demonstrate the source → spending → approval lock sequence and rehearse it. [Judging guidance](https://info.devpost.com/blog/understanding-hackathon-submission-and-judging-criteria), [demo advice from previous winners](https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video).

## Actual event: verified November 8

[DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h?tab=problem-statements): Codex Hackathon for Miami's Non-Profits. Selected challenge: **Grant applications and reports, each with its own rules**. The official page describes useful working software for South Florida nonprofits, and lists Codex, OpenAI API, and the OpenAI Agents SDK as acceptance criteria. Our build uses all three; the API/SDK path has real execution receipts.

The page says **submissions close November 8, 2026 at 4:45 p.m. EST**. It advertises $100 Codex and $50 API credits per person; whether a specific account has redeemed these or its remaining balance is not verified by this app.

The public **Judging Criteria** tab currently renders “Showing Judging Criteria,” without a scoring rubric or weights. The public **Submission** tab does not display a form. Exact fields, video length, and signed-in team status are therefore still unverified. Do not invent them or present general Devpost criteria as this event's published rubric.

## Ready and still to finish

- [x] All three core parts merged into public `main`; real live browser workflow passed.
- [x] Claim citations, missing-evidence gaps, word limits, exact cents, funder periods, approval invalidation, and real exports demonstrated/tested.
- [x] Desktop/phone visual checks completed; real-neighborhood theme variants and a guided first-use walkthrough prepared on `codex/miami-vice-themes`.
- [x] Real live SDK and live browser receipts committed. The new theme/guide checks run in fixture mode and add no API calls.
- [x] Concise demonstration script prepared; fixture video draft is labeled as such when recorded.
- [ ] Review the new design branch with the team, choose the presentation theme, and rehearse the actual demonstration.
- [ ] The team completes/validates registration and the signed-in submission form when ready.
- [ ] Confirm the actual required repository/demo/video links and their accessibility to judges. A Studio loopback URL with an SSH tunnel is a personal preview, not a public judging URL.
- [ ] Review narration and any video draft before uploading. No upload, registration, public deployment, external message, or contest submission is authorized by this document.

Use a clean fictional workspace for rehearsal. Reset only the explicitly selected demo database, never somebody else's working data. Keep `.env.local` and SQLite files out of Git. The current prototype is a local single-user workflow; future identity, hosting, and document-format support should be described as next steps.
