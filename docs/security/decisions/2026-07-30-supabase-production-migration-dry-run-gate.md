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

Repeated production dry-run attempts demonstrated a reliability boundary in automatic connection discovery: `supabase link` could complete while the subsequent `migration list --linked` command failed authentication against an automatically selected pooler. A standalone password plus project reference did not prove that the exact reviewed database endpoint, transport and project were the ones used by every remote command.

After moving to an explicit URL, two additional operational boundaries appeared:

1. browser and GitHub secret editors can preserve line breaks in long connection strings;
2. raw reserved password characters can make an otherwise correct Supabase connection string invalid for standard URL parsing.

Live validation then proved a separate credential boundary: after line breaks and URL encoding were repaired, the database returned `SQLSTATE 28P01`, meaning the endpoint was valid but the password embedded in the URL was stale or incorrect.

## Decision

Add a strict deployability mode to `scripts/supabase/audit-migration-drift.mjs`, a manual read-only production dry-run workflow, an explicit protected database endpoint contract and a scoped optional credential override for the read-only workflow.

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

### Explicit endpoint and scoped credential contract

Production migration controls use:

- `SUPABASE_PROJECT_ID`: the exact 20-character production project reference;
- `SUPABASE_DB_URL`: the complete PostgreSQL URI copied from Supabase Connect for the same project.

The read-only dry-run may additionally use:

- `SUPABASE_DB_PASSWORD`: an optional protected credential override.

The override replaces only the password component of the already validated `SUPABASE_DB_URL`. It never selects, discovers or changes the host, username, project, port or database. It is scoped to the connection-preparation step, is not available job-wide and is not consumed by the production write workflow.

`scripts/supabase/prepare-production-db-connection.mjs`:

1. removes CR/LF characters and adjacent indentation introduced by secret editors;
2. recognizes only an approved Supabase direct, Session Pooler or Transaction Pooler connection shape;
3. selects the protected password override when configured, otherwise the URL-embedded password;
4. canonicalizes reserved password characters while preserving existing valid `%HH` escapes;
5. validates that the resulting URI:
   - uses a PostgreSQL scheme;
   - targets an approved Supabase direct or pooler hostname;
   - uses port 5432 or 6543;
   - targets the `postgres` database;
   - contains a password;
   - identifies the same project as `SUPABASE_PROJECT_ID`;
   - contains no remaining literal whitespace, disallowed control character or unsafe fragment.

Normalization and canonicalization are intentionally narrow. They do not remove arbitrary characters, double-encode valid escapes, relax the Supabase hostname allowlist, permit a different project or convert an authentication failure into success.

The final URI is written to a temporary owner-readable file with mode `0600`. Remote CLI commands receive the URI through `--db-url`. The file is removed with `if: always()` and is never uploaded.

The retained connection diagnostic contains only transport, hostname, port, database, project-reference suffix, whitespace/line-break normalization counts, whether encoding was canonicalized and whether the override was used. It never contains the URL, username or either password source. Invalid inputs emit only a bounded structural diagnostic.

`supabase link` and automatic pooler discovery are not part of this workflow contract.

### Manual workflow

`.github/workflows/supabase-production-migration-dry-run.yml`:

1. runs only through `workflow_dispatch`;
2. requires the exact 40-character current `main` SHA;
3. requires the literal confirmation `DRY_RUN_ONLY`;
4. verifies checkout and remote `main` are the same SHA;
5. normalizes and validates the explicit production endpoint against the project reference;
6. applies the optional protected password override only during connection preparation;
7. stores connection material only in a temporary `0600` runner file;
8. captures remote migration history with `supabase migration list --db-url`;
9. runs focused connection and deployability tests;
10. runs the strict migration-history audit;
11. executes only `supabase db push --db-url ... --dry-run` when the audit passes;
12. removes connection material even on failure;
13. uploads non-secret drift, review-package and dry-run diagnostics even when blocked.

The workflow has read-only repository permissions and contains no actual migration push, `--include-all`, migration repair, reset or automatic confirmation flag.

## Safety boundaries

This workflow does not:

- execute database migrations;
- update migration history;
- use `supabase migration repair`;
- bypass unresolved drift;
- authorize `supabase db push` without `--dry-run`;
- expose a password override to unrelated steps;
- change the validated database endpoint;
- promote the override into the production write workflow;
- close issue #1415;
- replace independent review, backup, rollback or staged testing;
- retain database credentials in artefacts or logs.

If both the URL-embedded password and protected override are rejected with `SQLSTATE 28P01`, the workflow remains blocked until the current database password is retrieved or reset in the exact project.

The targeted live-RLS proof migration path documented separately remains a narrow exception and is not a general deployment mechanism.

## Consequences

### Positive

- Production migration dry-runs become bound to an exact reviewed SHA.
- Every remote command uses the same explicitly reviewed database endpoint.
- A stale embedded password can be replaced without rebuilding or exposing the URL.
- The URL/project relationship is checked before the CLI contacts production.
- Pooler and direct transports are distinguishable in non-secret evidence.
- Outer whitespace, accidental CR/LF characters and raw reserved password characters are normalized without printing connection material.
- Existing valid percent escapes are not double-encoded.
- Structural validation remains fail-closed after normalization.
- The current backlog blocks before any write-capable command.
- Operators receive a machine-readable blocker list and retained diagnostics.
- Tests prevent the workflow from silently acquiring write behavior or reverting to linked-project discovery.

### Trade-offs

- Operators must configure `SUPABASE_DB_URL` in the relevant protected GitHub environments.
- The read-only environment may temporarily contain two credential sources while authentication is reconciled.
- A structurally valid URI still cannot prove the selected password is current.
- The password override cannot be promoted to production writes without a separate reviewed decision.
- No production migration dry-run can proceed until credentials authenticate and issue #1415 reconciles all deployability blockers.
- Human review remains necessary after a successful dry-run and before any production write.

## Exit criteria for production write

Production migration execution is permitted only after:

- the strict audit returns `AUTHORIZED_FOR_DRY_RUN`;
- the dry-run artifact is retained and independently reviewed;
- the exact credential path used by the write workflow is separately reviewed;
- staged execution passes against a production-like clone;
- backup/PITR and rollback evidence are current;
- an explicit bounded migration plan is approved;
- the protected `production` environment grants independent approval;
- the write workflow uses the same explicit endpoint contract and exact SHA;
- remote migration history is checked before and after deployment.
