# Fail closed when retention-policy export audit persistence is unavailable

## Status

Proposed

## Context

`GET /api/retention-center/export` returns an organization-scoped retention-policy governance artifact. The route already requires authentication, `export_data` permission, a Business plan, step-up authentication, distributed rate limiting, tenant scoping, integrity metadata, and no-store download headers.

The route also wrote `retention_policy.exported`, but it discarded the audit writer's explicit persistence result. The audit subsystem can return `persisted: false` when its privileged client, schema, database, provider, or chained append path is unavailable. In that state the endpoint still returned HTTP 200 and disclosed the artifact.

This is a source-level P1 audit-integrity and governance-evidence gap. This decision does not assert that an unaudited export occurred in production.

## Decision

A retention-policy export is successful only when its audit event is durably persisted.

The route captures the `createAuditEvent` result and returns a no-store HTTP 503 with stable code `retention_policy_export_audit_unavailable` when `persisted` is false. Filename construction and download remain after this guard. Operational reporting uses a fixed message and does not include artifact content, tenant identifiers, user identifiers, tokens, credentials, or secrets.

## Consequences

- Successful downloads have durable accountability evidence before disclosure.
- Audit-store outages reduce export availability and callers must retry.
- An audit event can exist when a client disconnects before receiving the complete response. This is preferable to an untracked disclosure and is not evidence of successful client receipt.
- Existing authentication, authorization, entitlement, step-up, rate-limit, tenant, integrity, and download controls remain unchanged.

## Verification

The focused source regression test verifies that:

- the audit result is captured;
- non-persistence returns the stable no-store 503;
- filename construction and download occur only after the audit guard;
- the existing export controls remain present.

Required exact-head CI, lint, typecheck, test, build, security, dependency, secret-scanning, enterprise-readiness, and release checks remain authoritative. No production runtime validation, external audit, penetration test, or compliance certification is claimed by this decision.

## Rollback

Revert the route, test, and this decision record. No migration, configuration change, data rewrite, or secret rotation is required. Reverting restores best-effort audit semantics and must not be represented as preserving the accountability guarantee described here.
