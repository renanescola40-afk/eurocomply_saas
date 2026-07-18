# Fail closed when vendor creation audit persistence is unavailable

- Date: 2026-07-18
- Status: Proposed
- Scope: `createVendor` server action
- Priority: P1

## Context

Vendor records are part of the organization's third-party risk and supply-chain governance evidence. The creation action authenticated the caller, validated the payload, enforced tenant-scoped `vendors:write` authorization, applied distributed fail-closed rate limiting, inserted the vendor, and emitted `vendor.create`.

The audit writer returns an explicit persistence result. The action previously ignored that result and returned the active vendor even when durable audit persistence failed. This created a gap between the vendor inventory and its accountability trail.

## Decision

Vendor creation now requires `audit.persisted === true` before returning success.

When persistence is unavailable, the action attempts to delete the exact inserted vendor using both its generated ID and organization ID, reports a sanitized compensation failure when deletion fails, and returns the existing generic creation error. The change does not modify vendor update or deletion behavior.

## Security and operational properties

The change preserves:

- authenticated execution;
- schema validation;
- tenant-scoped `vendors:write` authorization;
- distributed rate limiting with `failureMode: 'fail-closed'`;
- tenant-scoped database operations;
- generic caller-facing errors;
- the legacy optional-column compatibility path.

The compensation operation is best effort because the domain insert and audit-chain persistence are not currently in one database transaction. A failed compensation is reported to observability without exposing vendor content or provider details to the caller.

## Impact

During an audit subsystem outage, vendor creation becomes temporarily unavailable rather than creating an unaudited third-party governance record. Successful behavior is unchanged.

## Risks

- Audit availability now participates in vendor-creation availability.
- If compensation deletion fails, an inserted vendor can remain without the requested audit event; sanitized observability is emitted for incident response.
- Static source tests verify the guard and compensation boundaries but do not constitute runtime database evidence.

## Verification

Added `tests/security/vendor-create-audit-fail-closed.test.ts` to verify:

- audit persistence is checked before success;
- compensation is scoped by vendor ID and organization ID;
- compensation failure is reported;
- authentication, validation, authorization, and fail-closed rate limiting remain present.

No runtime audit, penetration test, production validation, or database compensation result is claimed by this decision record. Required exact-head CI must be green before merge.

## Rollback

Revert the commits in this pull request. No migration, data rewrite, dependency change, or configuration rollback is required.
