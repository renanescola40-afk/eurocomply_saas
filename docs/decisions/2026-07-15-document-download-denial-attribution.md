# Document download denial attribution boundary

Date: 2026-07-15
Status: Proposed in draft pull request
Priority: P1 audit integrity / tenant attribution

## Context

The signed document URL server action performs a tenant-scoped lookup across the authenticated user's organization memberships. When the lookup returns no accessible document, the code cannot distinguish an unknown document identifier from a document owned by another tenant.

The previous denial audit selected `organizationIds[0]` as the event organization in that unresolved state. That value represents only the caller's first membership; it is not evidence that the attempted document belongs to that organization. This could place a denial event in an unrelated tenant chronology and create misleading audit attribution.

This finding is based on repository source only. It does not claim observed production misuse, customer impact, external audit findings, or penetration-test results.

## Decision

For the `document_not_found_or_cross_tenant` path, record the denial with `organizationId: null` while retaining the actor, normalized document identifier, access purpose, and membership count.

Continue using the resolved document organization for later denial paths where the tenant is known, including permission denial, invalid tenant storage path, and signed URL creation failure.

## Impact

- Unknown and cross-tenant lookup denials are no longer attributed to an arbitrary organization membership.
- Tenant-scoped audit timelines avoid false organization attribution for unresolved resources.
- The external error remains `Document not found`, preserving the existing anti-enumeration behavior.
- Authentication, membership lookup, permission checks, fail-closed rate limiting, tenant-scoped database lookup, storage path validation, signed URL expiry, and success auditing are unchanged.
- No schema, migration, RLS, RBAC, entitlement, dependency, provider, secret, or public API change is introduced.

## Risks and trade-offs

- Organization-scoped audit views may not display unresolved denial events if they filter out global events. That is preferable to asserting a tenant association that is not known.
- The event still contains the attempted normalized document identifier. Existing audit access controls and retention rules continue to apply.
- The added test is a deterministic source-contract test; it does not prove production audit persistence or runtime provider behavior.

## Tests and evidence

A focused security test isolates the unresolved denial block and requires `organizationId: null` while forbidding `organizationIds[0]` in that block.

GitHub Actions remains authoritative for lint, typecheck, tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks on the exact pull-request head. No runtime evidence is created or upgraded by this change.

## Rollback

Revert the commits in the pull request. This restores the prior denial attribution and removes the focused regression contract and this decision record. No data migration, credential rotation, provider action, or deployment rollback is required.
