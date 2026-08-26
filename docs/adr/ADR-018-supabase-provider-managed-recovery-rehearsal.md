# ADR-018 — Supabase provider-managed recovery rehearsal

## Status

Proposed for PR #1854. This ADR does not authorize Production migration promotion or creation of a billable restore project.

## Context

The previous S1 recovery rehearsal transported a logical Production database dump through a GitHub-hosted runner. That creates an unnecessary customer/Auth data handling boundary. S1 still needs a real Production-backup restore, exact-SHA binding, bounded migration execution, postcondition validation, RPO/RTO evidence, and fail-closed cleanup.

## Decision

Use Supabase **Restore to a New Project** as the snapshot transport boundary. Production row data remains inside Supabase. GitHub Actions receives only the Management API token through the protected `supabase-production-migration-dry-run` environment and uses it for:

1. read-only aggregate observation of the source project;
2. metadata verification that the supplied restore is distinct, healthy, same-organization and same-region;
3. SQL execution only against the explicitly supplied restored project for the manifest-selected migrations and approved read-only validators;
4. guaranteed deletion of the restored project on every workflow exit path.

The source project ref is derived from the canonical Production Supabase URL. The restore ref is an explicit dispatch input and must differ from the source. Cleanup re-fetches both projects and revalidates distinct ref, organization and region before issuing deletion. It never deletes the source ref.

## Authority boundary

This architecture does **not** authorize writes to Production. Production observation uses the Management API read-only SQL endpoint. Migration SQL is sent only to the isolated restored project. Production promotion remains a separate workflow with separate exact-SHA, rehearsal, dry-run, human decision and environment-governance gates.

Creation of the restore project is intentionally outside CI because it can create provider cost and requires owner approval. S1 consumes an already approved restore and destroys it after the exercise.

## Validator behavior

Management API SQL does not implement `psql` meta-commands. The rehearsal therefore fails closed on every unreviewed meta-command. The exact `\\set ON_ERROR_STOP on` directive may be removed because Management API execution already fails the request on SQL error. The one current `\\ir validate-gap-remediation-runtime.sql` dependency is explicitly allowlisted and its target is executed separately as an approved validator in the same fail-closed workflow. Any new `\\ir`, `\\copy`, or other `psql` directive requires explicit review before S1 can pass.

SQL file paths are allowlisted before file contents are read. Selected migrations additionally must match the immutable manifest digest before their contents can be submitted to the isolated restore project.

## Failure and cleanup

The evidence upload and restore-project cleanup both use `if: always()`. Cleanup is fail-closed and project-bound. The dispatch must include the exact destructive confirmation `DELETE <restore_project_ref> AFTER REHEARSAL`; the teardown script also revalidates source != restore, organization and region immediately before deletion. A failed cleanup makes the workflow fail and requires operator intervention; the restore ref must not be persisted in public evidence. No logical Production dump is created on the runner.

Cleanup ownership belongs to S1 once a pre-created restore project is handed to the workflow. The workflow is not authorized to create the clone, change Production, or delete any project other than the exact confirmed restore target.

## Rollback

Rollback of this architecture is to disable the provider-managed S1 dispatch and leave Production unchanged. Do not restore the GitHub-hosted Production dump path. If the Management API path becomes unavailable, S1 remains blocked until an equivalent provider-contained or approved isolated recovery boundary exists.

If teardown fails, do not rerun migrations or widen permissions. Quarantine the restore target, delete it through the same verified provider boundary, record the cleanup failure, and repeat S1 from a new approved restore only after cleanup is confirmed.

## Consequences

Positive: Production row data and Auth records do not transit GitHub-hosted runners; S1 retains a real provider backup restore; clone lifetime is bounded; Production remains read-only from S1.

Trade-off: an approved temporary Supabase project is required and may incur provider cost until cleanup completes. Management API availability becomes part of the rehearsal dependency chain.