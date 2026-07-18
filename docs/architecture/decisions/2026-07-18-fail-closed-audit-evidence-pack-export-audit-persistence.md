# Fail closed when audit evidence-pack export auditing is unavailable

- Status: Proposed
- Date: 2026-07-18
- Scope: `GET /api/audit/evidence-pack`

## Context

The audit evidence-pack endpoint returns an organization-scoped, integrity-signed governance artifact containing audit-chain and readiness information. Before this change, the route awaited `createAuditEvent` for `audit_chain.evidence_exported` but did not inspect the writer's explicit `persisted` result. A storage, schema, provider, privileged-client, or audit-chain failure could therefore still produce a successful download without durable accountability evidence.

The endpoint already enforces organization context, `export_data` permission, Business-plan entitlement, step-up authentication, distributed rate limiting, payload integrity signing, filename sanitization, and no-store download headers. This decision does not weaken those controls.

## Decision

A successful audit evidence-pack download requires `createAuditEvent` to report `persisted: true`.

When persistence is unavailable, the route:

1. records a sanitized operational error without export contents;
2. returns a no-store HTTP 503 response with `audit_evidence_pack_export_audit_unavailable`;
3. does not construct the download filename or return the signed artifact.

The existing signing-unavailable path remains unchanged. Its best-effort `security.failure` event is not treated as a prerequisite because no artifact is disclosed on that path.

## Consequences

### Positive

- Every successful audit evidence-pack disclosure has durable accountability evidence.
- Audit-storage degradation cannot silently create an untracked governance export.
- The response is explicit and retryable rather than falsely successful.

### Trade-off

- Export availability now depends on audit persistence availability.
- During audit subsystem incidents, authorized users receive HTTP 503 and must retry after recovery.

This availability trade-off is intentional because the artifact itself is an audit and assurance deliverable.

## Evidence boundary

This change provides source-level and test-level evidence only. It does not claim production deployment, production audit availability, external audit, penetration testing, compliance certification, or customer validation.

## Rollback

Revert the route, test, and this decision record together. Rolling back restores export availability during audit persistence failures but also restores the documented accountability gap.
