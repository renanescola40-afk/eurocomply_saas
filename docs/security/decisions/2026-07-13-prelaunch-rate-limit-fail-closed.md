# Decision: fail closed when prelaunch rate limiting is unavailable

Date: 2026-07-13
Status: proposed
Scope: `POST /api/prelaunch`

## Context

The public prelaunch waitlist accepts contact details, writes lead records and sends confirmation and internal notification emails. The route applies a distributed five-request-per-minute limit before parsing the request body, but the limiter was configured with `failureMode: 'fail-open'`.

If the distributed limiter became unavailable, the route could continue accepting unlimited requests from a source. That would preserve waitlist availability, but it would also remove the control that bounds automated lead insertion and email delivery during the outage.

This repository evidence establishes the configuration gap only. It does not establish that the limiter has failed in production or that abuse has occurred.

## Decision

Configure the prelaunch waitlist rate-limit check to fail closed.

When the distributed limiter cannot make a trustworthy decision, the existing rate-limit implementation will reject the request instead of allowing the mutation and email side effects to continue. The limit, time window, request-size bound, JSON content-type requirement, honeypot, consent validation and no-store responses remain unchanged.

## Impact

- Automated submissions remain bounded during a rate-limit provider outage.
- Lead writes and confirmation/internal emails do not proceed when throttling cannot be enforced.
- No authentication, authorization, database schema, migration, provider credential, customer record or deployment target changes.
- No new runtime, audit, certification or penetration-test evidence is created.

## Risks and trade-offs

The waitlist becomes unavailable while the distributed rate limiter is unavailable. This is an intentional availability-for-abuse-resistance trade-off for a public endpoint that produces persistent records and outbound email.

A rate-limit service incident may therefore reduce lead capture until the dependency recovers. Health monitoring and provider recovery remain operational concerns outside this repository-only change.

## Verification

Repository checks should verify that:

- the route uses `failureMode: 'fail-closed'`;
- rate limiting still occurs before request-body processing;
- existing waitlist capture, fallback and notification contracts remain intact;
- lint, typecheck, unit tests, build, security CI and the repository's required GitHub checks pass.

GitHub Actions results on the pull request are the authoritative execution evidence. No check is described as passed until GitHub reports it green.

## Rollback

Revert the pull request. No data migration, secret rotation, provider rollback or infrastructure rollback is required.
