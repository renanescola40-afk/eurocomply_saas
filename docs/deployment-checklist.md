# EuroComply production deployment checklist

Use this before enabling real customer traffic.

## Application

- Configure the public application URL.
- Configure Supabase public URL and anon key.
- Configure the Supabase service-role key only in server-side environments.
- Confirm no real secret is committed to GitHub.

## Billing

- Configure Stripe publishable key, secret key and webhook signing secret.
- Enable subscription created, updated and deleted webhook events.
- Enable failed invoice/payment webhook events.
- Verify checkout success and cancellation return paths.
- Verify customer portal return path.

## Email

- Configure the email provider API key.
- Configure a verified sender address.
- Test invitation, onboarding, payment failure, trial reminder, document expiry and vendor review emails.

## Internal jobs

- Configure a private cron/job token.
- Enable scheduled calls for metric snapshots.
- Enable scheduled calls for compliance alerts.
- Enable scheduled calls for trial reminders.
- Confirm failed jobs report through observability.

## Rate limiting

- Configure Redis/Upstash for production.
- Keep local in-memory fallback for development only.
- Verify protected flows: invitations, checkout, customer portal, document upload, exports and webhooks.

## Observability

- Configure Sentry DSNs.
- Configure source-map upload only in CI/Vercel if needed.
- Create alerts for billing failures, webhook failures, upload failures, export failures, rate-limit spikes and cron failures.

## Database

Apply all pending Supabase migrations, especially:

- Compliance metric snapshots.
- Email notification dedupe events.
- Dedupe entity id text migration.

Then verify row-level security policies for:

- Organizations.
- Organization members.
- Documents.
- Vendors.
- Risks.
- Tasks.
- Invitations.
- Audit logs.
- Subscriptions.
- Metric snapshots.
- Email notification events.

## Storage

- Confirm document storage bucket is private.
- Confirm downloads use signed URLs only.
- Confirm signed URLs expire quickly.
- Confirm document storage paths are scoped by organization id.

## Final quality gate

Run locally or in CI:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Ship only after all commands pass.
