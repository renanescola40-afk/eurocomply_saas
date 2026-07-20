# EuroComply Production Runbook

This runbook covers Vercel production deploys, rollback, incidents, environment rotation, smoke tests, health checks, and readiness checks. Never paste real environment values, tokens, screenshots with values, or provider exports into the repository, logs, issues, or pull requests.

## Deploy

Production deploys must go through a manual dispatch of `.github/workflows/vercel-production.yml` from `main`. Supply the full SHA currently at the tip of `main` and type `DEPLOY_PRODUCTION`; the workflow verifies that exact SHA before protected-environment approval, after checkout, and again immediately before the production deploy command. A merge or push never deploys production automatically.

The deploy job must not reach the pinned Vercel CLI's `deploy --prebuilt --prod` command until every P0 gate has passed: `npm ci`, lint, typecheck, tests, build, `security:ci`, route quality, Vercel readiness, release readiness, and enterprise readiness when `RELEASE_TARGET=enterprise`.

## Vercel Project Settings variables

Configure these exact names for the Vercel Production environment. Use separate Preview values; do not reuse production credentials in preview.

Public/non-sensitive configuration: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `TRUSTED_ORIGINS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ESSENTIAL_MONTHLY`, `STRIPE_PRICE_PROFESSIONAL_MONTHLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `GOOGLE_CLIENT_ID`, `REQUIRE_MALWARE_SCAN_FOR_UPLOADS`, `MALWARE_SCANNER_PROVIDER`, `MALWARE_SCANNER_ALLOWED_HOSTS`, `MALWARE_SCANNER_CLAMAV_PORT`, `MALWARE_SCANNER_TIMEOUT_MS`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `RELEASE_TARGET`.

Protected provider-store configuration: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `HEALTHCHECK_TOKEN`, `AUDIT_CHAIN_SIGNING_SECRET`, `EVIDENCE_PACK_SIGNING_SECRET`, `STEP_UP_SIGNING_SECRET`, `CRON_SECRET`, `INTERNAL_CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `MALWARE_SCANNER_ENDPOINT`, `MALWARE_SCANNER_URL`, `MALWARE_SCANNER_API_KEY`, `MALWARE_SCANNER_CLAMAV_HOST`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.

GitHub Actions production environment credentials: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Readiness validation

Run this before opening the production deploy PR and again inside CI:

```bash
npm run ops:vercel-readiness
npm run release:production-readiness
```

`ops:vercel-readiness` validates the presence and production shape of app URLs, trusted origins, Supabase, Stripe, Google OAuth, Sentry, Upstash Redis, malware scanner, cron, audit-chain, step-up, and Vercel deploy credential names. It prints only grouped missing counts/messages, never values.

If real Vercel values cannot be validated without credentials, record open evidence instead: confirm variable names and environment scopes in the Vercel dashboard, redact/crop values, and attach text like `Vercel Project Settings checked on YYYY-MM-DD by OWNER; all required names present; values not exported.`

## Health check

Public endpoint:

```bash
curl -fsS https://YOUR_PRODUCTION_DOMAIN/api/health
```

Expected response:

```json
{"status":"ok"}
```

The endpoint must not expose versions, provider names, database status, environment names, hostnames, request metadata, or secrets.

## Readiness check

Protected endpoint:

```bash
curl -fsS -H "Authorization: Bearer <redacted-ready-token>" https://YOUR_PRODUCTION_DOMAIN/api/ready
```

Expected status is `200` only when grouped dependencies are ready. A missing or invalid bearer token must return `401`. A dependency gap must return `503`. Responses must be no-store and redacted: grouped booleans/counts are allowed; individual values, provider error messages, URLs, tokens, and hostnames are not.

## Smoke tests

After a successful deployment, open the production app root and a localized marketing route; run `/api/health`; run `/api/ready` with the protected bearer token; confirm Stripe checkout starts with live price IDs in a controlled internal account; confirm Supabase-backed pages load without server-error leaks; confirm Sentry receives a controlled non-sensitive test event if release uploads are enabled; and confirm upload malware scanning is enforced when `RELEASE_TARGET=enterprise`.

## Rollback

Stop new changes, pause related release workflows, promote the last known-good production deployment in Vercel, verify `/api/health` and `/api/ready`, then check Sentry, Vercel logs, Supabase health, Stripe webhooks, and cron status. If schema changes are involved, follow the migration-specific rollback plan from the release ticket. Never roll back data-destructive migrations without owner approval. Record deployment URL, commit SHA, operator, start/end time, and validation evidence.

## Incident response

Declare severity and owner. Preserve evidence without secrets: timestamps, deployment IDs, request IDs, redacted screenshots, and alert links. Mitigate first through rollback, feature disablement, cron pause, or credential rotation. Communicate user impact, scope, mitigation, and next update time. After mitigation, run health, readiness, smoke tests, and targeted security checks. Complete post-incident review and follow-up tasks.

## Environment variable rotation

Create the replacement credential in the source provider, add it to Vercel Production and GitHub protected production environment as needed, deploy/redeploy so runtime reads the replacement, validate with `npm run ops:vercel-readiness`, `/api/ready`, and targeted provider smoke tests, revoke the old credential, and record only variable name/provider/owner/date.

## Preview vs production

Preview must use isolated provider resources where possible: preview Supabase project, Stripe test mode, test Google OAuth client, non-production Redis, and non-production Sentry project. Production-only values must stay scoped to Vercel Production and the GitHub `production` environment. Preview deploys may run advisory checks, but production deploys require every P0 gate to pass.

## Release evidence checklist

Record workflow run URL, commit SHA, Vercel deployment URL, P0 gate status summary, `ops:vercel-readiness` result without values, `/api/health` result, `/api/ready` result with values redacted, rollback candidate deployment URL, and incident owner/on-call contact.
