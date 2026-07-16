# ADR-0072: Bound the operations smoke Supabase probe

- Status: Proposed
- Date: 2026-07-15
- Priority: P1 SRE and release reliability

## Context

`GET /api/ops/smoke` is an authenticated operational endpoint used to verify environment configuration and basic Supabase reachability. Its database probe awaited the Supabase query without an application-level deadline.

If the database client or network stalled without promptly rejecting, the endpoint could remain pending until the hosting platform terminated the request. That makes the smoke signal slower and less deterministic during the exact dependency degradation it is intended to report.

The main `/api/ready` endpoint already bounds its dependency probes. The operations smoke endpoint should follow the same fail-closed operational behavior.

This finding is based on repository source only. It does not claim that a production request has hung, that Supabase has failed, or that a release incident occurred.

## Decision

Wrap the Supabase subscriptions probe in a 1.5-second application-level timeout.

When the deadline is exceeded, the existing catch path reports the error through the configured observability boundary and returns the existing degraded `503` response. No dependency details or credentials are exposed to the caller.

## Consequences

### Positive

- the operational smoke endpoint has a bounded response time for the Supabase probe;
- dependency stalls are converted into the existing degraded result rather than waiting for the platform timeout;
- behavior remains aligned with the main readiness endpoint;
- authentication, rate limiting, response shape, environment checks, and no-store handling are unchanged.

### Trade-offs

- a healthy but unusually slow Supabase probe can be classified as degraded;
- `Promise.race` bounds the endpoint wait but does not guarantee transport-level cancellation of an already-started client request;
- the 1.5-second threshold may need evidence-based tuning for a specific production region.

## Testing

A focused source-contract test requires:

- the 1.5-second timeout constant;
- use of `withOpsSmokeDependencyTimeout` around the subscriptions query;
- absence of the former direct unbounded await.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build, security gates, CodeQL, Semgrep, dependency review, and release checks on the exact pull-request head.

## Evidence boundary

Evidence is limited to repository source, the pull-request diff, and automated checks. No runtime evidence, production latency measurement, incident simulation, audit, or penetration test is asserted.

## Rollback

Revert the pull request. The endpoint will return to awaiting the Supabase probe without an application-level deadline. No migration, secret rotation, provider change, data repair, or schema rollback is required.
