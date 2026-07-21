# Platform provider interoperability proof

## Purpose

Prove, through protected read-only API calls, that the configured Supabase/Auth, Stripe and Sentry credentials resolve to working provider resources.

This proof does not create users, payments, webhook deliveries or Sentry events.

## Protected environment

Create or verify the GitHub environment:

`production-provider-proof`

### Variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### Secrets

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `SENTRY_AUTH_TOKEN`

Use a Sentry token scoped only to read the configured project. Never use an owner-wide token when a narrower token is available.

## Execution

1. Open **Actions → Platform Provider Interoperability**.
2. Select the exact ref intended for production proof.
3. Set `strict_runtime=true`.
4. Approve the protected environment.
5. Download `platform-provider-interoperability-<sha>`.
6. Confirm `status: PASS` and `secret_values_included: false`.

## Controls

### Supabase/Auth

- Auth settings endpoint is reachable with the configured anon key.
- Google OAuth is reported as enabled.
- A structured Auth settings response is returned.

### Stripe

- The secret key can read the connected Stripe account.
- Stripe reports whether the account is in test or live mode.
- The expected application webhook endpoint exists and is enabled.

### Sentry

- The configured organization and project are reachable.
- The returned project slug matches `SENTRY_PROJECT`.

## Failure handling

- Do not paste credentials into issues, logs or screenshots.
- Correct values only in the protected GitHub environment and provider dashboard.
- Re-run against the same exact SHA after correction.
- A Vercel quota or deployment failure must be resolved in Vercel; do not weaken required checks.

## Evidence boundary

A PASS proves provider API access and selected configuration at execution time. It does not prove complete OAuth login, Stripe webhook delivery, payment settlement, Sentry event ingestion, source-map symbolication, provider uptime or contractual ownership.
