# Observability Baseline

EuroComply handles compliance data, billing events, uploads and tenant-scoped workflows. Production observability must make failures visible without exposing sensitive customer data.

## Required Signals

- Application errors
- Failed Stripe webhooks
- Failed document uploads
- Authentication and authorization failures
- Rate limit events
- Slow dashboard queries
- Failed audit log writes

## Recommended Stack

- Sentry for application errors and performance traces
- Vercel logs for deployment/runtime diagnostics
- Supabase logs for database/auth/storage diagnostics
- Stripe dashboard alerts for failed payments and webhook failures

## Environment Variables

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`

## Privacy Rules

Do not send raw compliance documents, access tokens, Stripe secrets, Supabase service role keys, or full user payloads to observability providers.

## Next Steps

1. Add Sentry SDK and config files.
2. Capture server action failures with sanitized context.
3. Add alerting for Stripe webhook failures.
4. Add uptime checks for the application and webhook endpoint.
