# Fail closed on current-organization membership reads

- Status: Proposed
- Date: 2026-07-17
- Priority: P1
- Scope: tenant context, authentication flow, authorization context, onboarding routing

## Context

`getUserOrganizationMemberships` is the shared source used to derive a user's current organization. The previous implementation used `tryCreateAdminClient()` and returned an empty list when privileged Supabase configuration was unavailable. It also returned an empty list when the `organization_members` query failed.

An empty membership list is a valid business state for a user who has not joined or created an organization. Reusing that state for configuration, schema, provider, connectivity, or database failures made unavailable tenant context indistinguishable from a real no-organization state.

That ambiguity can send an existing member through onboarding, make authorization and audit helpers behave as though there is no tenant, or cause protected document flows to reject access with the wrong business explanation. It also hides an operational incident from existing error boundaries and monitoring.

## Decision

- Require `createAdminClient()` for organization-membership reads.
- Propagate missing privileged-client configuration.
- Log only the sanitized Supabase error code when the membership query fails.
- Throw the stable application error `organization_memberships_unavailable` on query failure.
- Return an empty membership list only after a successful query returns zero rows.
- Preserve user scoping, deterministic membership ordering, read limits, normalization, and current-organization selection semantics.

## Impact

Callers can distinguish unavailable tenant context from a legitimate user with no organization. Existing error boundaries may now surface an unavailable state where the previous implementation silently redirected or rendered no-organization behavior.

No database schema, migration, RLS policy, RBAC rule, dependency, secret, membership mutation, or organization-selection order is changed.

## Risks and limitations

- Callers that implicitly relied on the synthetic empty list may now surface existing error UI.
- This change does not redesign current-organization selection when a user belongs to multiple organizations.
- This change does not prove tenant isolation or the correctness of RLS policies.
- The regression test is a source-level contract; required CI, typecheck, lint, build, and security gates remain necessary.

## Evidence

The previous implementation contained both `if (!supabase) return []` and an error branch that returned `[]`. The proposed implementation requires the privileged client and throws a stable error after sanitized logging.

No runtime evidence, penetration-test result, audit certification, or production verification is claimed by this decision record.

## Rollback

Revert the commits in the pull request. Reversion restores the previous behavior that represents membership-read failures as an empty membership list. No database, provider, dependency, or secret rollback is required.
