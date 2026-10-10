# Railway Failover Runbook

## Purpose

Provide a controlled alternate hosting path for RISCK COMPLY when the primary Vercel deployment path is unavailable.

This runbook does not authorize a production DNS cutover by itself. It prepares a preview/failover target that must be validated before traffic is moved.

## Source

- Repository: `renanescola40-afk/eurocomply_saas`
- Production branch: `main`
- Build command: `npm run build`
- Start command: `npm run start`
- Public liveness endpoint: `/api/health`

## Provider configuration

The repository includes `railway.toml` with Railpack, the existing Next.js build/start commands, a public healthcheck, and an on-failure restart policy.

Do not copy secrets into source control. Configure protected environment variables directly in the provider.

## Required validation before any DNS change

1. Deploy the exact intended `main` SHA to an isolated Railway service.
2. Configure the same production-safe environment contract required by `.env.example` and `docs/production-runbook.md`.
3. Keep Stripe LIVE webhooks pointed at the current production endpoint until the failover runtime is verified.
4. Verify:
   - `GET /api/health` returns HTTP 200.
   - `GET /api/ready` passes with the protected health token.
   - authentication redirects and OAuth callback URLs are correct for the temporary Railway hostname.
   - Supabase tenant isolation remains unchanged.
   - Stripe checkout/portal remain fail-closed unless the exact LIVE configuration is intentionally enabled.
   - Sentry/observability identifies the alternate environment distinctly.
5. Recreate scheduled jobs currently represented in `vercel.json`:
   - `/api/internal/daily-maintenance` — `0 4 * * *`
   - `/api/internal/compliance-alerts` — `5 4 * * *`
   - `/api/internal/marketing/linkedin/process` — `*/15 * * * *`
6. Run smoke tests against the temporary Railway hostname.
7. Do not change `risckcomply.com` or `www.risckcomply.com` until the alternate runtime has passed all release gates.

## Security boundaries

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, Stripe secret keys, OAuth client secrets, signing secrets, or provider tokens in Git.
- Do not disable RLS or weaken tenant isolation for migration.
- Do not point LIVE Stripe webhooks at an unverified preview.
- Do not change DNS merely to make a failing deployment appear healthy.
- Preserve the existing Vercel production deployment as rollback evidence until an alternate production release is proven.

## Exit criteria

```text
ALTERNATE_PROVIDER_CONNECTED=YES
EXACT_MAIN_SHA_DEPLOYED=YES
HEALTHCHECK_PASS=YES
READINESS_PASS=YES
AUTH_SMOKE_PASS=YES
SUPABASE_RUNTIME_PASS=YES
STRIPE_RUNTIME_PASS=YES_OR_EXPLICITLY_NOT_ENABLED
CRON_EQUIVALENCE_CONFIGURED=YES
OBSERVABILITY_PASS=YES
DNS_CUTOVER=NOT_REQUIRED_UNTIL_OWNER_APPROVAL
FAILOVER_READY=YES
```
