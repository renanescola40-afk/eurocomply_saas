# Decision: harden operations smoke authentication

Date: 2026-07-13
Status: Proposed in draft pull request

## Context

`GET /api/ops/smoke` is an operational endpoint that checks required environment groups and performs a live Supabase query with the service-role-backed admin client. On `main`, bearer-token validation used the shared default that permits a missing configured token outside production, and the route did not bound authentication attempts before token validation.

This is a repository-side control gap. It is not evidence of unauthorized access, credential compromise, production abuse, provider exhaustion, a completed audit, or a penetration-test finding.

## Decision

- Require `HEALTHCHECK_TOKEN` explicitly in every environment for this endpoint.
- Apply the existing distributed `health-internal` rate-limit policy before bearer-token validation and before any Supabase dependency check.
- Override the shared health policy to fail closed for this protected, dependency-touching endpoint.
- Preserve the existing response schema, environment checks, Supabase query, no-store responses, and observability error reporting.

## Impact

Invalid-token attempts are bounded before the endpoint can reach dependency checks. If the distributed limiter cannot make a trustworthy decision, the endpoint returns the shared security-control-unavailable response rather than continuing.

No database schema, migration, customer record, credential value, provider configuration, deployment target, runtime evidence, or public health endpoint changes.

## Risks and trade-offs

- The operations smoke endpoint is temporarily unavailable when the distributed limiter is unavailable.
- Local and test callers must configure `HEALTHCHECK_TOKEN` instead of relying on the shared development bypass.
- Rate limiting is defense in depth and does not replace token entropy, rotation, TLS, network controls, or monitoring.
- This change does not prove production connectivity, Supabase availability, or successful operational response.

## Verification

Repository regression coverage checks that token bypass is disabled and rate limiting precedes bearer validation and Supabase access. GitHub Actions and deployment checks on the final pull-request head are the authoritative execution evidence.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting restores the missing-token development bypass and unbounded pre-authentication path.
