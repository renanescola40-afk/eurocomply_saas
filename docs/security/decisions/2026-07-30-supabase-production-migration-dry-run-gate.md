# ADR — Supabase Production Migration Dry-Run Authorization Gate

- **Date:** 2026-07-30
- **Status:** Accepted
- **Decision owner:** Database Reliability / Release Engineering
- **Related issue:** #1415

## Context

The production migration drift audit currently reports a large unresolved backlog:

- 17 remote versions;
- 169 valid local-only versions;
- 21 invalid legacy filenames or timestamps;
- 16 duplicate local versions;
- status `PENDING_LOCAL_MIGRATIONS`.

A normal pull-request audit must remain useful and merge-friendly while local migrations are pending. A production migration operation requires a materially stricter standard. Without a separate authorization mode, an operator could mistake a non-critical audit result for permission to run a broad production migration command.

## Decision

Add a strict deployability mode to `scripts/supabase/audit-migration-drift.mjs` and a manual, read-only production dry-run workflow.

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

### Manual workflow

`.github/workflows/supabase-production-migration-dry-run.yml`:

1. runs only through `workflow_dispatch`;
2. requires the exact 40-character current `main` SHA;
3. requires the literal confirmation `DRY_RUN_ONLY`;
4. verifies checkout and remote `main` are the same SHA;
5. requires the configured production Supabase project credentials;
6. links the exact production project;
7. captures remote migration history;
8. runs focused deployability tests;
9. runs the strict migration-history audit;
10. executes only `supabase db push --dry-run` when the audit passes;
11. uploads drift and dry-run diagnostics even when blocked.

The workflow has read-only repository permissions and contains no actual migration push, `--include-all`, or automatic confirmation flag.

## Safety boundaries

This workflow does not:

- execute database migrations;
- update migration history;
- use `supabase migration repair`;
- bypass unresolved drift;
- authorize `supabase db push` without `--dry-run`;
- close issue #1415;
- replace independent review, backup, rollback or staged testing.

The targeted live-RLS proof migration path documented separately remains a narrow exception and is not a general deployment mechanism.

## Consequences

### Positive

- Production migration dry-runs become bound to an exact reviewed SHA.
- The current 169-version backlog blocks before any dry-run command.
- Operators receive a machine-readable blocker list and retained diagnostics.
- General PR drift audits remain informative without becoming permanently red.
- Tests prevent the workflow from silently acquiring write behavior.

### Trade-offs

- No production migration dry-run can proceed until issue #1415 reconciles all deployability blockers.
- Human review remains necessary after a successful dry-run and before any future write workflow is designed.
- The workflow depends on production Supabase credentials configured in GitHub Actions.

## Exit criteria for a future write workflow

A production-write workflow may be proposed only after:

- the strict audit returns `AUTHORIZED_FOR_DRY_RUN`;
- the dry-run artifact is retained and independently reviewed;
- staged execution passes against a production-like clone;
- backup/PITR and rollback evidence are current;
- an explicit bounded migration plan is approved;
- a separate PR introduces a write workflow with protected-environment approval.
