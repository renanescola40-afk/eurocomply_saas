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

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_ASSET_HOST`

## Privacy Rules

Do not send raw compliance documents, access tokens, Stripe secrets, Supabase service role keys, or full user payloads to observability providers.

PostHog is configured for the EU ingest endpoint and only initializes when `NEXT_PUBLIC_POSTHOG_KEY` is set. Keep `person_profiles` on `identified_only` unless the privacy review explicitly approves broader profile collection.

## Next Steps

1. Add Sentry SDK and config files.
2. Capture server action failures with sanitized context.
3. Add alerting for Stripe webhook failures.
4. Add uptime checks for the application and webhook endpoint.
5. Configure the PostHog EU Project API Key in Vercel, then verify pageview ingestion from a production preview.
