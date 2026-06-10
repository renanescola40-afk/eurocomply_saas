# EuroComply Backup and Continuity Plan

This document defines the minimum backup and continuity expectations for EuroComply production launch.

## Scope

Covered systems:

- Vercel application deployment.
- Supabase Postgres database.
- Supabase Storage bucket `controlled-documents`.
- Stripe billing records and webhooks.
- Sentry observability.
- Upstash Redis rate limiting, when configured.

## Recovery objectives

Initial production targets:

- RTO: 4 hours for core application availability.
- RPO: 24 hours for database state, subject to Supabase project backup configuration.
- Document storage recovery: aligned with Supabase Storage backup/retention capabilities.

Enterprise target roadmap:

- RTO: 1 hour.
- RPO: 4 hours or better.
- Formal restore drills twice per year.

## Supabase database

Production requirements:

- Enable scheduled backups according to the Supabase plan in use.
- Confirm point-in-time recovery availability for the production project.
- Restrict access to production database credentials.
- Apply migrations through reviewed SQL files in `supabase/migrations`.
- Validate RLS policies after every schema change.

Restore checklist:

1. Identify affected project and time window.
2. Pause risky writes when possible.
3. Export relevant logs and evidence.
4. Restore from Supabase backup or point-in-time recovery.
5. Reapply missing migrations if needed.
6. Run production smoke checks.
7. Validate tenant isolation and core user flows.

## Supabase Storage

Bucket:

- `controlled-documents`

Requirements:

- Bucket must remain private.
- Storage policies must restrict access to organization members.
- Uploaded files should include metadata in `documents`, including `storage_path` and `checksum_sha256`.
- Large or regulated customers may require additional backup/export procedures.

Recovery checklist:

1. Confirm bucket exists and is private.
2. Verify storage policies.
3. Confirm metadata records match storage objects.
4. Recalculate checksums when integrity is questioned.

## Stripe

Stripe is the source of truth for payment events.

Requirements:

- Configure webhook endpoint: `/api/billing/webhook`.
- Store webhook signing secret in `STRIPE_WEBHOOK_SECRET`.
- Monitor webhook delivery failures in Stripe Dashboard.
- Keep `subscriptions` table synchronized from webhook events.

Recovery checklist:

1. Replay failed Stripe events from the Dashboard.
2. Verify `subscriptions` rows by organization.
3. Confirm entitlements reflect subscription plan and status.
4. Test Customer Portal access.

## Vercel

Requirements:

- Production deployments must come from reviewed `main` commits.
- Environment variables must be configured in Production, Preview, and Development as needed.
- Use rollback when a deployment causes production incidents.
- Keep `HEALTHCHECK_TOKEN` configured for protected operational endpoints.

Verification endpoints:

- `/api/health`
- `/api/ready`
- `/api/ops/smoke`

## Continuity checks before launch

Run before go-live:

```bash
npm run preflight
npm run typecheck
npm run test
npm run build
```

Then verify production:

```bash
curl https://YOUR_DOMAIN/api/health
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ready
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ops/smoke
```

## Restore drill roadmap

Before enterprise contracts:

- Run a database restore drill in a non-production Supabase project.
- Validate restoring `subscriptions`, `documents`, `audit_events`, `notifications`, and `organization_invites`.
- Validate storage object access after restore.
- Document elapsed recovery time and gaps.

## Open items

- Confirm Supabase plan includes required backup capabilities.
- Define customer-facing SLA by plan.
- Add uptime monitoring provider.
- Add incident communication templates.
- Add internal owner for backup verification.
