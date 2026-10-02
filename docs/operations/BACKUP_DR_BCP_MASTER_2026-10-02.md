# RISCK COMPLY — Backup, Disaster Recovery and Business Continuity Master

Version: 1.0  
Status date: 2026-10-02  
Scope: documentation-only closure; no runtime mutation  
Baseline: `main@82715c36e9d6e9e96205f52eb0d4f61f52349f22`  
Production project: Supabase `tganhbbhfxcpblmgqprg`; Vercel `prj_APpXAyQFy1Gie50xfbO45zjkyUSm`

## Truth standard

Statuses used: `CONFIGURED`, `DOCUMENTED`, `OBSERVED`, `PROVEN`, `EXTERNAL_DEPENDENCY`.

A documented capability is not a proven recovery. A provider feature is not claimed enabled unless account evidence shows it. No restore was executed during this closure lane.

## Backup inventory

| Asset | Current evidence | Status | Recovery path |
| --- | --- | --- | --- |
| PostgreSQL database | Supabase organization is Pro; project healthy in `eu-west-1`. Supabase Pro includes provider-managed daily database backups with 7-day retention. | CONFIGURED/EXTERNAL_DEPENDENCY | Supabase Dashboard database backup restore; destructive execution requires separate owner approval. |
| Point-in-Time Recovery | Available to Pro as a paid add-on, but enabled state was not proven in this lane. | DOCUMENTED/EXTERNAL_DEPENDENCY | If enabled, restore to a selected recovery point; otherwise rely on daily backups. |
| Database logical export | Supported through Supabase CLI `db dump`/`pg_dump`; no fresh production dump executed. | DOCUMENTED | Create encrypted logical export in an approved secure location when authorized. |
| Schema and migrations | Versioned in GitHub repository under source control. | OBSERVED | Rebuild schema by checked-in migrations against a clean authorized environment. |
| Application source | GitHub repository with protected `main`. | OBSERVED | Clone/recover repository and build exact known-good commit. |
| Application deployments | Vercel deployment history exists; prior production deployments are identified as rollback candidates. | OBSERVED | Promote/instant rollback to a known-good deployment after incident approval. |
| Dependency graph | Package manifests/lockfile are versioned with source. | OBSERVED | Reinstall exact dependency graph from repository lockfile. |
| Runtime secrets | Provider-managed environment/secrets recovery process only; secret values are intentionally not copied into this document. | DOCUMENTED/EXTERNAL_DEPENDENCY | Recover from authorized provider/account vault or rotate/recreate. Never recover secrets from logs or tickets. |
| Supabase Storage objects | Database backups do not restore object bytes; only metadata is covered by database backup. | DOCUMENTED/RISK | Storage-object recovery requires separate object backup/export capability or provider recovery evidence. |
| Customer documents stored as database rows | Recoverable with database backup subject to backup window and restore success. | DOCUMENTED | Restore database or reconstruct from approved export. |
| Customer files stored in object storage | Not proven recoverable from database backups. | DOCUMENTED/RISK | Use storage-specific recovery/export plan; do not represent DB backup as file recovery. |
| Audit data in Postgres | Subject to database backup coverage. | DOCUMENTED | Database restore or export recovery. |

## Backup responsibility matrix

| Capability | Primary owner | Provider role | Evidence owner |
| --- | --- | --- | --- |
| Database backups | RISCK COMPLY owner | Supabase operates managed backup service | Owner/SRE documentation |
| Database restore authorization | RISCK COMPLY owner | Supabase executes managed restore workflow | Owner |
| Source recovery | RISCK COMPLY owner | GitHub hosts source and history | Owner |
| App rollback | RISCK COMPLY owner | Vercel retains/promotes deployments | Owner |
| Secret recovery/rotation | RISCK COMPLY owner | Vercel/Supabase/Stripe store configured secrets | Owner |
| Storage recovery | RISCK COMPLY owner | Supabase Storage provider | Owner |
| Customer communication | RISCK COMPLY owner | Status/communications providers where used | Owner |

## RTO/RPO matrix

Numbers below are internal targets unless explicitly identified as provider capability. They are not contractual SLAs and are not represented as proven restore results.

| Service | TARGET_RTO | TARGET_RPO | Provider capability | VERIFIED_STATUS |
| --- | --- | --- | --- | --- |
| Application | 4h | last known-good deploy | Vercel immutable deployment history and rollback candidates observed | TARGET; rollback capability OBSERVED; end-to-end recovery NOT_PROVEN |
| Database | 8h | <=24h using Pro daily backups | Supabase Pro provider-managed daily backups, 7-day retention | Provider capability documented; restore runtime NOT_PROVEN |
| Auth | 8h | follows database/provider auth recovery boundary | Supabase Auth managed service and auth logs observed | TARGET; NOT_PROVEN by disaster exercise |
| Billing | 8h | provider event history / latest durable internal state | Stripe is external system of record for provider-side payment events; app state still depends on database/webhook reconciliation | TARGET; NOT_PROVEN by DR exercise |
| Documents in DB | 8h | <=24h where within DB backup scope | Follows database backup | TARGET; NOT_PROVEN |
| Customer files in Storage | 24h | UNKNOWN until storage-specific backup evidence exists | Database backup explicitly does not restore Storage object bytes | TARGET only; RPO UNVERIFIED |
| Customer data | 8h | <=24h for database-resident records | Follows database backup, excluding object bytes | TARGET; NOT_PROVEN |
| Audit data | 8h | <=24h if database-resident | Follows database backup | TARGET; NOT_PROVEN |

If PITR is later proven enabled, database RPO may be updated to the verified provider capability. Do not change this matrix based only on plan eligibility.

## Restore runbook

