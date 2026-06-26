# RISCK COMPLY production observability runbook

This runbook is the minimum operating procedure for production incidents in RISCK COMPLY.

## Production signals

Primary tools:

- Sentry: application exceptions, release health, issue ownership, smoke-test verification.
- Vercel: deploy status, 5xx spikes, function duration, edge/network errors.
- Stripe: checkout and webhook delivery failures.
- Supabase: database/API status, connection failures, auth and RLS symptoms.
- Application logs: sanitized JSON events only. Never paste raw Authorization headers, cookies, tokens, Stripe signatures, service-role keys, DSNs or customer PII into tickets.

## Required environment variables

Server/runtime:

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE` or `VERCEL_GIT_COMMIT_SHA`
- `SENTRY_TRACES_SAMPLE_RATE` — production default should stay low, for example `0.05`.
- `HEALTHCHECK_TOKEN` — long random secret used only for internal smoke checks.
- `OPS_ALERT_WEBHOOK_URL` — optional webhook for GitHub Actions deploy-failed alerts.

Client/runtime:

- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `NEXT_PUBLIC_SENTRY_RELEASE` or `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`

Sourcemap upload:

- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

## Smoke test

Run after every production deploy:

```bash
curl -X POST "$APP_URL/api/observability/smoke" \
  -H "Authorization: Bearer $HEALTHCHECK_TOKEN" \
  -H "Cache-Control: no-store"
```

Expected:

- HTTP 200.
- `Cache-Control` includes `no-store`.
- Response body contains `status: sent`, `provider`, and `requestId` only.
- No stack trace, secret, request header, cookie or Authorization value is returned.
- Sentry receives one event tagged with `area=observability_smoke` and context `smokeTest=true`.

Failure handling:

1. If HTTP 401, rotate/check `HEALTHCHECK_TOKEN` in Vercel and the caller secret store.
2. If HTTP 429, wait for the internal health rate limit window and verify the rate-limit backend.
3. If provider is `local_log`, verify `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` in Vercel production env.
4. If Sentry has no event but response is `sent`, check Sentry DSN, project ingest, environment filter and release filter.

## Alert rules to configure

### 1. High 5xx rate

Trigger when Vercel function or Sentry transaction errors show either:

- 5xx rate above 2% for 5 minutes, or
- at least 10 5xx responses in 5 minutes on production.

First response:

1. Check latest deployment and rollback candidate.
2. Open Sentry issues filtered by `environment:production` and latest release.
3. Check Vercel function logs for sanitized `application_error_reported` events.
4. If database errors dominate, jump to Supabase connection failures below.

### 2. Checkout/webhook failures

Trigger immediately when any of these increase in production:

- Sentry issue with area `stripe_webhook`, `stripe_webhook_signature`, `stripe_webhook_rate_limit`, `payment_failed_email`, `stripe_webhook_mark_failed`.
- Stripe webhook endpoint delivery failures.
- Database row in `stripe_events_processed` stuck in `processing` or `failed`.

First response:

1. In Stripe Dashboard, inspect the failed event and delivery attempts.
2. Verify `STRIPE_WEBHOOK_SECRET` matches the production endpoint.
3. Check whether `stripe_events_processed` contains the event id.
4. If status is `failed`, fix the root cause, then replay the Stripe event from Stripe Dashboard.
5. Confirm the subscription row updated and an audit log was written.
6. Never log or paste `stripe-signature`, webhook secret, customer email, card data or raw event payload in public channels.

### 3. Abnormal auth failures

Trigger when auth/security-denied events exceed baseline by 3x for 10 minutes, or when login success drops sharply after deploy.

First response:

1. Check whether the latest deploy changed auth middleware, callback URLs, Clerk/Supabase configuration, or locale redirects.
2. Inspect Sentry for areas related to auth, RBAC, origin guards, token validation or step-up.
3. Confirm OAuth redirect URLs in provider console and Vercel production URL.
4. Confirm app env variables for Clerk/Supabase are production values, not preview/local values.
5. If customers are blocked, consider rollback before deep debugging.

### 4. Deploy failed

Trigger on failed GitHub Actions workflows and failed Vercel production deployments.

First response:

1. Open the failed workflow/deploy log.
2. Identify whether failure is lint, typecheck, build, test, dependency install, env missing or Vercel platform error.
3. If production is healthy, do not hotfix blindly; fix on branch and redeploy.
4. If production is unhealthy and deploy failure blocks rollback, use the last known good deployment in Vercel.

### 5. Supabase connection failures

Trigger when Sentry/logs show repeated Supabase connection, timeout, auth admin, PostgREST or storage failures.

First response:

1. Check Supabase project status and database health.
2. Confirm Vercel env variables: `NEXT_PUBLIC_SUPABASE_URL`, anon key, service role/admin key.
3. Check connection usage and long-running queries.
4. Verify RLS migrations were applied to production.
5. If all tenants are affected, treat as P1. If only one tenant is affected, check RLS/org membership path below.

## What to do if webhook fails

1. Triage whether it is signature validation, rate limit, payload size, processing error, Supabase write failure or email failure.
2. For signature failures, verify endpoint URL and `STRIPE_WEBHOOK_SECRET`; never log the signature.
3. For processing failures, find the Sentry event by area and request time.
4. Check `stripe_events_processed` for the event id:
   - `processing`: investigate stuck execution and retry if safe.
   - `failed`: fix root cause and replay from Stripe.
   - `processed`: no action unless customer state is wrong.
5. Verify customer subscription, entitlement and audit-log state after replay.

## What to do if login breaks

1. Determine blast radius: all users, one provider, one locale, one tenant or only preview.
2. Check latest deploy, auth middleware, callback routes and environment variables.
3. Validate provider configuration:
   - OAuth provider enabled.
   - Authorized origins include production domain.
   - Redirect/callback URL matches production route exactly.
4. Inspect Sentry for sanitized auth errors and Vercel logs for `security_denied` patterns.
5. Roll back if production users cannot enter the dashboard.
6. After fix, test login, logout, session refresh and dashboard redirect.

## What to do if RLS blocks a legitimate customer

1. Confirm the authenticated user id and organization membership in app tables.
2. Confirm the route/action uses the expected organization id and never trusts client-provided org ids without membership validation.
3. Check recent RLS migrations and policy diffs.
4. Reproduce with a non-admin user from the same organization in a safe environment.
5. If policy is wrong, patch RLS policy, add/adjust regression test, and record a security audit note.
6. If membership data is wrong, repair membership/audit state rather than weakening RLS.

## Log safety checklist

Before adding or changing logs, verify:

- No Authorization header.
- No cookies or Set-Cookie.
- No access, refresh, id, CSRF or session tokens.
- No Supabase service-role key, Stripe secret, webhook secret, DSN, private key or database URL.
- No customer email, phone, address, card, IBAN or sensitive metadata unless explicitly minimized and justified.
- Errors returned to API clients are generic and never include stack traces.
