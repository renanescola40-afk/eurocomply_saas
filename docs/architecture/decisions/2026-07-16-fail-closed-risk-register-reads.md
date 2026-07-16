# Fail closed on risk-register read failures

- Date: 2026-07-16
- Status: Proposed
- Scope: organization risk-register read boundary

## Context

`listRisks` used `tryCreateAdminClient()` and returned an empty array when the privileged Supabase client was unavailable. It also returned an empty array when the database query failed.

That behavior made materially different states indistinguishable:

1. the organization genuinely has no recorded risks; and
2. the application could not read the risk register because of missing service-role configuration, a missing table, a provider/database outage, or another query failure.

A false empty risk register can mislead dashboards, governance reviews, evidence preparation, remediation prioritization, and release decisions. It can also suppress operational detection by presenting an infrastructure failure as valid business data.

## Decision

Use the required `createAdminClient()` for risk-register reads. When the query fails, log only the provider error code and propagate the error to the existing secure server error boundary.

A successful query that returns zero rows continues to return an empty array. Only failed reads are changed.

## Impact

- Risk views and dependent workflows fail visibly when privileged database access or the query is unavailable.
- Database and configuration failures are no longer represented as a valid empty register.
- Organization scoping, ordering, authorization boundaries, schema, RLS, RBAC, and dependencies are unchanged.
- No runtime, migration, audit, pentest, or production-availability evidence is created or claimed.

## Risks

Some pages or workflows that previously showed an empty state during a Supabase failure will now reach their configured error boundary. This is intentional fail-closed behavior and may expose missing error handling that should be addressed separately rather than masking the underlying failure.

## Verification

A regression contract verifies that the query module:

- uses `createAdminClient()` and not `tryCreateAdminClient()`;
- throws database query errors after sanitized code-only logging;
- does not return an empty array from the error branch;
- still returns an empty array for a successful zero-row result.

GitHub Actions on the exact pull-request head remains the source of truth for lint, typecheck, tests, security gates, and build status.

## Rollback

Revert this pull request. No database or infrastructure rollback is required. Reverting restores the prior best-effort behavior and its documented risk of masking read failures as an empty risk register.
