# Fail closed on vendor deletion audit persistence

- Status: Proposed
- Date: 2026-07-18
- Priority: P1
- Area: Third-party risk governance, audit integrity

## Context

`deleteVendor` permanently removes an organization-scoped third-party record. The action already requires authentication, validates UUID inputs, enforces tenant-scoped `vendors:delete`, applies the existing distributed rate limiter in fail-closed mode, and scopes the delete by organization.

Before this decision, the action emitted `vendor.delete` but ignored the audit writer's explicit persistence result. It could therefore return deletion success even when durable cross-cutting accountability evidence was unavailable.

This conclusion is based on repository source review. It is not evidence of a production incident, exploit, external audit, or penetration test.

## Decision

The action must not return deletion success unless `vendor.delete` audit persistence succeeds.

To support compensation, the tenant-scoped delete returns the complete vendor row. If audit persistence fails, the action attempts to reinsert that exact row and returns the existing generic deletion failure. Compensation errors are reported using a fixed observability event name and a sanitized provider code.

## Consequences

Normal successful deletion behavior is unchanged. Audit-subsystem unavailability now reduces deletion availability instead of silently allowing an unaudited destructive governance mutation.

Compensation remains best effort because the vendor row and audit chain are not committed in one distributed transaction. Reinsertion can fail, including if another row has already reused the primary key. Such failure is observable but does not justify reporting success.

The complete row is used for compensation so optional and legacy-compatible fields are not reconstructed from a partial projection.

## Preserved controls

- authentication;
- UUID validation;
- tenant-scoped `vendors:delete` authorization;
- organization-scoped deletion;
- distributed rate limiting with fail-closed provider behavior;
- generic caller-facing errors;
- sanitized operational reporting.

## Evidence boundary

The regression is source-level and verifies the intended control shape. Required exact-head CI remains authoritative for lint, typecheck, unit tests, build, and security gates. No runtime effectiveness, production deployment, audit certification, or pentest result is claimed.

## Rollback

Revert the code, test, and this decision record together. No migration, dependency, secret, environment variable, or data transformation is introduced.
