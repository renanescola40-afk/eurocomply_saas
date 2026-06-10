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
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`

## 2. Supabase database and storage

Run this migration in the Supabase SQL editor:

- `supabase/migrations/20260610_public_launch_readiness.sql`

It creates or updates:

- `organization_invites`
- `audit_events`
- `notifications`
- `rate_limits`
- `documents.storage_path`
- `documents.checksum_sha256`
- private storage bucket `controlled-documents`
- RLS policies for member-scoped reads and uploads

After running it, verify:

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

Configure Stripe webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Verify plan gates:

- Enterprise-only team invites.
- Downgrade removes Enterprise-only access.
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

## 5. Smoke test flow

Run this flow after every production deploy:

1. Open the public landing page.
2. Switch language to PT, ES, FR, IT, DE and EN.
3. Sign up or log in.
4. Create or select an organization.
5. Open dashboard, profile, documents, risks, RACI, approvals, calendar, notifications, and audit log.
6. Upload a controlled document.
7. Export GDPR data.
8. Invite an employee with an Enterprise organization.
9. Confirm audit events and notifications are written.
10. Confirm another organization cannot access the same files/events.

## 6. Launch decision

Do not launch paid traffic until all items below are true:

- Production build passes.
- Supabase migration has been applied.
- Stripe live mode is configured and tested.
- Vercel production environment is complete.
- Sentry releases/source maps work.
- Upstash rate limiting is configured.
- Cross-organization data isolation has been manually tested.
