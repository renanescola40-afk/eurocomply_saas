# Fail closed when compliance-task deletion audit persistence fails

- Status: Proposed
- Date: 2026-07-18
- Scope: `deleteComplianceTask`
- Risk classification: P1 audit integrity and AI-governance accountability

## Context

Compliance tasks represent organization-scoped remediation and governance work. Deleting a task changes the evidence available to operators, reviewers, and incident responders.

The deletion action already required an authenticated user, the tenant-scoped `tasks:delete` permission, a fail-closed distributed rate limit, and an organization-scoped delete. However, it discarded the explicit persistence result returned by the audit writer. The action could therefore return the deleted task as a successful result while the durable `task.delete` audit event had not been stored.

That behavior created an accountability gap: governance work could disappear without durable evidence identifying the actor, tenant, entity, and operation.

## Decision

A compliance-task deletion is successful only when its corresponding audit event is durably persisted.

The action now:

1. Deletes the task with both task ID and organization ID constraints.
2. Returns the complete deleted row from the database mutation.
3. Writes the `task.delete` audit event.
4. Checks the audit writer's explicit `persisted` result.
5. If persistence fails, attempts to restore the exact deleted row and returns the existing generic deletion error.
6. Reports restoration failures through sanitized observability context without exposing task contents.

## Impact

Successful task deletions now have durable accountability evidence. When audit storage is unavailable, deletion availability is intentionally reduced instead of silently accepting an unaudited governance mutation.

The compensation path preserves the original row values, including identifiers, tenant ownership, timestamps, assignment, status, and descriptive fields returned by the database.

## Risks and trade-offs

- The restore is best-effort rather than a database transaction spanning the task table and append-only audit subsystem.
- A restoration failure can leave the task deleted; this is reported through operational observability and the caller still receives failure rather than false success.
- Re-inserting the exact row may fail if another operation has already reused a constrained value. The primary-key identifier makes accidental replacement impossible; the insert does not overwrite another row.
- Audit subsystem availability becomes part of the deletion availability boundary by design.

## Evidence boundaries

This change provides source-level behavior and a regression guard. It does not claim production execution, an external audit, a penetration test, or successful runtime compensation under real infrastructure failure.

Merge readiness requires all required exact-head lint, typecheck, unit, build, security, dependency, secret-scanning, enterprise-readiness, and release checks to pass.

## Rollback

Revert the commits in this pull request. That restores the previous behavior in which deletion success was independent of the audit writer's persistence result. No schema migration or data backfill is introduced.
