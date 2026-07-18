# Fail closed when vendor assurance export auditing is unavailable

- Status: Proposed
- Date: 2026-07-18
- Decision owners: Security, Platform, Product Engineering

## Context

`GET /api/vendor-assurance/export` produces an organization-scoped assurance artifact containing control posture, scoring, plan context, actor role, step-up verification summary, and integrity metadata.

The route already requires authentication, tenant-scoped `export_data` permission, Business-plan entitlement, step-up verification, and distributed rate limiting. It also calls `createAuditEvent` before returning the download. However, the audit writer returns an explicit `persisted` result and the route previously ignored it. A successful HTTP response was therefore possible when durable audit evidence was unavailable.

For an assurance artifact intended to support procurement, governance, and incident reconstruction, disclosure without a durable export event is an unacceptable accountability gap.

## Decision

The route will require `createAuditEvent(...).persisted === true` before constructing the filename or returning the artifact.

When the audit writer explicitly reports that persistence failed, the route will:

1. report a sanitized operational error with fixed context;
2. return a no-store HTTP 503 response with `vendor_assurance_export_audit_unavailable`;
3. not disclose the export payload, filename, or download headers.

Existing authentication, RBAC, entitlement, step-up, rate-limit, tenant-isolation, integrity, and download-hardening controls remain unchanged.

## Consequences

### Positive

- Every successful vendor assurance export has durable audit evidence.
- Incident response and procurement evidence no longer treat a best-effort audit attempt as success.
- The failure mode is explicit, retryable, and does not disclose the artifact.

### Trade-offs

- Vendor assurance exports become temporarily unavailable when audit persistence is degraded.
- This deliberately favors accountability and evidence integrity over export availability.

## Evidence boundaries

This change is source-level control hardening only. It does not claim that production audit storage, external monitoring, runtime configuration, penetration testing, or end-to-end export behavior has been independently validated.

## Rollback

Revert the route, regression test, and this decision record together. Rollback restores best-effort audit behavior and must therefore be treated as a security and governance regression requiring explicit approval.