1. Declare incident and assign severity.
2. Freeze non-essential writes if operationally possible and approved.
3. Capture incident timestamp, suspected bad-change window, deployment SHA and affected tenants.
4. Identify last known-good application deployment and last acceptable database recovery point.
5. Confirm whether recovery requires database restore, application rollback, configuration recreation, storage recovery or multiple actions.
6. Obtain owner authorization for any destructive production restore/rollback.
7. Preserve logs/evidence before destructive action where feasible.
8. Execute provider restore/rollback using authorized account controls.
9. Validate authentication, tenant isolation, critical reads/writes, document access, audit logging and billing reconciliation.
10. Confirm customer impact and required notifications.
11. Record actual recovery start/end, actual data loss window and exceptions.
12. Run post-incident review and update this plan if evidence changed.

## Database recovery runbook

- Prefer the closest provider backup before the corruption/loss point.
- Confirm that restoration may make the project unavailable during the operation.
- Treat custom-role passwords and external secret material as separate recovery items.
- After restore, verify migrations/schema version, auth, RLS-sensitive flows, audit data, billing entitlements and data consistency.
- For logical recovery, use an authorized dump/export and restore into an approved clean environment before any production cutover.
- Never claim Storage object bytes are recovered by a database restore.

## Application / Vercel recovery runbook

- Identify last known-good production deployment and exact Git commit SHA.
- Confirm rollback candidate status in Vercel.
- With separate owner authorization, use Vercel rollback/promote controls.
- Validate `/api/health`/readiness surfaces where available, authentication, critical dashboard routes and provider integrations.
- If rollback is insufficient because database state is incompatible, escalate to coordinated DB/app recovery.

## GitHub recovery runbook

- Recover repository from GitHub and validate default branch and expected commit history.
- Recreate working copy from the exact known-good commit.
- Validate package lockfile and CI/security workflow presence before release.
- If GitHub is unavailable, use an approved maintained clone/mirror if one exists; no off-provider mirror was proven in this audit.

## Secrets recovery runbook

- Do not store secret values in documentation.
- Inventory secret names and provider locations, not values.
- Recover through authorized provider account access where possible.
- If original values are unavailable or suspected compromised, rotate and update dependent systems through a separately authorized change window.
- Validate webhook secrets, Supabase service credentials, OAuth credentials and monitoring credentials after rotation.

## Storage recovery runbook

- Determine whether impact affects metadata, object bytes or both.
- Database recovery can restore metadata only; object bytes require storage-specific recovery evidence.
- Enumerate affected buckets/objects and preserve current metadata.
- Use provider-supported recovery/export if available and authorized.
- If no recovery copy exists, classify as unrecoverable data loss and follow customer/legal notification procedure.

## Service recovery priorities

P0: authentication, tenant isolation, database integrity, critical application availability.  
P1: billing state/webhooks, customer documents, audit trail, storage access.  
P2: non-critical monitoring dashboards, reporting, secondary workflows.  
P3: cosmetic/non-critical functions.

## Dependency / provider outage matrix

| Dependency | Failure impact | Initial response | Recovery dependency |
| --- | --- | --- | --- |
| Vercel | Application/API unavailable or impaired | Confirm provider status, preserve logs, assess rollback options | Vercel service recovery or alternate pre-approved hosting plan |
| Supabase DB | Core data unavailable | Confirm provider status; stop risky writes; assess backup/restore | Supabase service/backup recovery |
| Supabase Auth | Login/session failures | Confirm auth logs/provider status; communicate impact | Supabase Auth recovery |
| Supabase Storage | File access/upload failure | Confirm storage logs/provider status; avoid deleting metadata | Supabase Storage recovery |
| Stripe | Checkout/billing lifecycle impaired | Preserve webhook/event evidence; avoid duplicate manual state changes | Stripe service/event recovery + reconciliation |
| GitHub | Release/source workflow impaired | Freeze non-essential releases | GitHub recovery or approved clone/mirror |
| Sentry/monitoring | Reduced error visibility | Use Vercel/Supabase/provider logs as fallback | Monitoring provider recovery |

## Business continuity plan

Continuity strategy is provider-first and fail-safe: preserve data integrity, prevent unsafe writes, maintain evidence, restore the smallest critical service set first, and communicate only verified impact. Manual workarounds must not bypass authorization, tenant isolation, payment verification or audit requirements.

Business continuity contact authority is the RISCK COMPLY owner unless a later approved roster delegates responsibility. No 24/7 staffed on-call commitment is claimed.

## DR test plan

Non-destructive exercises may be performed against an isolated disposable environment. Production restore or rollback requires separate explicit owner authorization.

Minimum exercise scope:
1. Recover exact source commit.
2. Bootstrap a clean authorized environment from migrations.
3. Restore a non-production backup/export where available.
4. Validate auth, RLS/tenant isolation, critical application flows and billing reconciliation using synthetic data.
5. Measure actual RTO and actual RPO.
6. Record provider constraints, failures and corrective actions.

Current state: `RESTORE_CAPABILITY=DOCUMENTED`; `RESTORE_RUNTIME_PROOF=PENDING_SAFE_DR_EXERCISE`.

## DR test evidence template

- Exercise ID / date
- Participants / approver
- Environment
- Source SHA
- Backup/recovery point used
- Recovery steps
- Start/end timestamps
- Actual RTO
- Actual RPO/data-loss window
- Validation checks and results
- Deviations
- Findings by severity
- Corrective actions / owners / due dates
- Evidence links
- Final status: PASS / PARTIAL / FAIL

## Known unproven items

- Production database restore has not been executed in this lane.
- PITR enabled state is not proven.
- Storage-object backup/recovery is not proven.
- Secrets recovery has not been exercised end-to-end.
- A complete clean-environment DR exercise is pending.

These items are explicitly retained rather than converted into unsupported PASS claims.