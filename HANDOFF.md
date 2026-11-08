# GrantProof redesign handoff — 2026-11-08

Base revision: `7d9365cdeb8d0c3d428e5372c5ada56c0ce3a4e2`.

## Changes

- New default Sprig theme inspired by the owner's selected [Sprig banking design by Tanvir / Yscale Studio](https://dribbble.com/shots/27871810-Sprig-Modern-Digital-Banking-Website-Design). Original GrantProof branding and all prior selectable themes are retained. Existing saved theme preferences remain respected.
- Forest green navigation, mint highlights, larger text, responsive phone navigation, and clearer report readiness based on existing API results.
- Relationships & CRM launch area covering funders, donors, and separate GrantProof sales operations. CiviCRM selection and isolated activation plan are documented. Links initially remain unconfigured; no CRM backend, private data sync, or outbound messaging is claimed.
- CRM URL validation rejects unsafe schemes, userinfo, query strings, and fragments. No credentials belong in the public configuration.

## Verification

Using the bundled Node 24.22.1 runtime:

- TypeScript check passed.
- Production `next build` passed.
- The repository's `npm test` passed: 43 passing tests and two deliberately skipped opt-in integration tests.
- Browser checks on a separate local fictional SQLite database: generated both grant answers, opened source citation, approved exact report, downloaded JSON audit package, edited a claim, observed approval invalidation and export relocking.
- Responsive review and CRM screens at a 390-pixel viewport (375-pixel content width with scrollbar) had no horizontal overflow. Temporary viewport was reset.
- Browser console reported no warning/error entries during these checks.

An initial broad test-file invocation also ran two server-dependent TSX helpers outside the repository's standard command; those failed because their expected loopback server was absent. The prescribed test command above passed. No test was changed or skipped to conceal an implementation failure.

No grant-engine, financial calculation, API, approval policy, or database schema change is included. No production records, credentials, payment settings, or DNS were changed by this frontend work.

## Deployment

The existing deployment uses `grantproof.service` with its existing reverse proxy, not a new hosting provider. Publish exact source, preserve the previous build, build in isolation, then restart only this service. Record the exact deployed revision and health result in the deployment receipt. CRM activation is a separate isolated staging operation requiring its own access checks.
