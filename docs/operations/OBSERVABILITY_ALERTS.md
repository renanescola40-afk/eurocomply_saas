# RISCK COMPLY production alert policy

This file defines the production alert rules that must exist in Sentry, Vercel, Stripe, Supabase and GitHub/Vercel deployment notifications.

## Ownership

- Primary owner: Engineering / on-call owner.
- Business owner: Founder/operator.
- Customer-impacting incident channel: private internal incident channel only.
- Public/customer communications: only after impact and scope are confirmed.

## Alert matrix

| Alert | Source | Severity | Trigger | Action |
| --- | --- | --- | --- | --- |
| High 5xx rate | Sentry/Vercel | P1 | 5xx > 2% for 5 min or >= 10 5xx in 5 min | Check latest release, rollback if customer-facing paths are broken |
| Checkout failure | Sentry/Stripe | P1 | Any production checkout creation or Stripe API error | Verify Stripe config, app env, and customer billing state |
| Webhook failure | Sentry/Stripe/Supabase | P1 | Any invalid processing path after signature validation | Fix root cause, replay Stripe event, verify subscription/audit state |
| Auth failure spike | Sentry/logs | P1/P2 | Auth/security denial 3x over baseline for 10 min | Verify auth provider, callback URLs, middleware and latest deploy |
| Deploy failed | GitHub/Vercel | P2 | Production workflow/deploy failed | Fix build/deploy pipeline; if prod is impacted, rollback to last good Vercel deploy |
| Supabase connection failure | Sentry/Supabase | P1 | Repeated PostgREST/db/auth admin failures for 5 min | Check Supabase status, env, pool/connection usage and migrations |
| Smoke test missing | Sentry | P2 | No `area=observability_smoke` event after production deploy | Verify DSN, HEALTHCHECK_TOKEN and smoke job |

## Sentry issue alert examples

Create Sentry issue alerts with these filters:

### API 5xx / application errors

- Environment: `production`
- Event tag: `app=risck-comply`
- Issue count: `>= 10` in `5 minutes`
- Notify: primary engineering channel/email

### Stripe billing failures

- Environment: `production`
- Event tag `area` is one of:
  - `stripe_webhook`
  - `stripe_webhook_signature`
  - `stripe_webhook_rate_limit`
  - `stripe_webhook_mark_failed`
  - `payment_failed_email`
- Issue count: `>= 1` in `5 minutes`
- Notify: engineering + founder/operator

### Auth failures

- Environment: `production`
- Search query includes one of:
  - `security_denied`
  - `rbac_denied`
  - `step_up_failed`
  - `origin_denied`
- Event count: `>= 3x` normal baseline over `10 minutes`
- Notify: engineering

### Supabase failures

- Environment: `production`
- Search query includes one of:
  - `Supabase`
  - `PostgREST`
  - `connection`
  - `timeout`
  - `auth.admin`
- Issue count: `>= 3` in `5 minutes`
- Notify: engineering

## Vercel alerts

Enable Vercel project notifications for:

- Production deployment failed.
- Function errors / 5xx spike.
- Function duration p95 degraded.
- Domain/certificate issues.

Recommended thresholds:

- p95 API latency: warn above `800ms` for 10 minutes; critical above `1500ms` for 5 minutes.
- 5xx: critical above `2%` or `>= 10` in 5 minutes.

## Stripe alerts

Enable Stripe webhook endpoint alerts for:

- Endpoint delivery failure.
- Repeated non-2xx responses.
- Elevated `invoice.payment_failed` volume.

Webhook endpoint must point to the production URL only. Preview endpoints should have a separate secret and alert channel.

## Supabase alerts

Enable Supabase project alerts for:

- Database unavailable.
- High CPU / memory / disk.
- Connection saturation.
- Auth service incident.
- Storage service incident.

## GitHub/Vercel deploy-failed alert

Enable native notifications in GitHub Actions and Vercel for production deploy failures. A deploy failure should page/notify the engineering owner when:

- the failing workflow targets `main`, or
- Vercel marks the production deployment as failed, canceled, or blocked by missing env/config.

Keep webhook integrations configured in the vendor UI rather than committing webhook-forwarding workflow code to the repository.

## Dashboard

In-app minimum dashboard route:

```text
/[locale]/dashboard/observability
```

It links the operator to Sentry/Vercel when `SENTRY_ORG`, `SENTRY_PROJECT`, `VERCEL_TEAM_SLUG`, and `VERCEL_PROJECT_SLUG` are present.
