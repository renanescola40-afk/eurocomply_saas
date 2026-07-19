# Fail closed when organization-creation rate limiting is unavailable

- Status: Proposed
- Date: 2026-07-19
- Area: Authentication, tenant lifecycle, abuse control, SRE
- Priority: P1

## Context

`createOrganization` creates a new tenant and its first owner through the backend-only atomic `create_organization_with_owner_atomic` RPC. The action already authenticates the caller, validates bounded input, limits each user to three attempts per ten minutes, requires durable creation-audit persistence, and compensates when that audit cannot be stored.

The limiter call selected the repository's `general-api` policy without overriding its provider-failure behavior. That policy is intentionally fail open because it is designed for lower-risk requests. Organization creation is not a lower-risk request: every allowed call can allocate a tenant, first-owner membership, database rows, audit work, and onboarding email work.

If the distributed limiter provider is missing or unavailable in production, inheriting `general-api`'s fail-open mode permits organization creation to continue without the intended abuse-control boundary.

## Decision

Keep the existing organization-creation threshold and `general-api` policy identifier, but explicitly set `failureMode: 'fail-closed'` on this action.

The limiter remains before the atomic tenant-creation RPC. A limiter denial or provider failure therefore stops the request before any tenant, membership, audit, or email mutation occurs.

## Consequences

### Positive

- Organization creation cannot silently bypass its distributed abuse-control boundary during limiter-provider failure.
- The change is limited to one high-impact action and does not alter the shared behavior of lower-risk `general-api` callers.
- Existing authentication, validation, atomic creation, durable audit, compensation, and email sequencing remain unchanged.

### Trade-offs

- A distributed limiter outage makes new-tenant creation temporarily unavailable.
- Existing authenticated organizations and unrelated lower-risk API traffic are unaffected.
- The current key remains user-scoped; coordinated abuse across multiple authenticated identities requires separate identity and signup controls.

## Evidence boundaries

This decision is based on repository source: the organization action selected `general-api`, and the central policy defines that policy as fail open. The regression test verifies the explicit override remains before the tenant-creation RPC.

This is not evidence of a production abuse event, a provider outage, a penetration test, an external audit, or operational effectiveness in a deployed environment.

## Verification

- Run `tests/security/organization-creation-rate-limit-fail-closed.test.ts`.
- Run the repository's required lint, typecheck, unit, build, security, dependency, secret-scanning, enterprise-readiness, and release checks on the exact pull-request head.
- Confirm human review accepts the availability trade-off.

## Rollback

Revert the source, test, and this decision record together. No migration, data backfill, dependency, secret, environment-variable, or infrastructure rollback is required.
