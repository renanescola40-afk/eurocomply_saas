# Fail closed when vendor update audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Priority: P1
- Area: Third-party risk governance, audit integrity

## Context

`updateVendor` changes organization-scoped third-party risk state, including risk level, review status, data-access level, DPA status, and identifying vendor metadata. The action already requires authentication, validates the payload, enforces tenant-scoped `vendors:write`, applies distributed fail-closed rate limiting, and scopes the update by vendor and organization.

Before this decision, the action emitted `vendor.update` but ignored the audit writer's explicit persistence result and returned the updated row. An audit database, schema, provider, privileged-client, or audit-chain failure could therefore leave third-party governance state changed without durable cross-cutting accountability evidence.

This conclusion is based on repository source review. It is not evidence of a production incident, exploit, external audit, certification, or penetration test.

## Decision

Vendor update must not return success unless `vendor.update` audit persistence succeeds.

The action now loads the exact organization-scoped prior row before mutation. If audit persistence fails, it attempts to restore that row while requiring the current core state to still match the update that just completed. This optimistic guard reduces the risk of overwriting a later concurrent update. Compensation failures are reported using a fixed sanitized event name and provider code only, and the caller receives the existing generic update error.

## Consequences

Normal successful vendor updates are unchanged. Audit-subsystem unavailability now reduces update availability instead of silently allowing an unaudited third-party risk mutation.

Compensation remains best effort because the domain update and audit chain are not committed in one transaction. The optimistic guard covers vendor ID, organization ID, name, risk level, and review status; a concurrent change limited to another field could still race with compensation. A future atomic database RPC would provide a stronger transaction boundary.

## Preserved controls

- authentication;
- Zod payload validation;
- tenant-scoped `vendors:write` authorization;
- organization- and vendor-scoped database operations;
- distributed rate limiting with fail-closed provider behavior;
- legacy optional-column compatibility;
- generic caller-facing errors;
- sanitized operational reporting.

## Evidence boundary

The focused regression is source-level evidence of the intended ordering, prior-state capture, compensation scope, and preserved controls. Required exact-head CI remains authoritative for lint, typecheck, unit tests, build, security, dependency, secret-scanning, enterprise-readiness, and release gates. No production runtime effectiveness or provider behavior is claimed.

## Rollback

Revert the code, test, and this decision record together. No migration, dependency, secret, environment-variable, or data transformation is introduced.
