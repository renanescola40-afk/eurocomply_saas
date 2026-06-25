# Observability Baseline

RISCK COMPLY handles compliance data, billing events, uploads and tenant-scoped workflows. Production observability must make failures visible without exposing sensitive customer data.

## Required Signals

- Application errors
- Failed Stripe webhooks
- Failed document uploads
- Authentication and authorization failures
- Rate limit events
- Slow dashboard queries
- Failed audit log writes
- Product usage analytics for activation, retention and funnel visibility

## Recommended Stack

- Sentry for application errors and performance traces
- PostHog EU for privacy-conscious product analytics and page/activity events
- Vercel logs for deployment/runtime diagnostics
- Supabase logs for database/auth/storage diagnostics
- Stripe dashboard alerts for failed payments and webhook failures

## Environment Variables

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ENVIRONMENT`
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `NEXT_PUBLIC_SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_ASSET_HOST`

## Sentry Runtime Coverage

- Browser/App Router navigation: `instrumentation-client.ts`
- Node.js runtime: `sentry.server.config.ts`
- Edge runtime: `sentry.edge.config.ts`
- App Router/server errors: `instrumentation.ts` via `onRequestError`
- Top-level render errors: `src/app/global-error.tsx`
- Sanitized application error reporting: `src/lib/observability/report-error.ts`

## Privacy Rules

Do not send raw compliance documents, access tokens, Stripe secrets, Supabase service role keys, cookies, request headers, or full user payloads to observability providers.

Sentry event hooks remove raw request and user payloads before delivery. Supabase-related error context must stay sanitized: use operation names, error codes, table names, request IDs, and tenant/account identifiers only when they are already safe for logs.

PostHog is configured for the EU ingest endpoint and only initializes when `NEXT_PUBLIC_POSTHOG_KEY` is set. Keep `person_profiles` on `identified_only` unless the privacy review explicitly approves broader profile collection.

## Provider Runbooks

- Sentry + Vercel + GitHub + Supabase: `docs/operations/SENTRY_VERCEL_GITHUB_SUPABASE.md`

## Next Steps

1. Configure Sentry DSNs and source-map upload secrets in Vercel provider settings.
2. Connect the GitHub repository inside Sentry for suspect commits and issue linking.
3. Trigger client and server test errors from a Vercel Preview and verify Sentry events.
4. Cross-check incident timestamps against Vercel runtime logs and Supabase logs.
5. Add alerting for Stripe webhook failures.
6. Add uptime checks for the application and webhook endpoint.
7. Configure the PostHog EU Project API Key in Vercel, then verify pageview ingestion from a production preview.
