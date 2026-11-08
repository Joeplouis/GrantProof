# GrantProof CRM selection and integration boundary

Review date: 2026-11-08. This is a source-backed selection review and implementation plan, not a penetration test or proof that an installation is secure.

## Decision

**For a new nonprofit CRM, select CiviCRM Standalone 6.20.0 for an isolated staging deployment.** It directly fits contacts, organizations, donations, fundraising, activities, and relationships. The official download identifies 6.20.0 and recommends Standalone for new installations; it does not require another CMS. Keep GrantProof's evidence, accounting, approval, and export engine separate. [Official download](https://civicrm.org/download), [Standalone installation](https://docs.civicrm.org/installation/en/latest/standalone/)

A bounded read-only VPS inspection by the deployment agent found Mautic and a running LeadFlow service, but no existing CRM in the locations checked. This is not an exhaustive host inventory. Proceed with the separate CiviCRM staging plan in [CRM-ACTIVATION.md](CRM-ACTIVATION.md), and confirm LeadFlow's destination before building its adapter. Mautic remains the existing marketing system.

The recommendation is conditional on staging validation. No candidate is risk-free, and publishing advisories is evidence of disclosure, not by itself evidence that one product is less secure than another. A maintained version still needs configuration, monitoring, tested backups, and restricted access.

## Comparison

| Candidate reviewed | Fit | Current evidence | Decision |
| --- | --- | --- | --- |
| CiviCRM Standalone 6.20.0 | Strong nonprofit, donor, contribution, relationship, and activity model. Sales lead stages need configuration. | Official download lists 6.20.0. The important October 28 issues checked below have fixes in 6.19.3 and later. | Preferred new nonprofit CRM. Validate the actual release and permissions in staging. |
| EspoCRM 10.0.11 | Strong general CRM: contacts, organizations, deals, tasks, REST API. Fundraising needs custom records/fields. | Official latest is 10.0.11, October 23. A published PDF-template attachment access issue lists versions below 10.1.0 as affected. | Do not call this fully patched. No unrestricted real-data rollout until the fix is released or the risky capability is demonstrably unavailable. |
| Twenty 2.56.1 | Modern interface and flexible objects; convenient sales pipeline foundation. | Latest stable release is November 5. Several checked vulnerabilities have fixes below this version, but the pending-invitation advisory does not name a fixed release. | Viable alternative only after resolving that uncertainty and testing the deployed configuration. Do not enable multi-workspace mode based solely on version arithmetic. |

