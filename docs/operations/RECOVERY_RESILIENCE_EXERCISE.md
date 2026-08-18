# Recovery resilience exercise

## Ownership

- Incident commander: production owner approving the `production-recovery` environment.
- Executor: GitHub Actions workflows `Recovery Resilience Proof` and `Enterprise Recovery Drill`.
- Reviewer: a second repository owner or security reviewer.

## Required protected secrets

### Rollback lane

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_URL`
- `LAST_KNOWN_GOOD_DEPLOYMENT_URL`
- `LAST_KNOWN_GOOD_COMMIT_SHA`

### Backup and restore lane

- `RECOVERY_SOURCE_DATABASE_URL`

The isolated restore target is created ephemerally by the workflow from the exact-SHA checkout. It must not be supplied as a persistent production secret, must not serve customers, and must identify a database different from the source/production database.

`Enterprise Recovery Drill` and `Recovery Resilience Proof` both use the dedicated `production-recovery` environment for backup/restore authority. Do not place the recovery source credential in migration-review or migration-dry-run environments merely to make a recovery control pass. Provider authentication can be proven independently by those workflows, but the full recovery exercise remains a distinct control.

## Protected prerequisite and producer boundaries

Before any protected database credential is referenced, the workflow verifies that the requested SHA is the exact current `main` SHA and that the `production-recovery` environment is protected by the required reviewer and protected-branch policy.

After the protected environment is approved, the workflow performs setup without database credentials, provisions the disposable Supabase restore target, and then revalidates exact current `main` plus environment governance immediately before the first secret-bearing preflight/backup step. Recovery secrets are step-local; they are not job-level environment variables and therefore are not exposed to checkout, dependency installation, CLI setup or target provisioning.

The protected proof then runs `scripts/security/preflight-protected-proof.mjs`. The preflight is fail-closed and records only:

- whether each required configuration name is present;
- whether the requested SHA matches the GitHub Actions SHA;
- whether the required confirmation matched, as a boolean only;
- the selected recovery exercise;
- whether both PostgreSQL URLs can be reduced to an unambiguous canonical database identity;
- whether those canonical source and isolated identities are different, as a boolean only.

For backup/restore, isolation is based on canonical `host:port/database` identity. Credentials, PostgreSQL URI spelling, an omitted versus explicit default port (`5432`), TLS settings and query-parameter order cannot make the same database count as isolated. Connection strings that try to override identity through query parameters such as `host`, `port`, `dbname`, `service` or related fields are treated as ambiguous and block the exercise rather than being guessed safe.

The preflight does **not** store secret values, credentials, database URLs, canonical database identities, provider URLs, confirmation strings or provider responses, and it performs no runtime mutation. A blocked preflight is retained as a redacted artifact.

## Deterministic PostgreSQL client boundary

Protected recovery workflows do not run `apt-get update` or install an unpinned host `postgresql-client`. The exact Supabase recovery target is pinned to Supabase Postgres `17.6.1.127` / PostgreSQL `17.6.x` before restored data is loaded.

A temporary `psql` shim in the runner `PATH` forwards repository-controlled validation queries to that exact per-run database container:

- loopback URLs for the disposable restore target are converted to an internal `psql -U postgres -d postgres` connection inside the container;
- the protected remote source URL is passed to the same container client for read-only validation queries;
- the shim uses `docker exec` without a shell, validates the expected per-run container identity, applies a bounded timeout and never prints database URLs or raw provider errors.

The shim exists only for the workflow run and the disposable Supabase target, volumes and firewall rules are removed by the `always()` cleanup path.

## Backup and restore procedure

1. Open Actions → Recovery Resilience Proof (or Enterprise Recovery Drill for the automatic backup/restore lane).
2. Select `backup-restore` when using Recovery Resilience Proof.
3. Approve the protected `production-recovery` environment.
4. The workflow verifies exact current `main`, sets up the pinned Supabase CLI and deterministic `psql` shim, and starts the disposable Supabase Postgres 17 target without loading the source credential.
5. The workflow revalidates exact current `main` and `production-recovery` governance at the producer boundary.
6. The protected preflight verifies the backup/restore prerequisite group and canonical database isolation without storing either connection string or canonical identity.
7. The workflow performs supported Supabase logical role, schema and data dumps from the protected source; managed vector-storage data that Supabase owns is excluded by the existing evidence contract.
8. It restores transactionally into the disposable target, reconciles exact extension name/schema/version parity, and compares aggregate counts for organizations, organization memberships, audit logs and `auth.users`.
9. It verifies RLS and policies after restore, records RPO/RTO, removes logical dump files and destroys the disposable target.
10. Review the redacted exact-SHA evidence artifact before accepting any scorecard promotion.

## Controlled rollback procedure

1. Confirm the known-good deployment previously served production and is healthy.
2. Confirm its commit SHA differs from the current production SHA.
3. Open Actions → Recovery Resilience Proof → Run workflow.
4. Select `production-rollback`.
5. Enter exactly `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK`.
6. Approve the protected environment.
7. The protected preflight verifies the rollback prerequisite group without storing provider credentials or URLs.
8. The workflow revalidates a second producer boundary immediately before the live rollback, invokes Vercel Instant Rollback, checks rollback status and validates `/api/health` plus `Cache-Control: no-store` on the production hostname.
9. Review the generated evidence and incident timeline.

## Abort conditions

Do not approve execution when the target deployment is unknown, database migrations are backward-incompatible, provider configuration has changed incompatibly, the isolated database is not disposable, `production-recovery` governance is not hardened, the preflight cannot establish an unambiguous different database identity, or incident command has not named a rollback owner.

Any new commit on `main` after approval invalidates the producer boundary. Rerun against the new exact SHA rather than reusing an older artifact.

## Recovery after the exercise

Vercel disables automatic production-domain assignment while a rollback is active. After the exercise, explicitly promote the intended current deployment and verify production health, readiness, billing webhooks, authentication and tenant-scoped dashboard access before closing the exercise.

## Evidence acceptance

Preflight evidence is diagnostic only and never earns recovery or final-technical PASS credit. Canonical recovery evidence is accepted only when it is `Complete/passed`, exact-SHA bound, has no failures, contains no sensitive values, and all controls referenced by `scripts/recovery/check-recovery-evidence.mjs` pass.
