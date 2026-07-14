# Decision: rate limit intelligence refresh authentication

Date: 2026-07-14
Status: Proposed in draft pull request
Priority: P1 security and SRE hardening

## Context

`GET` and `POST /api/intelligence/refresh` are internal maintenance entry points. After internal-cron authorization, the route creates a privileged Supabase client and upserts a published record into `intelligence_items`.

Before this change, requests reached credential validation without a distributed route-bound throttle. A valid request is state-changing, and repeated invalid requests could exercise the authentication boundary without the repository's existing fail-closed internal authentication limiter.

Repository source inspection establishes this control-flow gap only. It does not establish exploitation, production impact, external audit findings, penetration-test results, or regulatory non-conformity.

## Decision

Call `enforceInternalAuthenticationRateLimit` before internal-cron authorization, admin-client creation, and the database upsert. Scope the existing `auth` policy to:

- route: `/api/intelligence/refresh`
- action: `intelligence_refresh_auth`

The shared control uses request-derived network and user-agent context and fails closed when the distributed limiter cannot make a trustworthy decision.

## Impact

Denied requests return the shared no-store rate-limit response before secret validation or privileged database work. Authorized requests preserve the existing payload, upsert conflict key, response shape, GET compatibility, and database error handling.

No database schema, migration, credential, environment variable, dependency, content-rights rule, or stored record is changed by this decision.

## Risks and limitations

- A distributed limiter outage can temporarily block legitimate refresh execution. This availability trade-off is intentional for a privileged state-changing endpoint.
- This change does not add network allowlisting, credential rotation, job idempotency beyond the existing `external_id` upsert, runtime alerting, or production evidence.
- Source-contract regression coverage does not replace integration tests or a production-like probe.

## Validation

The focused test verifies that rate limiting is configured for the route and executes before authorization, admin-client creation, and the upsert. Repository GitHub Actions remain the authority for lint, typecheck, tests, build, and security checks on the final commit.

No check is recorded as passed until GitHub reports it green on the final pull-request head SHA.

## Rollback

Revert the route, test, and this decision record. No migration reversal, data rewrite, credential rotation, provider change, or infrastructure rollback is required.
