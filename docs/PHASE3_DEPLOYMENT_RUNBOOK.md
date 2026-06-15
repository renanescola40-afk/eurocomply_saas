# Phase 3 Deployment and Rollback Runbook

This runbook is part of the EuroComply SaaS Phase 3 production readiness foundation.

## Scope

This document covers production deployment preparation, release execution, smoke checks, rollback decision points, and incident handoff notes.

It does not authorize template, UI, product copy, document template, or email template changes.

## Required production secrets

Configure production secrets only in the deployment provider and external services. Do not commit real values to the repository.

Required production environment variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `HEALTHCHECK_TOKEN`
- `CRON_SECRET`
- `NEXT_PUBLIC_SENTRY_DSN`

Recommended production environment variables:

- `EVIDENCE_PACK_SIGNING_SECRET`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Pre-deployment checks

Before promoting a release candidate:

1. Confirm the deployment target is connected to the expected Git branch.
2. Confirm all production secrets are configured outside the repository.
3. Confirm Supabase migrations were reviewed and are ready to run in filename order.
4. Confirm Stripe live products, prices, and webhook endpoint are configured.
5. Confirm Sentry DSN and release settings are configured when observability is enabled.
6. Run the Phase 3 strict runner locally:

```bash
npm run phase3:strict
```

7. Run the existing CI/security checks before deploy:

```bash
npm run security:ci
```

## Deployment method

Use the deployment provider's standard production promotion path.

For Vercel-style deployment:

1. Push only reviewed commits to the production branch.
2. Wait for the build to finish.
3. Confirm build logs contain no secrets.
4. Confirm the generated deployment uses production environment variables.
5. Promote the deployment only after CI and security checks pass.

## Post-deployment smoke checks

After deployment:

1. Open the production application URL.
2. Confirm the health or readiness endpoint works only with the configured healthcheck token.
3. Confirm authentication/session flow works.
4. Confirm protected routes still require authorization.
5. Confirm Stripe webhook delivery succeeds in live mode.
6. Confirm Supabase reads/writes are covered by RLS and service-role operations are server-only.
7. Confirm Sentry receives server and client errors in the expected project.
8. Confirm no production secrets appear in HTML, browser bundles, responses, or logs.

## Rollback triggers

Rollback immediately when any of these occur:

- Authentication is broken for normal users.
- Authorization or protected route checks fail open.
- Public responses expose secrets or customer data.
- Stripe webhook handling creates incorrect billing state.
- Database migrations corrupt or hide customer data.
- Error rate increases and cannot be explained quickly.
- Health/readiness checks fail in production.

## Rollback method

Use the deployment provider's previous known-good deployment rollback.

Rollback procedure:

1. Mark the current release as blocked.
2. Promote the last known-good deployment.
3. Pause scheduled jobs if they could worsen the incident.
4. Disable affected webhook endpoints if duplicate processing is suspected.
5. Verify auth, billing, protected routes, and readiness checks again.
6. Record the rollback reason and affected commit range.

## Database rollback caution

Do not blindly reverse production database migrations.

For database incidents:

1. Stop write-heavy scheduled jobs first.
2. Preserve evidence and logs.
3. Prefer forward-fix migrations over destructive rollback.
4. Restore from backup only after confirming the recovery point objective and data loss window.
5. Record every manual SQL command executed during recovery.

## Incident handoff notes

Each failed production deployment must produce a short incident note containing:

- Release commit SHA.
- Deployment URL or release identifier.
- Time detected.
- Customer impact.
- Rollback decision.
- Recovery actions.
- Follow-up owner.

## Phase 3 completion note

Phase 3 can continue only when this runbook exists, is referenced by the readiness checker, and the strict runner passes without requiring template changes.
