# Fail closed when vendor-assurance export auditing is unavailable

Date: 2026-07-18
Status: Accepted

## Context

The vendor-assurance export is an organization-scoped governance and procurement artifact. Authentication, tenant context, `export_data` authorization, Business-plan entitlement, step-up authentication, distributed rate limiting, integrity metadata, filename sanitization, and no-store download headers were already enforced.

The route awaited `createAuditEvent` but did not inspect its explicit `persisted` result. A database, schema, privileged-client, provider, or audit-chain failure could therefore still return the artifact with HTTP 200 without durable accountability evidence.

## Decision

The route must capture the audit result and require `persisted === true` before constructing the filename or returning the download. When persistence is unavailable it returns a no-store HTTP 503 with the stable error `vendor_assurance_export_audit_unavailable` and reports only fixed operational context.

## Consequences

- Successful vendor-assurance exports have durable audit evidence before disclosure.
- Audit-store outages intentionally reduce export availability; callers must retry.
- An audit record may exist when a client disconnects before receiving the complete response. This is preferable to an untracked disclosure and does not prove client receipt.
- Existing authentication, authorization, entitlement, tenant isolation, rate limiting, integrity, and response-hardening controls remain unchanged.

## Evidence boundary

This decision and its regression test provide source-level evidence only. They do not prove production deployment, production audit availability, external audit, penetration testing, vendor-review effectiveness, customer acceptance, or compliance certification.

## Rollback

Revert the route guard, regression test, and this ADR. No migration, data rewrite, configuration change, or secret rotation is required. Reverting restores best-effort audit behavior and must not be represented as retaining this accountability guarantee.
