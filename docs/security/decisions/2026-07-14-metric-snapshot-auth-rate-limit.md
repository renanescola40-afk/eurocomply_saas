# Decision: rate limit metric snapshot authentication

Date: 2026-07-14
Status: proposed
Priority: P1

## Context

`/api/internal/metric-snapshots` is a privileged internal job. After authorization it creates an admin Supabase client, enumerates a rotating organization batch, calculates dashboard summaries, and persists metric snapshots. The configured batch can include up to 200 organizations.

Before this change, requests reached internal-cron credential validation without a distributed request limit. Invalid requests could therefore repeatedly exercise the authentication boundary, while a valid request can trigger comparatively expensive multi-tenant database work.

## Decision

Apply the existing distributed `auth` rate-limit policy before internal-cron credential validation and before creation of the admin database client.

The limiter subject is derived from the request IP and user agent and is scoped to the `metric_snapshot_auth` action and `/api/internal/metric-snapshots` route. The existing `rateLimitResponse` helper remains responsible for no-store throttling and control-unavailable responses.

## Impact

- Bounds unauthenticated attempts before secret comparison.
- Prevents privileged snapshot work when the limiter denies the request or cannot make a trustworthy decision under the high-risk auth policy.
- Does not change valid cron credentials, organization batching, snapshot calculations, database schemas, or stored data.
- GET continues to delegate to POST and receives the same protection.

## Risks and trade-offs

The auth policy fails closed in production. A distributed limiter outage can therefore temporarily prevent legitimate metric snapshot generation. This is an intentional availability trade-off for a state-changing privileged endpoint.

Rate limiting does not replace credential rotation, network controls, monitoring, or job idempotency. This change does not claim that the endpoint or deployment has been penetration-tested or audited.

## Validation

A focused regression test checks that rate limiting is configured with the auth policy and executes before credential validation, admin-client creation, and the snapshot loop. Repository CI remains the authority for lint, typecheck, tests, build, and security checks. No runtime or production execution evidence is claimed here.

## Rollback

Revert the three commits in this pull request. No database rollback, migration, secret change, or data repair is required.
