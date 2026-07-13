# Enterprise readiness authentication hardening

Date: 2026-07-13
Status: proposed

## Context

`GET /api/ops/enterprise-readiness` is a protected operational endpoint. After bearer-token validation it creates a Supabase admin client, checks ten tables, checks the private `controlled-documents` storage bucket, and reports environment-configuration state.

On `main`, the route had no route-level distributed rate limit before token validation or dependency access. It also used the shared bearer-token default, which permits a missing configured token outside production.

This record documents a deterministic repository-side control gap. It does not claim that unauthorized access, token guessing, provider exhaustion, a production incident, an external audit, or penetration testing occurred.

## Decision

- Require a configured `HEALTHCHECK_TOKEN` in every environment for this route by setting `allowMissingTokenOutsideProduction: false`.
- Apply the existing `health-internal` enterprise rate-limit policy before bearer-token validation.
- Override the shared health policy to `fail-closed` for this dependency-touching endpoint.
- Keep the existing readiness calculations, Supabase checks, storage check, response contract, no-store behavior, and sanitized error reporting unchanged.

## Impact

Invalid-token attempts and authorized readiness requests are bounded before live Supabase and storage checks. If the distributed limiter cannot make a trustworthy decision, the endpoint becomes temporarily unavailable instead of continuing without its intended abuse control.

No schema, migration, customer data, secret value, provider configuration, deployment target, readiness scoring rule, or stored runtime evidence changes.

## Risks and limitations

- Local and test callers must configure `HEALTHCHECK_TOKEN`; the shared non-production bypass no longer applies to this route.
- The endpoint is unavailable while the distributed limiter cannot make a trustworthy decision.
- Legitimate probe frequency may require operational tuning if it exceeds the existing `health-internal` threshold.
- Request-derived rate-limit identity depends on the repository's existing trusted-proxy and client-header configuration.
- Rate limiting is defense in depth and does not replace token entropy, rotation, TLS, network restrictions, provider timeouts, or monitoring.
- Repository tests do not prove live Supabase, storage, Redis, or production readiness.

## Evidence

- The pre-change route validated the bearer token before creating an admin client but had no route-level rate-limit decision.
- The route can perform ten table queries and one storage-bucket check per authorized request.
- `tests/security/enterprise-readiness-auth.test.ts` records the repository regression contract for configured-token enforcement and control ordering.
- GitHub Actions and Vercel results on the pull request are the authoritative execution evidence.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting restores the missing-token non-production bypass and the unbounded pre-authentication path.
