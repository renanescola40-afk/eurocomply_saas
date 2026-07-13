# Internal email test authentication is rate limited before secret validation

Date: 2026-07-13

## Context

`POST /api/internal/email/test` is an internal operational endpoint protected by the shared internal cron secret. Before this change, the route validated the secret before invoking its existing delivery rate limit. Invalid or missing credentials therefore bypassed rate limiting entirely.

The endpoint did not expose email delivery without authorization, but unlimited authentication attempts increased brute-force and request-flood risk against an operational route.

## Decision

Apply a fail-closed, IP-aware authentication rate limit before internal-secret validation.

- Use the existing distributed `auth` policy.
- Hash client IP and user-agent through the existing rate-limit key builder.
- Return `429` for an exhausted bucket.
- Return `503` when the production distributed limiter is unavailable.
- Preserve the existing post-authentication global delivery limit of five test messages per minute.
- Keep all responses `no-store` and do not expose secret or provider details.

## Scope

This is a route-hardening change only. It does not change email templates, recipients, provider configuration, secrets, database state, tenant data, or production evidence status.

## Verification

The route test suite asserts that missing and invalid secrets are rate limited before authorization, that an exhausted authentication bucket prevents secret validation, and that authorized delivery remains subject to the existing delivery limiter.

CI results on the pull request are the execution evidence. This record does not claim a production test, audit, or pentest.

## Risks

A client sharing one source IP can receive `429` after repeated failed or successful authentication attempts. The limit is intentionally scoped to ten authentication attempts per minute per rate-limit subject. Authorized test delivery remains more restrictive at five messages per minute globally.

## Rollback

Revert the pull request. No migration, secret rotation, data rollback, or deployment configuration change is required.
