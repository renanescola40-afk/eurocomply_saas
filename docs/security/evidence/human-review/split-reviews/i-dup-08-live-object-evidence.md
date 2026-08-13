# I-DUP-08 live object evidence

Status: technical review evidence only.

Files in this duplicate-version group:

- `20260629113000_onboarding_activation_runs_delete_policy.sql`
- `20260629113000_onboarding_activation_runs_rls_helper.sql`

## Standalone delete policy

Technical disposition candidate: `SUPERSEDED`.

The standalone delete migration allowed `owner`, `admin`, and `compliance_manager` to delete onboarding activation runs. Current production instead exposes the canonical policy `rls_onboarding_activation_runs_delete_admin` with only `owner` and `admin`, which is strictly narrower.

The later canonical consolidation migration `20260812225906_consolidate_canonical_rls_and_client_grants.sql` explicitly requires `rls_onboarding_activation_runs_delete_admin` and FORCE RLS as part of the accepted live policy surface. The broader historical delete policy should therefore not be replayed.

## Self-contained onboarding RLS helper

Technical disposition candidate: `ALREADY_PRESENT_IN_SCHEMA`, with later canonical evolution.

Current production shows:

- `onboarding_activation_runs` with RLS and FORCE RLS enabled;
- canonical SELECT/INSERT/UPDATE/DELETE policy names from the helper migration;
- organization predicates automatically referencing the later private helpers under `app_private`;
- INSERT/UPDATE writer roles expanded by later policy evolution to include `editor` in addition to owner/admin/compliance_manager;
- DELETE narrowed to owner/admin.

Repository migration `20260812225906_consolidate_canonical_rls_and_client_grants.sql` makes this evolved policy set an explicit required postcondition and aligns authenticated table grants with it.

The technical conclusion is that the self-contained helper migration's foundational RLS effect is present, but the current canonical policy body is the later hardened form rather than a reason to replay the duplicate-version SQL.

## Boundary

This file records technical evidence only. It does not execute SQL, alter migration history, record independent approval, or authorize a database change.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
