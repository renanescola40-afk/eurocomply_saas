# Decision: rate limit daily-maintenance authentication before fan-out

Date: 2026-07-14
Status: Proposed in draft PR
Severity: P1

## Context

`/api/internal/daily-maintenance` authenticates an internal cron credential and, after successful authentication, invokes four stateful internal maintenance jobs. Before this change, attempts reached credential validation without a distributed authentication rate limit.

This created an avoidable abuse and availability risk: repeated invalid requests were not throttled at the route boundary, while an authenticated request can fan out to metric snapshots, compliance alerts, trial reminders, and intelligence refresh work.

## Decision

Apply the existing `enforceInternalAuthenticationRateLimit` control before `isAuthorizedInternalCronRequest` and before any maintenance job is invoked.

The shared control:

- uses the repository's distributed `auth` policy;
- derives request context from IP and user agent;
- defaults to ten attempts per minute for this route;
- fails closed when the distributed limiter cannot make a trustworthy decision;
- returns no-store `429` or `503` responses with rate-limit metadata.

## Impact

- Invalid authentication attempts are bounded before credential validation.
- Maintenance jobs are not invoked when the limiter denies the request or is unavailable.
- Authorized behavior, job order, per-job timeout, response body, and partial-failure reporting remain unchanged.
- Both POST and the existing GET compatibility path receive the same protection because GET delegates to POST.

## Risks and limitations

- A distributed rate-limiter outage can temporarily block legitimate maintenance execution. This is intentional fail-closed behavior for a privileged, state-changing orchestrator.
- The change does not remove the GET compatibility path or alter cron scheduling.
- This is source-level and CI evidence only. It is not runtime evidence, a penetration test, or a compliance certification.

## Validation

The focused regression test verifies that authentication rate limiting appears before credential validation and before the maintenance-job fan-out loop. Repository CI remains the authority for lint, typecheck, tests, build, and security checks.

## Rollback

Revert the route import and pre-authentication limiter block, then remove the focused test and this decision record. No schema, migration, secret, or data rollback is required.
