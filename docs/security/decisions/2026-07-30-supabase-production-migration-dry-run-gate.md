# ADR — Supabase Production Migration Dry-Run Authorization Gate

- **Date:** 2026-07-30
- **Amended:** 2026-07-31
- **Status:** Accepted
- **Decision owner:** Database Reliability / Release Engineering
- **Related issue:** #1415

## Context

The production migration drift audit reports a large unresolved backlog:

- 17 remote versions;
- 169 valid local-only versions;
- 21 invalid legacy filenames or timestamps;
- 16 duplicate local versions;
- status `PENDING_LOCAL_MIGRATIONS`.

A normal pull-request audit must remain useful and merge-friendly while local migrations are pending. A production migration operation requires a materially stricter standard. Without a separate authorization mode, an operator could mistake a non-critical audit result for permission to run a broad production migration command.

Repeated production dry-run attempts also demonstrated a reliability boundary in automatic connection discovery: `supabase link` could complete while the subsequent `migration list --linked` command failed authentication against an automatically selected pooler. A standalone password plus project reference did not prove that the exact reviewed database endpoint, transport and project were the ones used by every remote command.

## Decision

Add a strict deployability mode to `scripts/supabase/audit-migration-drift.mjs`, a manual read-only production dry-run workflow, and an explicit protected database connection contract.

### Deployability rules

`--require-deployable` authorizes proceeding to a dry-run only when all of the following are zero:

- unknown remote-only versions;
- pending local-only versions;
- invalid local filenames or timestamps;
- duplicate local versions.

The audit records:

- `deploymentAuthorization`;
- `deployabilityBlockers`;
- `safety.generalDbPushAuthorized`;
- a recommendation that distinguishes dry-run authorization from production-write authorization.

Exit codes are intentional:

- `0`: history is deployable enough to continue to a reviewed dry-run;
- `2`: critical unknown remote drift exists;
- `3`: deployability is blocked by pending, invalid or duplicate local history.

A successful audit never authorizes a production write.

### Explicit database connection contract

Production migration workflows use:

- `SUPABASE_PROJECT_ID`: the exact 20-character production project reference;
- `SUPABASE_DB_URL`: the complete percent-encoded PostgreSQL URI copied from Supabase Connect for the same project.

`scripts/supabase/prepare-production-db-connection.mjs` validates that the URI:

- uses a PostgreSQL scheme;
- targets an approved Supabase direct or pooler hostname;
- uses port 5432 or 6543;
- targets the `postgres` database;
- contains a password;
- identifies the same project as `SUPABASE_PROJECT_ID`;
- contains no embedded line breaks or unencoded fragment.

The normalized URI is written to a temporary owner-readable file with mode `0600`. Remote CLI commands receive the URI through `--db-url`. The file is removed with `if: always()` and is never uploaded.

The retained connection diagnostic contains only transport, hostname, port, database, project-reference suffix and whether outer whitespace was removed. It never contains the URL, username or password.

`SUPABASE_DB_PASSWORD`, `supabase link` and automatic pooler discovery are not part of this workflow contract.

### Manual workflow

`.github/workflows/supabase-production-migration-dry-run.yml`:

1. runs only through `workflow_dispatch`;
2. requires the exact 40-character current `main` SHA;
3. requires the literal confirmation `DRY_RUN_ONLY`;
4. verifies checkout and remote `main` are the same SHA;
5. validates the explicit production database URL against the project reference;
6. stores connection material only in a temporary `0600` runner file;
7. captures remote migration history with `supabase migration list --db-url`;
8. runs focused connection and deployability tests;
9. runs the strict migration-history audit;
10. executes only `supabase db push --db-url ... --dry-run` when the audit passes;
11. removes connection material even on failure;
12. uploads non-secret drift, review-package and dry-run diagnostics even when blocked.

The workflow has read-only repository permissions and contains no actual migration push, `--include-all`, migration repair, reset, or automatic confirmation flag.

## Safety boundaries

This workflow does not:

- execute database migrations;
- update migration history;
- use `supabase migration repair`;
- bypass unresolved drift;
- authorize `supabase db push` without `--dry-run`;
- close issue #1415;
- replace independent review, backup, rollback or staged testing;
- retain database credentials in artefacts or logs.

The targeted live-RLS proof migration path documented separately remains a narrow exception and is not a general deployment mechanism.

## Consequences

### Positive

- Production migration dry-runs become bound to an exact reviewed SHA.
- Every remote command uses the same explicitly reviewed database endpoint.
- The URL/project relationship is checked before the CLI contacts production.
- Pooler and direct transports are distinguishable in non-secret evidence.
- Outer whitespace is normalized without printing connection material.
- The current backlog blocks before any dry-run command.
- Operators receive a machine-readable blocker list and retained diagnostics.
- General PR drift audits remain informative without becoming permanently red.
- Tests prevent the workflow from silently acquiring write behavior or reverting to linked-project discovery.

### Trade-offs

- Operators must configure `SUPABASE_DB_URL` in the relevant protected GitHub environments.
- Special password characters must be percent-encoded inside the URI.
- No production migration dry-run can proceed until issue #1415 reconciles all deployability blockers.
- Human review remains necessary after a successful dry-run and before any production write.

## Exit criteria for production write

Production migration execution is permitted only after:

- the strict audit returns `AUTHORIZED_FOR_DRY_RUN`;
- the dry-run artifact is retained and independently reviewed;
- staged execution passes against a production-like clone;
- backup/PITR and rollback evidence are current;
- an explicit bounded migration plan is approved;
- the protected `production` environment grants independent approval;
- the write workflow uses the same explicit URL contract and exact SHA;
- remote migration history is checked before and after deployment.
