# Fail closed on compliance activity read failures

- **Status:** Accepted
- **Date:** 2026-07-17
- **Severity:** P1
- **Scope:** audit visibility, notifications, governance integrity, SRE

## Context

The shared compliance activity queries used the optional Supabase admin-client factory and returned empty arrays when the privileged client was unavailable. They also returned empty arrays for database errors, including schema, provider, connectivity, and query failures.

An empty audit trail and an empty notification inbox are both valid business states. Returning the same values for infrastructure failures made those states indistinguishable. Enterprise users and operators could therefore see an apparently clean activity view while the underlying records were unavailable.

## Decision

The authenticated organization read paths now:

1. require `createAdminClient()`;
2. preserve the existing `organization_id` tenant filters, descending creation ordering, and result limits;
3. log only the provider error code;
4. throw stable, sanitized application errors on query failure;
5. return empty arrays only after successful zero-row reads.

The existing demo-only fallback for users without an organization remains unchanged. No mutation, schema, RLS, RBAC, audit-chain, or notification-delivery behavior is modified.

## Consequences

### Positive

- Audit and notification infrastructure failures cannot masquerade as valid empty states.
- Enterprise governance views fail visibly rather than presenting misleading absence data.
- Provider errors are not propagated to callers.
- Tenant isolation and deterministic ordering remain intact.

### Risks

- Previously hidden database or service-role configuration failures may now reach existing error boundaries.
- Callers that implicitly relied on fail-open empty states may expose their existing error UI or fail a job.

This is intentional. Unavailable audit or notification data must be treated as an operational failure, not as evidence that no records exist.

## Evidence and limitations

The repository diff, regression contract, and GitHub Actions results prove code-level behavior only. They do not prove production database availability, deployed schema state, runtime service-role configuration, or successful production queries. This decision does not create or claim runtime evidence, an external audit, or a penetration-test result.

## Verification

- Run `npx vitest run tests/security/compliance-activity-read-fail-closed.test.ts`.
- Run the repository-required lint, typecheck, unit, security, and release checks in GitHub Actions.
- Treat the change as incomplete until required checks for the exact PR head SHA pass.

## Rollback

Revert the pull request. No database migration, secret rotation, dependency rollback, or provider change is required.
