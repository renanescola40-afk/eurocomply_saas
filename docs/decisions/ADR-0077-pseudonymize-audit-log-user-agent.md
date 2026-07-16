# ADR-0077: Pseudonymize audit-log user-agent context

- Status: Accepted
- Date: 2026-07-16
- Priority: P1 privacy engineering and data minimization

## Context

The shared `writeAuditLog` path attaches request context to both legacy audit rows and chained audit events. IP addresses were already converted to a salted derived identifier, but the complete bounded `User-Agent` header was retained in `metadata.requestContext.userAgent`.

A complete user-agent string can contain browser, operating-system, device and automation-client details. Those details are not required for the audit event's core purpose when a stable, privacy-safer correlation hint is sufficient.

This finding is based on repository source only. It does not claim production exposure, unlawful processing, a regulatory finding, external audit completion or penetration-test evidence.

## Decision

Reuse the existing salted `hashRateLimitUserAgent` primitive and store the result as `metadata.requestContext.userAgentPseudonym`.

The implementation:

- trims and bounds the transient header before hashing;
- stores `sha256:<derived identifier>` when a value is available;
- stores `null` when the header is absent or request headers are unavailable;
- removes the complete user-agent value from new audit metadata;
- leaves request IDs, IP pseudonyms, audit actions and chain semantics unchanged.

## Consequences

New legacy audit rows and chained audit events no longer retain the complete request user-agent through the shared writer. Operators retain a limited correlation hint but can no longer reconstruct browser or device details from newly written audit metadata.

The derived identifier remains pseudonymous data, not anonymous data. Changing the configured hash salt changes future identifiers. Existing audit records are not rewritten or deleted by this change.

No migration, dependency, RBAC, RLS, entitlement, provider or secret change is introduced.

## Risks and trade-offs

- New audit events no longer expose exact browser, operating-system or device details to operators investigating an event.
- The derived value is a correlation hint, not an anonymous identifier; access controls and retention limits still apply.
- Rotating the configured hash salt intentionally breaks correlation with identifiers generated under the previous salt.
- Historical audit rows may still contain complete user-agent values and require a separately approved retention or cleanup decision.
- Reusing the existing hashing primitive keeps behavior consistent with rate-limit telemetry but couples future identifier stability to that primitive and its salt configuration.

## Evidence boundary

Evidence consists of repository source, diff, focused regression coverage and automated CI on the exact pull-request head. No runtime evidence file is created or modified. Production deployment, historical-data cleanup, retention-policy execution and legal compliance remain outside this ADR's evidence boundary.

## Rollback

Revert the pull request. The shared audit writer will again persist the bounded complete user-agent string in request-context metadata. No schema rollback, provider action, credential rotation or customer-data repair is required for the code rollback; historical records remain unaffected in either direction.
