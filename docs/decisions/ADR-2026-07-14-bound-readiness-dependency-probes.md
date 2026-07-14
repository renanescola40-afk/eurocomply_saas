# ADR: Bound readiness dependency probes

- **Date:** 2026-07-14
- **Status:** Proposed
- **Scope:** `/api/ready`

## Context

The protected readiness endpoint checks both Stripe and Supabase before returning a production readiness decision. Stripe already had a 1.5 second network timeout, but the Supabase subscriptions query had no application-level time bound.

A degraded database connection could therefore keep the readiness request open until a lower-level platform or network timeout fired. That creates an unreliable operational signal and can consume serverless execution capacity during an outage.

This repository evidence establishes the source-level gap only. It does not prove that a production readiness request has previously hung or caused customer impact.

## Decision

Use one explicit 1.5 second dependency-probe budget for the readiness route and wrap the Supabase query in a fail-closed timeout.

When the budget is exceeded:

- the existing error-reporting path receives a typed timeout error;
- database readiness remains `not_ready`;
- the endpoint returns HTTP 503 through the existing decision logic;
- no environment values, credentials, query results, or internal error details are returned;
- the timer is cleared after either branch settles.

Stripe retains its existing 1.5 second SDK timeout and now derives it from the same readiness dependency budget.

## Alternatives considered

### Rely on provider or platform timeouts

Rejected because those timeouts may be much longer than the useful lifetime of a readiness probe and are not expressed as repository policy.

### Abort the Supabase request directly

Deferred. `Promise.race` is compatible with the current query mock and limits response latency without changing Supabase client construction. Direct cancellation may be added later if the project standardizes abort-signal support across provider clients.

### Return ready when the timeout fires

Rejected. A timed-out database dependency is unknown or unavailable and must remain fail-closed.

## Consequences

### Positive

- readiness latency is bounded at the application layer;
- database degradation produces a deterministic 503 signal;
- Stripe and Supabase use one documented dependency budget;
- no public API, schema, tenant, billing, or authentication behavior changes.

### Trade-offs

- `Promise.race` bounds the response but does not guarantee cancellation of the underlying provider request;
- a transient database response slower than 1.5 seconds will be classified as not ready;
- runtime latency must still be validated in a configured environment.

## Validation

A source-contract regression test verifies the timeout budget, fail-closed path, error reporting, and timer cleanup. GitHub Actions remains authoritative for lint, typecheck, unit tests, build, and security checks.

## Rollback

Revert the route, regression test, and this ADR. No data or infrastructure rollback is required.
