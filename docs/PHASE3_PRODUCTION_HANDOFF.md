# Phase 3 Production Handoff

This handoff summarizes what must be confirmed before EuroComply SaaS Phase 3 can be marked production-complete.

## Scope

This document is a production handoff checklist. It does not authorize product, email, document, or UI template changes.

## Repository readiness summary

The repository now contains Phase 3 readiness documentation and automated checks for:

- Production readiness.
- Deployment and rollback.
- Database migration safety.
- Runtime security and observability.
- Auth/session readiness.
- Completion gates.
- Progress status.

## Required repository commands

Run these commands before production promotion:

```bash
npm run phase3:strict
node scripts/dev/check-phase3-progress-status.mjs
```

If either command fails, do not mark Phase 3 complete.

## Required external confirmations

Confirm these outside the repository:

1. Production secrets are configured only in the deployment provider or external services.
2. The deployment target uses production environment variables.
3. Supabase production migrations are reviewed and applied in filename order.
4. Stripe live products and prices are configured.
5. Stripe live webhook endpoint points to the production billing webhook route.
6. Sentry production project is configured when observability is enabled.
7. Health/readiness checks require the configured healthcheck token.
8. Cron/scheduled routes require `CRON_SECRET` or an equivalent internal secret.
9. No customer data, private keys, service-role keys, Stripe secrets, or Sentry auth tokens are committed.
10. No product, document, email, or UI template was modified as part of Phase 3 readiness work.

## Go/no-go rule

Phase 3 is a go only when:

- Repository checks pass locally or in CI.
- External deployment gates are confirmed.
- No secrets are committed.
- Rollback path is known.
- Production owner accepts the handoff.

## Handoff result language

Use these exact statuses:

- `repository-complete`: repository docs and checks exist.
- `validated`: `npm run phase3:strict` and progress checks pass.
- `production-complete`: repository checks pass and all external confirmations are complete.

Until external confirmations are complete, the correct status is `repository-complete`, not `production-complete`.
