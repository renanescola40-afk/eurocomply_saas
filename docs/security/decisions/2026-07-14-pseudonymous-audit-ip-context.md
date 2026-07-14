# Pseudonymous IP context in audit events

Date: 2026-07-14

## Status

Accepted for this pull request.

## Context

`writeAuditLog` enriches audit metadata with request context and sends the same sanitized metadata to the legacy `audit_logs` table and the chained audit-event writer. The implementation previously copied the first normalized `x-forwarded-for` or `x-real-ip` value into `requestContext.ipAddress`.

That raw network identifier was not required for authorization, audit-chain integrity, or event persistence. Persisting it across every audited action increased the amount of directly identifying request data retained in both audit representations.

Repository inspection establishes the code path and persistence behavior only. It does not establish a production incident, unlawful processing, a regulatory finding, an external audit, or a penetration-test result.

## Decision

Normalize the request IP as before, then replace it with a deterministic salted SHA-256 pseudonym before constructing audit metadata. Store it under `requestContext.ipAddressPseudonym` with a `sha256:` prefix. Preserve `null` when no trustworthy request IP is available.

The implementation reuses the existing `hashRateLimitIp` primitive and its configured salt precedence so the repository does not introduce a second incompatible pseudonymization scheme or a new mandatory secret.

## Impact

- Legacy and chained audit events created after deployment no longer receive the raw forwarded IP from this helper.
- Events from the same normalized IP remain correlatable while the configured salt remains stable.
- Audit action names, actors, organizations, entities, metadata sanitization, user-agent handling, persistence behavior, and chain construction remain unchanged.
- Existing audit rows are not rewritten.

## Risks and limitations

- Pseudonymization is not anonymization; an operator with candidate IPs and access to the salt could test candidates.
- Changing the configured salt breaks correlation with earlier pseudonyms.
- Existing historical events may still contain `requestContext.ipAddress`.
- User-agent values remain truncated but readable and require a separate retention and minimization review.
- Downstream consumers that explicitly read `requestContext.ipAddress` must migrate to `requestContext.ipAddressPseudonym`.

## Validation

The focused source-contract test verifies that normalization precedes pseudonymization, raw `ipAddress` assignment is absent, and missing IP context remains null. GitHub Actions on the pull-request head are the authoritative evidence for lint, typecheck, unit tests, build, and security workflows.

No runtime deployment evidence is claimed by this decision record.

## Rollback

Revert the pull request. No schema migration, credential rotation, data rewrite, or infrastructure rollback is required. Reversion restores raw IP persistence for newly written audit metadata and does not alter existing rows.
