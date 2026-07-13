# Readiness probe pre-authentication rate limit

Date: 2026-07-13
Status: Proposed in draft pull request

## Context

`GET /api/ready` is protected by `HEALTHCHECK_TOKEN`, then performs live Supabase and Stripe checks and returns grouped readiness state. On `main`, requests were not subject to a route-level distributed rate limit before bearer-token validation or dependency access.

That creates a deterministic abuse-resistance gap: invalid-token requests can repeatedly exercise authentication and, for valid credentials, the endpoint can repeatedly consume live dependency capacity without the route's intended health/internal request bound. Repository inspection establishes the control-ordering gap only. It does not establish production abuse, provider exhaustion, an incident, an audit result, or a penetration-test finding.

## Decision

Apply the existing `health-internal` distributed rate-limit policy before bearer-token validation and before live dependency checks. Override the shared policy to `fail-closed` for this protected, dependency-touching readiness endpoint.

The endpoint continues to use the existing request-derived rate-limit subject, timing-safe bearer-token validation, grouped response contract, request IDs, no-store responses, sanitized provider reporting, and existing Supabase and Stripe readiness checks.

## Impact

Invalid-token attempts and authorized readiness probes are bounded before dependency access. During a distributed rate-limiter outage, `/api/ready` returns the shared fail-closed rate-limit response rather than performing live checks without a trustworthy abuse-control decision.

No database schema, migration, customer data, credentials, provider configuration, deployment target, public health endpoint, readiness criteria, or stored runtime evidence changes.

## Risks and trade-offs

- Readiness checks become unavailable while the distributed rate limiter cannot make a trustworthy decision.
- The request-derived subject depends on the repository's existing trusted proxy and client-header configuration.
- The existing `health-internal` limit may need operational tuning if legitimate probe frequency exceeds its current threshold.
- Rate limiting is defense in depth and does not replace strong token entropy, rotation, TLS, network restrictions, provider timeouts, or monitoring.
- This repository-side change does not prove live Supabase, Stripe, Redis, Sentry, scanner, or production readiness.

## Verification

Authoritative verification is the final-head GitHub Actions and deployment-check result for the pull request. Relevant repository checks include:

- `scripts/security/check-ready-endpoint-security.mjs`;
- ready endpoint unit tests;
- lint and typecheck;
- unit tests and production build;
- Application Security CI and Full Security Suite;
- Enterprise Production Gate;
- CodeQL, Semgrep, Gitleaks, dependency review, Actionlint, and Vercel preview.

No check is considered passed until GitHub reports it green on the final head SHA.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting restores the unbounded pre-authentication readiness path.