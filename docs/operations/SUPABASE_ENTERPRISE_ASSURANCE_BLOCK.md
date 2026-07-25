# Supabase Enterprise Assurance Block

## Objective

Make Supabase changes reviewable, reproducible and promotion-safe without claiming that repository checks prove the live production database.

## Mega-block scope

This block consolidates ten operational workstreams:

1. deterministic migration naming;
2. duplicate migration timestamp prevention;
3. immutable SHA-256 migration inventory;
4. destructive SQL review detection;
5. `SECURITY DEFINER` search-path hardening;
6. tenant-table RLS inventory;
7. `FORCE ROW LEVEL SECURITY` review inventory;
8. repository-visible policy inventory;
9. exact-commit CI evidence;
10. staging, production, backup and rollback promotion controls.

## Environments

### Local

- use Supabase CLI or an isolated development project;
- never use production service-role credentials;
- reset and replay the complete migration history before requesting review.

### Staging

- use a dedicated Supabase project with a different project reference;
- use test-mode Stripe and non-production email providers;
- apply migrations from the exact GitHub SHA under assessment;
- run tenant-isolation tests with two synthetic organizations;
- run application smoke tests and retain evidence;
- test rollback or forward-fix instructions before production approval.

### Production

- production credentials belong only to protected deployment environments;
- migration execution requires an approved change record;
- the deployed application SHA and migration evidence SHA must match;
- destructive changes require the marker `enterprise-migration-review: approved` plus human approval;
- service-role credentials must never be available to browser code or untrusted PR jobs.

## Required promotion evidence

A production migration is not complete until the following are observed:

- exact GitHub commit SHA;
- generated Supabase assurance artifact;
- staging project reference, redacted;
- successful full migration replay or schema apply;
- two-tenant isolation result;
- backup/PITR status and retention confirmed;
- restore test date and owner;
- migration start/end timestamps;
- production project reference, redacted;
- post-migration `/api/health` and protected `/api/ready` checks;
- rollback or forward-fix decision.

## Backup and recovery

Repository code cannot prove that Supabase backups exist. The database owner must verify in the provider control plane:

- backup feature and retention appropriate to the plan;
- point-in-time recovery when contractually required;
- restore permissions restricted to named operators;
- quarterly restore exercise into an isolated project;
- RPO and RTO recorded from the observed exercise;
- restored data destroyed after evidence capture.

Never restore production data into developer-controlled infrastructure without an approved data-handling plan.

## Migration policy

### Automatically blocked

- filenames outside `YYYYMMDDHHMMSS_description.sql`;
- duplicate timestamps;
- tenant tables without repository-visible RLS enablement;
- `SECURITY DEFINER` functions without a fixed `search_path`.

### Human review required

- `DROP TABLE`;
- `DROP SCHEMA`;
- `TRUNCATE`;
- `DROP COLUMN`;
- column type changes;
- tenant tables without repository-visible forced RLS;
- tenant tables without a repository-visible policy.

Review-required findings are not automatically treated as defects because historical migrations can legitimately be superseded. They must be triaged before strict production promotion.

## Safe rollout sequence

1. Freeze unrelated schema changes.
2. Capture the target GitHub SHA.
3. Run `node scripts/database/audit-supabase-enterprise.mjs --write`.
4. Review all `ReviewRequired` findings.
5. Replay migrations in an isolated database.
6. Apply to staging.
7. Run two-tenant isolation and application smoke tests.
8. Confirm backup and restore readiness.
9. Obtain production approval.
10. Apply the exact reviewed migration set.
11. Run health/readiness and core business smoke tests.
12. Store evidence and release the schema freeze.

## Rollback rules

Prefer forward-compatible migrations and expand/migrate/contract deployment patterns.

Do not automatically reverse a production migration when:

- data has been transformed irreversibly;
- the application has already written using the new schema;
- rollback would remove audit evidence;
- dependent webhooks or jobs have consumed new fields.

In these cases, disable affected writes and execute an approved forward fix.

## Truth boundary

This block proves repository-side controls only. It does not prove:

- which Supabase project is connected to Vercel;
- that staging is physically separate;
- that migrations were applied successfully;
- that backups or PITR are enabled;
- that a restore test passed;
- that production tenant isolation passed.

Those items require live, redacted operator evidence.
