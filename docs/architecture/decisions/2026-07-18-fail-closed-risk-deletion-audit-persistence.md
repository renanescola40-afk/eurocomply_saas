# Fail closed when risk-deletion audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Priority: P1
- Areas: risk governance, audit integrity, incident response

## Context

`deleteRisk` permanently removes an organization-scoped governance risk. The action already requires authentication, tenant-scoped `risks:delete` authorization, validated UUID inputs, and fail-closed distributed rate limiting.

Before this decision, the action deleted the row, emitted `risk.delete`, ignored the audit writer's explicit persistence result, and returned success. An audit database, schema, provider, privileged-client, or audit-chain failure could therefore leave the risk deleted without durable cross-cutting accountability evidence.

No production incident, external audit result, penetration test, or runtime exploit is claimed. This decision is based on source inspection of the deletion and audit-result control flow.

## Decision

Risk deletion must not return success unless `risk.delete` is durably persisted.

The action will:

1. delete and return the complete tenant-scoped risk row;
2. attempt the existing audit write;
3. require `audit.persisted === true` before returning success;
4. reinsert the exact deleted row when audit persistence fails;
5. report compensation failure through sanitized observability context;
6. return the existing generic deletion error.

## Consequences

### Positive

- A successful response now means both the destructive governance mutation and its accountability evidence completed.
- Audit-subsystem outages fail closed instead of silently producing unaudited deletions.
- Compensation is small, reviewable, and uses the exact row returned by the tenant-scoped delete.

## Risks and trade-offs

- Audit unavailability temporarily reduces risk-deletion availability.
- Compensation is best effort rather than a single database transaction spanning the domain row and audit subsystem.
- If reinsertion fails, the deletion may remain effective; the fixed `risk_delete_audit_rollback` observability area is emitted for incident handling.
- A concurrent insert reusing the same primary key can cause compensation to fail rather than overwrite data.
- This source-level change is not runtime evidence and does not prove production database behavior.

## Controls preserved

- authenticated user requirement;
- tenant-scoped `risks:delete` authorization;
- UUID validation;
- fail-closed distributed rate limiting;
- organization-scoped deletion;
- generic caller-facing errors;
- sanitized observability.

## Validation

A focused Vitest source regression asserts that:

- the complete deleted row is captured;
- audit persistence is checked before success;
- the exact row is reinserted on audit failure;
- rollback failures use a fixed sanitized observability area;
- authorization and fail-closed rate limiting remain present.

Merge remains blocked until all required exact-head CI, lint, typecheck, tests, build, security, dependency, secret-scanning, enterprise-readiness, and release gates are green.

## Rollback

Revert the source, test, and this decision record. No schema, dependency, environment, or data migration rollback is required.