Sources: [CiviCRM download](https://civicrm.org/download), [EspoCRM download](https://www.espocrm.com/download/), [Twenty 2.56.1](https://github.com/twentyhq/twenty/releases/tag/twenty%2Fv2.56.1).

## Security checks and important limits

### CiviCRM

The following official advisories identify 6.19.2 and earlier as affected and 6.19.3 / 6.16.6 ESR and later as fixed. The recommended 6.20.0 is above those fixed versions:

| Advisory | Issue | Fixed release |
| --- | --- | --- |
| [CIVI-SA-2026-44](https://civicrm.org/advisory/civi-sa-2026-44) | APIv3 regular-expression SQL injection | 6.19.3 |
| [CIVI-SA-2026-42](https://civicrm.org/advisory/civi-sa-2026-42) | Standalone user API privilege escalation | 6.19.3 |
| [CIVI-SA-2026-50](https://civicrm.org/advisory/civi-sa-2026-50) | Standalone service-login MFA bypass | 6.19.3 |
| [CIVI-SA-2026-51](https://civicrm.org/advisory/civi-sa-2026-51) | Contribution financial-entity access bypass | 6.19.3 |

This is a targeted review of published advisories, not a complete audit of core, extensions, PHP, the database, or a deployed image. Recheck the [full advisory feed](https://civicrm.org/advisory) and scan the exact artifact before launch. Keep optional extensions out of the initial deployment.

### EspoCRM

- [GHSA-r277-qh74-r86f](https://github.com/espocrm/espocrm/security/advisories/GHSA-r277-qh74-r86f): a user allowed to edit PDF templates can access otherwise restricted image attachments. The advisory says **affected `<10.1.0`, fixed `10.1.0`**. No 9.3.x backport is identified there; 9.3.11 must not be represented as fixing this issue.
- [GHSA-j6q5-9jwj-9p8q](https://github.com/espocrm/espocrm/security/advisories/GHSA-j6q5-9jwj-9p8q): Knowledge Base stored XSS, fixed in 10.0.9 / 9.3.11.
- [GHSA-6pjq-v35w-jmjh](https://github.com/espocrm/espocrm/security/advisories/GHSA-6pjq-v35w-jmjh): unauthenticated request-processing denial of service, fixed in 10.0.8 / 9.3.11.

If Empire already uses EspoCRM, preserve it while assessing a staged update. A temporary restriction on PDF-template privileges is a mitigation requiring verification, not proof of a patched product. Espo supports TOTP and role/field permissions. Multiple roles combine permissively, so an additional role can restore access that another role restricts. [2FA](https://docs.espocrm.com/administration/2fa/), [roles](https://docs.espocrm.com/administration/roles-management/), [security settings](https://docs.espocrm.com/administration/security/)

### Twenty

Published fixes include [SQL injection in 2.15.0](https://github.com/twentyhq/twenty/security/advisories/GHSA-mm7j-q9q3-qqwj), [connected-account credential disclosure in 2.7.0](https://github.com/twentyhq/twenty/security/advisories/GHSA-mq5c-qp77-2cv3), [invitation role escalation in 2.47.0](https://github.com/twentyhq/twenty/security/advisories/GHSA-8w82-h3w4-62r5), [mail-server TLS verification in 2.48.0](https://github.com/twentyhq/twenty/security/advisories/GHSA-9pfj-h2fx-29hg), and [timeline field-permission disclosure in 2.52.0](https://github.com/twentyhq/twenty/security/advisories/GHSA-j86q-q8c2-f8x7).

The [pending-invitation takeover advisory](https://github.com/twentyhq/twenty/security/advisories/GHSA-m4vm-35cw-44rq) lists affected `<=2.47.0` but **no patched release**. It describes a multi-workspace configuration. The newest release being outside that range is insufficient to establish that the defect was fixed. Obtain the fixing change or verify the flow before permitting that configuration.

## Covering all requested uses

Use separate CRM instances and databases for BookAI's commercial sales operation and each nonprofit customer. A filter, label, contact subtype, or team name is not a tenant boundary. A single nonprofit can use its own instance for its funders and donors, subject to explicit staff permissions.

| Use | Proposed CRM model | GrantProof connection |
| --- | --- | --- |
| Funder organizations | Organization contact subtype `Funder` | Stable external funder ID linked to grant metadata |
| Funder people | Individual contact + relationship to funder | Contact detail remains in authenticated CRM |
| Grant opportunities | Configured grant-opportunity record/case, stage, deadline, requested amount, owner | Link to the GrantProof grant; do not copy approved evidence automatically |
| Follow-ups | Assigned activity, due date, status | Staff open the authenticated activity workspace |
| Donors/fundraising | Donor contacts, contributions, pledges, campaigns where enabled | Reporting links only initially; donation collection/payment setup is separate work |
| GrantProof sales leads | BookAI-only CRM instance; lead subtype and configured pipeline stages | LeadFlow routes authorized intake to the commercial instance |

These are proposed mappings, not features already installed. CiviCRM's contribution and contact functions fit nonprofit work directly; a deal-style sales board must be configured or supplied by Empire's existing sales CRM. No donation processor, tax receipt rule, mass email, or new pricing is part of this integration.

## Integration architecture

1. **Public hackathon app:** add only a CRM launch surface with explicit connected/not-configured status. Open the approved CRM origin in its own authenticated application. Do not embed credentials, authenticated iframes, customer lists, or private relationship data.
2. **Existing lead intake contract:** any GrantProof form capturing a name, email, or inquiry sends its backend request through LeadFlow at `http://127.0.0.1:8110/api/intake`, using the existing server-side key-file mechanism. Use `source`, not `source_app`. Consent is explicit and never inferred. Report intake failures instead of silently dropping submissions. This comes from the current Empire operating contract supplied by the parent inspection of `/opt/empire/AGENTS.md`.
3. **LeadFlow owns the downstream adapter:** GrantProof does not call a CRM directly and does not add a separate lead table. Confirm LeadFlow's actual schema, queue/retry behavior, and configured destination before writing a connector. The existing contract outranks generic CRM API examples.
4. **Future authenticated GrantProof:** only after verified login, organization authorization, and record-level access may an approved Empire integration service supply a small, allowlisted CRM projection. GrantProof still does not call the CRM directly. Never let a client choose its tenant, CRM origin, raw API route, or service account.
5. **Credential boundary:** scoped machine credentials stay in the approved secrets mechanism. No browser storage, URLs, Git, screenshots, or logs. CiviCRM APIv4 supports authenticated HTTP calls; prefer header credentials and a restricted service account. [APIv4 documentation](https://docs.civicrm.org/dev/en/latest/api/v4/rest/)

The existing GrantProof `app/api/workspace/route.ts:43` returns workspace data without a login/tenant check; its POST origin check at line 47 is not authentication. Connecting real donor or customer data to that route would expose it. Keep the current prototype fictional.

## Concrete activation gates

1. Confirm the bounded inventory result, LeadFlow destination, deployment owner, backup location, and available capacity. Preserve existing data and services.
2. Choose reuse/update or an isolated CiviCRM 6.20.0 staging instance. Pin the release/checksum; do not use an unreviewed installer script or floating `latest` image.
3. Use separate database credentials, storage, and a service identity. Do not mount the host root or Docker socket. Do not publish database ports.
4. Create operator credentials through the approved secure setup flow. Require MFA for people; verify recovery and session expiration. Do not paste credentials in chat or create/change VPS `.env` files.
5. Start with a private staging endpoint and fictional records. DNS/domain-routing changes require Joseph's approval. Existing production secrets and services remain unchanged.
6. Verify login, least-privilege staff role, restricted service account, unauthorized API denial, cross-organization denial, backup restore, and the selected version's advisory checks. Test direct URLs/API access, not just hidden menu items.
7. Validate one consented synthetic lead through LeadFlow into the correct CRM instance; test duplicates, rejection, retry, and error reporting. No email or marketing automation is sent.
8. Record the exact version/build, checks, rollback path, and scoped remaining risks before allowing real records.

## Licensing and completion state

CiviCRM 2.x+ is AGPLv3 with its published exception. EspoCRM is AGPLv3 and offers a separate commercial license. Twenty is mostly AGPLv3, with enterprise-licensed files and some MIT packages. Preserve notices and evaluate the exact code/extension license before modifying or distributing CRM code. Keep the CRM a separate service connected through its supported interfaces. [CiviCRM license](https://civicrm.org/about/license), [EspoCRM licensing](https://www.espocrm.com/download/), [Twenty license](https://github.com/twentyhq/twenty/blob/main/LICENSE)

Completed here: primary-source release/advisory comparison, functional mapping, and safe integration plan. Not completed here: CRM installation, deployment scan, penetration test, access-control tests, credential creation, data migration, or a live LeadFlow-to-CRM test. No production data or secrets were changed by this review.
