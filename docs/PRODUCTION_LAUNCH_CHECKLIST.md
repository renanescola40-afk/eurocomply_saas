# EuroComply Production Launch Checklist

Use this checklist before publishing EuroComply to paying customers.

## 1. Vercel environment

Set these variables in Vercel for Production, Preview, and Development as needed:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `HEALTHCHECK_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Run before production deploy:

```bash
npm run preflight
npm run typecheck
npm run build
```

## 2. Supabase database and storage

Run these migrations in the Supabase SQL editor, in order:

- `supabase/migrations/20260610_public_launch_readiness.sql`
- `supabase/migrations/20260610_billing_stripe_sync.sql`
- `supabase/migrations/20260610_ai_governance_inventory.sql`
- `supabase/migrations/20260610_ai_incident_register.sql`

They create or update:

- `organization_invites`
- `audit_events`
- `notifications`
- `rate_limits`
- `subscriptions`
- `ai_systems`
- `ai_incidents`
- `documents.storage_path`
- `documents.checksum_sha256`
- private storage bucket `controlled-documents`
- RLS policies for member-scoped reads and uploads

After running them, verify:

- RLS is enabled on every organization-scoped table.
- The `controlled-documents` bucket is private.
- A user from organization A cannot read files/events from organization B.
- Service-role operations are only used server-side.

## 3. Stripe subscriptions

Create live products/prices for:

- Essential: EUR 49/month
- Professional: EUR 149/month
- Business: EUR 399/month
- Enterprise: from EUR 990/month or sales-led contract

Configure Stripe webhook endpoint:

- `https://YOUR_DOMAIN/api/billing/webhook`

Configure Stripe webhook events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Verify plan gates:

- Essential: 10 documents, no team invites, no RACI/workflows, no CSV/GDPR self-service.
- Professional: 100 documents, AI calendar/news, audit log, CSV exports, GDPR self-service.
- Business: 500 documents, team invites, RACI, approvals, executive reports.
- Enterprise: unlimited scale, advanced permissions, consultative support.
- Downgrades remove higher-tier access.
- Failed payments do not leave privileged access active forever.

## 4. Security checks

Before launch:

- Confirm CSP has no `unsafe-eval` in production.
- Confirm Sentry source maps upload when `SENTRY_AUTH_TOKEN` is configured.
- Configure Upstash Redis for distributed rate limiting.
- Test login, signup, logout, password reset, and protected route redirects.
- Test `/en`, `/pt`, `/es`, `/fr`, `/it`, `/de` routes.
- Test language persistence via `NEXT_LOCALE` and `eurocomply-locale`.
- Test file upload validation: size, MIME type, checksum, and private bucket storage.
- Test GDPR export and delete request endpoints.
- Test `/api/health`, `/api/ready`, `/api/ops/smoke`, and `/api/ops/enterprise-readiness`.

## 5. Smoke test flow

Run this flow after every production deploy:

1. Open the public landing page.
2. Switch language to PT, ES, FR, IT, DE and EN.
3. Sign up or log in.
4. Create or select an organization.
5. Open dashboard, profile, documents, risks, RACI, approvals, calendar, notifications, audit log, AI Systems, and AI Incidents.
6. Upload a controlled document.
7. Register an AI system and confirm AI Act classification appears.
8. Register an AI incident and confirm deadline triage appears.
9. Confirm Essential document limits block after 10 documents.
10. Upgrade to Professional via Stripe test mode and confirm CSV/GDPR self-service unlocks.
11. Upgrade to Business and confirm RACI, approvals, team invites, and executive reports unlock.
12. Confirm audit events and notifications are written.
13. Confirm another organization cannot access the same files/events.

Protected smoke endpoint:

```bash
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ops/smoke
```

Protected enterprise readiness endpoint:

```bash
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ops/enterprise-readiness
```

Target before enterprise sales: `score >= 90` and `status = enterprise_ready`.

## 6. Launch decision

Do not launch paid traffic until all items below are true:

- Production build passes.
- Supabase migrations have been applied.
- Stripe live mode is configured and tested.
- Vercel production environment is complete.
- Sentry releases/source maps work or source-map upload is intentionally disabled for the environment.
- Upstash rate limiting is configured.
- AI Governance migrations are applied.
- Cross-organization data isolation has been manually tested.
- Enterprise readiness endpoint reports at least 90/100.
