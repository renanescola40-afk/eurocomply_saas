# Recovery resilience exercise

## Ownership

- Incident commander: production owner approving the `production-recovery` environment.
- Executor: GitHub Actions workflow `Recovery Resilience Proof`.
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
- `RECOVERY_ISOLATED_DATABASE_URL`

The isolated database must be disposable, must not serve customers, and must not equal the production connection string.

## Backup and restore procedure

1. Open Actions → Recovery Resilience Proof → Run workflow.
2. Select `backup-restore`.
3. Approve the protected environment.
4. The workflow creates a custom-format logical backup.
5. The workflow restores with `--clean --if-exists` into the isolated database.
6. It compares aggregate counts for organizations, organization memberships and audit logs.
7. It verifies RLS is enabled and policies exist after restore.
8. It records RPO/RTO and deletes the dump.
9. Review the redacted evidence artifact before accepting any scorecard promotion.

## Controlled rollback procedure

1. Confirm the known-good deployment previously served production and is healthy.
2. Confirm its commit SHA differs from the current production SHA.
3. Open Actions → Recovery Resilience Proof → Run workflow.
4. Select `production-rollback`.
5. Enter exactly `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK`.
6. Approve the protected environment.
7. The workflow invokes Vercel Instant Rollback, checks rollback status and validates `/api/health` plus `Cache-Control: no-store` on the production hostname.
8. Review the generated evidence and incident timeline.

## Abort conditions

Do not approve execution when the target deployment is unknown, database migrations are backward-incompatible, provider configuration has changed incompatibly, the isolated database is not disposable, or incident command has not named a rollback owner.

## Recovery after the exercise

Vercel disables automatic production-domain assignment while a rollback is active. After the exercise, explicitly promote the intended current deployment and verify production health, readiness, billing webhooks, authentication and tenant-scoped dashboard access before closing the exercise.

## Evidence acceptance

Evidence is accepted only when it is `Complete/passed`, exact-SHA bound, has no failures, contains no sensitive values, and all controls referenced by `scripts/recovery/check-recovery-evidence.mjs` pass.
