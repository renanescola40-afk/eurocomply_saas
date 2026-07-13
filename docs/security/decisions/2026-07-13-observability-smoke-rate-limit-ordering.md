# Observability smoke rate-limit ordering

Date: 2026-07-13
Status: Proposed
Scope: `POST /api/observability/smoke`

## Context

The observability smoke endpoint intentionally emits a synthetic error through the configured reporting path. It is protected by the shared healthcheck bearer token and a trusted-origin check.

On `main`, the route applied its distributed `health-internal` rate limit only after bearer-token validation. The shared policy also defaults to fail-open. Consequently, invalid credential attempts were not bounded by the route, and callers holding the token could continue generating synthetic reports when the distributed limiter could not make a trustworthy decision.

Repository inspection establishes this control-ordering and failure-policy gap only. It does not establish credential compromise, production abuse, provider-quota exhaustion, an incident, an audit result, or a penetration-test finding.

## Decision

Apply the existing distributed rate limiter before bearer-token validation, using a request-derived subject, the existing `health-internal` policy, and an explicit fail-closed override.

Use the shared rate-limit response helper so an exceeded limit returns `429`, while an unavailable fail-closed control returns `503`; both responses remain `no-store`.

Preserve the existing bearer-token validation, trusted-origin validation, synthetic error payload, provider reporting behavior, request IDs, and security-event logging.

## Impact

Authentication attempts and authorized smoke emissions are bounded before the endpoint can generate telemetry side effects. During a distributed limiter outage, the smoke endpoint becomes temporarily unavailable rather than emitting unbounded synthetic reports.

No database schema, migration, customer data, provider credential, deployment target, healthcheck token, observability configuration, or existing runtime evidence is changed.

## Risks and limitations

- Operational smoke testing is unavailable while the distributed limiter cannot make a trustworthy decision.
- The change relies on the existing client-IP and user-agent derivation used by the shared limiter; proxy configuration remains an operational dependency.
- Rate limiting is defense in depth and does not replace token entropy, rotation, trusted-origin enforcement, TLS, provider quotas, or monitoring.
- This change does not prove live Sentry delivery or production observability health.

## Tests and evidence

- `tests/security/observability-smoke-rate-limit.test.ts` records the repository contract for ordering, fail-closed behavior, request-derived subjects, and shared response handling.
- GitHub Actions and deployment checks on the pull-request head are the authoritative execution evidence.
- No check is described as passed until GitHub reports it green on the final head SHA.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting restores post-authentication, fail-open rate limiting for this endpoint.
