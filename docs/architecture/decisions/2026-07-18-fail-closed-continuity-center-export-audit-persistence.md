# Fail closed when continuity-center export auditing is unavailable

- Status: Proposed
- Date: 2026-07-18
- Scope: `GET /api/continuity-center/export`

## Context

The continuity-center export is an organization-scoped governance and resilience artifact. The route already requires authentication, `export_data` authorization, a Business-or-higher plan, step-up authentication, distributed rate limiting, tenant scoping, integrity hashing, and no-store download headers.

Before this change, the route awaited `createAuditEvent` for `continuity_center_exported` but ignored the writer's explicit `persisted` result. The JSON artifact could therefore be returned with HTTP 200 when the audit chain, database, schema, provider, or privileged client was unavailable.

That behavior creates a concrete accountability gap: an enterprise continuity artifact can leave the system without durable evidence identifying the tenant, actor, role, step-up verification, plan, readiness state, and payload hash.

## Decision

A successful continuity-center export requires `createAuditEvent` to report `persisted: true` before the filename is constructed or the artifact is returned.

When persistence is unavailable, the route:

1. emits only a fixed operational error message;
2. returns a no-store HTTP 503 with `continuity_center_export_audit_unavailable`;
3. does not return the artifact, filename, or payload hash header.

The existing authentication, authorization, entitlement, step-up, rate-limit, integrity, tenant-scoping, and download-hardening controls remain unchanged.

## Consequences

- Successful exports have durable accountability evidence.
- Audit-store outages intentionally reduce export availability.
- Clients should treat the stable 503 response as retryable.
- An audit record can exist even when transmission is interrupted after persistence. This is preferable to an untracked export and does not claim that the client received every byte.

## Risks and trade-offs

- The route deliberately favors accountability over availability: legitimate exports return a retryable 503 while durable audit persistence is unavailable.
- Payload assembly and integrity hashing occur before the audit write, so a rejected request can still consume server work and memory even though no artifact is disclosed.
- Persisting the event before response transmission means an audit record can exist when the client disconnects or receives only part of the response; the event proves authorization and attempted disclosure, not complete client receipt.
- Operational safety still depends on production monitoring and alert delivery for audit-store failures. This ADR and its source-level test do not prove those runtime controls.

## Evidence boundaries

This decision and its regression test provide source-level evidence only. They do not prove production audit availability, deployment, runtime database health, disaster-recovery effectiveness, external audit completion, penetration testing, or compliance certification.

## Rollback

Revert the route guard, regression test, and this decision record. No migration, configuration change, data rewrite, or secret rotation is required. Reverting restores best-effort audit behavior and must not be represented as retaining this accountability guarantee.

## Merge conditions

Do not merge until all required checks are green on the exact pull-request head, the branch is current with `main`, review conversations are resolved, and human review accepts the deliberate availability-versus-accountability trade-off.
