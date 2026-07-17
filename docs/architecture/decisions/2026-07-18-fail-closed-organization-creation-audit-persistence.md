# Fail closed when organization creation audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Scope: `createOrganization`

## Context

Organization creation establishes a new tenant and its first owner through the atomic `create_organization_with_owner_atomic` RPC. The action previously sent the onboarding email and returned the tenant even when the shared audit writer reported that `organization.created` was not durably persisted.

That behavior creates an accountability gap at the tenant security boundary: a tenant and owner membership can become active without durable creation evidence.

## Decision

The action must require `logAuditEvent(...).persisted === true` before sending onboarding email or returning the created organization.

When persistence is unavailable, the action performs a best-effort compensating deletion of the exact organization, scoped by organization ID, creator ID, and slug. The existing `organization_members.organization_id` foreign key cascades deletion of the first-owner membership. Compensation failures are reported through sanitized observability and the caller receives a generic failure.

## Consequences

- Successful organization creation now has durable audit evidence.
- Audit-store outages intentionally reduce tenant-creation availability.
- Compensation is best effort rather than a cross-system transaction; operators must investigate the sanitized compensation alert if deletion fails.
- No onboarding email is sent for an unaudited tenant.

## Evidence boundary

This change and its source-contract test demonstrate the intended fail-closed code path. They do not prove production database availability, production audit persistence, alert delivery, or successful compensation in a live environment.

## Rollback

Revert the action, test, and this ADR. Reverting restores the prior fail-open behavior and must not be described as preserving the audit-integrity guarantee.
