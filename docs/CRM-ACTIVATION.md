# CiviCRM activation package

Prepared 2026-11-08. Status: **reviewable deployment plan; CRM is not installed or connected.** The public GrantProof app remains a fictional demonstration. Selection and advisory evidence are in [CRM-SELECTION.md](CRM-SELECTION.md).

## Pinned release

| Item | Verified value |
| --- | --- |
| Product | CiviCRM Standalone 6.20.0 |
| Official release | https://download.civicrm.org/release/6.20.0 |
| Build ID | `6.20.0-bc122d910865c790f82f91eda4b0be87` |
| Release package | https://download.civicrm.org/civicrm-6.20.0-standalone.tar.gz |
| Publisher SHA256 list | https://download.civicrm.org/civicrm-6.20.0.SHA256SUMS |
| Publisher signature | https://download.civicrm.org/civicrm-6.20.0.SHA256SUMS.asc |
| Package SHA256 from that list | `28539e94c8167f9bcc342b9bfe360e451197129abdc799acba3a1a4a15c36bd5` |
| HTTP HEAD package size | 36,229,557 bytes |

The official download redirects to `storage.googleapis.com/civicrm/civicrm-stable/6.20.0/`. The package was downloaded locally and its SHA256 **matches the publisher checksum exactly**. Archive-listing inspection found 21,658 entries under `civicrm-standalone/` and no absolute or parent-traversal paths. No archive contents were extracted or executed. The checksum-list signature has not been verified; verify it against an independently verified CiviCRM signing-key fingerprint before deployment. A matching hash and filename inspection are not a security audit. [Official release and signed checksum links](https://download.civicrm.org/release/6.20.0)

Local artifacts are outside the Git repository and must not be committed:

- Package: `C:\Users\Joe Lou\.codex\.chatgpt-projects\g-p-6ab4155df30c819192140be8f6ab7ab9\outputs\grantproof-redesign\crm-staging\civicrm-6.20.0-standalone.tar.gz`
- Verification evidence: `C:\Users\Joe Lou\.codex\.chatgpt-projects\g-p-6ab4155df30c819192140be8f6ab7ab9\outputs\grantproof-redesign\crm-staging\package-verification.json`
- Archive listing: `C:\Users\Joe Lou\.codex\.chatgpt-projects\g-p-6ab4155df30c819192140be8f6ab7ab9\outputs\grantproof-redesign\crm-staging\archive-listing.txt`

Verification time: 2026-11-08 21:02 UTC. The package remains uninstalled. Runtime/image compatibility, dependency vulnerability scanning, signature verification, and deployed access-control tests remain open.

Use Linux, PHP 8.4 with matching CLI/FPM versions and extensions, and MariaDB 11.4 on its current supported security patch. Pin exact runtime versions and image digests after staging compatibility and vulnerability checks. CiviCRM recommends PHP 8.3/8.4/8.5 and MariaDB 11.4+; it also supports MySQL. PostgreSQL is unsupported. Required PHP modules and database configuration must pass the installer check. This choice is a proposed baseline, not a verified host configuration. [Runtime requirements](https://docs.civicrm.org/installation/en/latest/requirements/)

## Two isolated initial instances

These names and endpoints are proposed; they have not been reserved or configured.

| Boundary | Nonprofit demonstration / first nonprofit | BookAI commercial sales |
| --- | --- | --- |
| Deployment name | `grantproof-crm-nonprofit` | `bookai-crm-sales` |
| Database | `grantproof_crm_nonprofit` | `bookai_crm_sales` |
| Private data volume | `grantproof_crm_nonprofit_private` | `bookai_crm_sales_private` |
| DB/service identities | Unique to this instance | Unique to this instance |
| Proposed private staging bind | `127.0.0.1:4331` | `127.0.0.1:4332` |
| Proposed final hostname | `relationships.bookaistudio.com` | `sales.bookaistudio.com` |
| Records | Funders, contacts, grant opportunities, follow-ups, donors, contributions | BookAI / GrantProof prospects, sales stages, follow-ups |

Check port availability before choosing bindings. Use separate application networks and separate databases/storage; never share database root credentials or mount the host root or Docker socket. Publish no database port. Each additional nonprofit customer needs its own isolation boundary and onboarding; do not put multiple customers into the first instance and rely on a label or a view filter.

Standalone needs its own hostname/root installation, with its `private` directory blocked from web access. Use the official release installation guide and its server configuration examples. Keep the installer reachable only through the operator's private connection until setup and permissions are complete. [Standalone installation](https://docs.civicrm.org/installation/en/latest/standalone/)

## Approval scope before activation

The user's project instructions explicitly require approval for changing secrets, DNS, or domain routing. The VPS operating contract also prohibits creating/editing/deleting `.env` files. The pending approval is therefore for these concrete changes, not for the completed research:

1. Create the two isolated deployments above with new per-instance database, administrator, and scoped integration credentials through the existing approved secrets mechanism. No credentials go in this repository or chat; no VPS `.env` file is edited.
2. Configure the two proposed hostnames and TLS routing only after the private staging checks pass. Confirm control of those hostnames and collisions before changing routes.
3. Connect the existing LeadFlow downstream adapter to the correct instance after its contract and routing are verified. Do not rotate LeadFlow's existing key as part of this work.

Do not request permission to import real data, send email, configure payments, or run a production migration as part of this activation. Those actions are outside this plan. No new paid service is proposed.

## Execution order after approval

1. **Recheck the host, read-only.** Record available memory/disk, port collisions, container/runtime versions, current reverse-proxy owner, and LeadFlow health and destination. Verify that an existing CRM has not been added since the bounded inspection. Back up any configuration that will be changed.
2. **Verify the build inputs.** Recheck the full CiviCRM advisory feed for 6.20.0, verify the package checksum/signature, and scan the selected PHP/database/base-image dependencies. If a new relevant fix exists, select that version and update this manifest before installation. Record any unresolved exploitable finding as a rollout blocker.
3. **Build isolated staging.** Create separate storage, databases, networks, and service identities. Inject secrets via the approved mounted-file/secret-manager mechanism. Restrict write access to necessary runtime directories; keep application code immutable where practical. Install only official core components needed for the pilot.
4. **Create access roles.** Give Joseph a named administrator account with MFA and tested recovery. Create separate routine staff accounts with only necessary contact/activity/contribution permissions. Create a restricted nonhuman integration account per instance; no administrator API key. Review session expiry and recovery settings.
5. **Configure records with fictional examples.** Add funder and donor subtypes, relationships, opportunity deadlines/stages, assigned follow-ups, and contribution tracking to the nonprofit instance. Configure BookAI lead stages and activities separately. Do not activate donation payment processors or outbound marketing.
6. **Run the acceptance checks below.** Keep the instance private until all required checks have saved evidence. Restore one staging backup into a fresh isolated target and verify records before approving real data.
7. **Route and connect.** Apply the approved HTTPS host routing. Enable the app's CRM launcher only for the approved origin. Opening the launcher requires a separate CRM login and does not import CRM records into the public GrantProof workspace.
8. **Integrate through LeadFlow.** Implement the CRM adapter at the platform's lead-routing boundary. GrantProof submissions continue to use its backend to call LeadFlow intake with `source`, explicit consent, server-side key-file authentication, visible errors, and retry/idempotency handling. Test one synthetic lead per intended route without sending a message.
9. **Record handoff proof.** Save version/build/digests, deployment owner, access-test results, backup/restore result, health URL, LeadFlow synthetic-record ID, rollback procedure, and remaining limitations. Only then permit the approved real-data scope.

## Acceptance evidence required

| Check | Required result |
| --- | --- |
| Release and dependency review | Exact package matches pinned hash; signature provenance recorded; no unresolved applicable critical/high finding without a documented mitigation and explicit risk decision |
| Anonymous access | Contact, contribution, export and API routes deny unauthenticated access; public GrantProof workspace contains only fictional demo records |
| MFA/session behavior | Normal login enforces MFA; recovery and service-login paths do not bypass intended account controls; expired sessions deny access |
| Staff access | Limited role cannot use direct URLs, API calls, exports, joins, or attachment links to reach forbidden data |
| Instance separation | Nonprofit staff/service credentials cannot reach BookAI records; no shared database user, secret, volume, or unrestricted internal adapter route |
| Private files | Requests for `private/`, settings, backup archives and database exports receive no file contents |
| Reverse proxy | HTTPS/cookie behavior verified behind the actual proxy; request headers and redirects cannot weaken the authenticated session |
| LeadFlow | Correct destination, explicit consent preserved, duplicate intake does not create duplicate records, failure/retry visible, no secrets or unnecessary personal data in logs |
| Recovery | Encrypted backup exists outside the app container; successful restore to isolated staging; backup credentials differ from app credentials |
| Browser bundle | No CRM key, password, database connection, or private CRM data; only approved launcher origins |

These are required tests, not claims that the tests have passed.

## Rollback and operating owner

During the fictional-data pilot, rollback means disable the launcher, stop the new CRM service, restore the previous routing configuration, and preserve its isolated data for diagnosis. Do not delete records or reset a database. Once real data is admitted, take a verified backup and test application/database compatibility before any rollback; an older application must not be pointed blindly at a newer schema.

Assign one named operator to security advisories, monthly maintenance review, urgent patch triage, daily backup monitoring, and periodic restore/access reviews. LeadFlow remains the sole automated lead-writing boundary. Mautic remains a separate marketing system; no email campaigns are activated by installing the CRM.
