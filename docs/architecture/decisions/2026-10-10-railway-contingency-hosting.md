# ADR — Railway as Contingency Hosting Provider

Status: ACCEPTED FOR CONTINGENCY PREPARATION / NOT YET PRODUCTION-AUTHORIZED

Date: 2026-10-10

## Context

RISCK COMPLY currently uses Vercel as the primary hosting provider. New Vercel deployments are externally blocked by provider billing state while the existing production deployment remains available.

A legitimate continuity path is required so repository work, testing, and future release capability are not operationally dependent on one provider.

## Decision

Railway is accepted as a contingency hosting provider candidate for an isolated failover environment.

This decision authorizes repository-side preparation and a non-production or isolated validation deployment only. It does not authorize DNS cutover, production traffic migration, Stripe LIVE webhook changes, or replacement of Vercel as the primary provider without successful runtime validation and explicit owner approval.

Railway provider settings will be provisioned explicitly in the connected Railway project/service rather than through repository Infrastructure as Code. This avoids depending on an undeclared Railway SDK or a repository configuration file that cannot be evaluated from a clean checkout.

## Deployment authority

- GitHub `main` remains the source of truth.
- The exact intended `main` SHA must be deployed and recorded.
- Provider-side secrets must be configured directly in Railway; secrets must never be committed.
- Build command: `npm run build`.
- Start command: `npm run start`.
- Healthcheck path: `/api/health`.
- Any production cutover requires owner approval after validation evidence is complete.

## Regional and privacy boundary

The failover service must be placed in an EU-compatible Railway region before production use. Region selection is intentionally deferred until the connected Railway account exposes the available region set and the privacy/DPA review is reconciled.

No customer production data may be intentionally migrated solely for preview validation.

## Scheduled jobs

The current Vercel schedules must be recreated with Railway cron jobs or an equivalent scheduler before any production cutover:

- `/api/internal/daily-maintenance` — `0 4 * * *`
- `/api/internal/compliance-alerts` — `5 4 * * *`
- `/api/internal/marketing/linkedin/process` — `*/15 * * * *`

Each scheduled job remains subject to the existing secret and fail-closed application guards.

## Cutover criteria

Before DNS or production traffic changes:

1. exact `main` SHA deployed;
2. `/api/health` returns HTTP 200;
3. protected `/api/ready` passes;
4. authentication and OAuth callbacks work on the alternate hostname;
5. Supabase tenant isolation and RLS remain unchanged;
6. Stripe flows remain fail-closed unless intentionally configured and verified;
7. scheduled jobs have equivalent execution;
8. Sentry/observability identifies the alternate environment;
9. rollback path to the existing Vercel deployment remains available;
10. owner explicitly approves production cutover.

## Rollback

Until cutover is fully accepted, Vercel remains the primary production rollback target. The existing Vercel deployment and domains must not be deleted or detached as part of failover preparation.

If Railway validation fails, abandon the alternate deployment without changing DNS or production traffic.

## Trade-offs

Benefits:
- reduces single-provider deployment dependency;
- preserves Next.js runtime portability;
- creates a documented business-continuity path.

Costs and risks:
- second-provider operational complexity;
- duplicated environment/secret management;
- scheduler parity must be maintained;
- provider privacy, contractual and regional controls require independent verification before production use.
