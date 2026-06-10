# EuroComply Incident Response Playbook

This document defines the operational incident response baseline for EuroComply. It is intended for internal use before and during production launch.

## Severity levels

### SEV1 - Critical

Examples:

- Confirmed unauthorized access to customer data.
- Production authentication outage affecting most users.
- Stripe billing incident charging customers incorrectly.
- Supabase database compromise or major data loss.

Target response:

- Acknowledge within 15 minutes.
- Assign incident lead.
- Freeze risky deployments.
- Preserve logs and evidence.
- Notify affected customers when legally or contractually required.

### SEV2 - High

Examples:

- Partial outage of dashboard, document upload, or billing.
- Failed webhook sync affecting subscription access.
- Misconfigured RLS policy discovered before exploitation.
- Elevated error rate in production.

Target response:

- Acknowledge within 1 hour.
- Mitigate or rollback.
- Create post-incident record.

### SEV3 - Medium

Examples:

- Non-critical UI regression.
- Translation issue.
- Delayed notification or audit log fallback.
- Non-sensitive reporting export failure.

Target response:

- Triage within one business day.
- Prioritize by customer impact.

## Incident workflow

1. Detect
   - Sentry alert, Vercel logs, Supabase logs, Stripe webhook failure, customer report, or smoke check failure.

2. Triage
   - Identify severity.
   - Identify impacted tenants, routes, APIs, regions, and data categories.

3. Contain
   - Disable affected feature flag or route when possible.
   - Revoke compromised token or key.
   - Rotate secrets if needed.
   - Pause deployments if the incident is active.

4. Eradicate
   - Patch vulnerable code or configuration.
   - Apply database/RLS migration.
   - Validate with smoke tests.

5. Recover
   - Redeploy.
   - Run `/api/health`, `/api/ready`, and `/api/ops/smoke`.
   - Verify core flows: login, dashboard, upload, billing, webhook, audit events.

6. Communicate
   - Internal incident note.
   - Customer communication when required.
   - GDPR/data protection notification when legally required.

7. Post-incident review
   - Root cause.
   - Timeline.
   - Customer impact.
   - Detection gap.
   - Preventive action.
   - Owner and due date.

## Evidence to preserve

- Vercel deployment ID.
- Vercel function logs.
- Supabase audit/database logs.
- Stripe event IDs.
- Sentry issue IDs.
- Git commit SHA.
- Affected organization IDs.
- API route and request timestamps.

## Secret rotation checklist

Rotate immediately when exposure is suspected:

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` when Supabase recommends it
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENTRY_AUTH_TOKEN`
- `UPSTASH_REDIS_REST_TOKEN`
- `HEALTHCHECK_TOKEN`

## Customer notification criteria

Notify affected customers when:

- Personal data or customer confidential data was accessed, altered, or deleted without authorization.
- Availability impact materially affected contracted service.
- Billing was incorrect.
- Required by contract, DPA, GDPR, or applicable law.

## Production verification commands

```bash
npm run preflight
npm run typecheck
npm run build
curl https://YOUR_DOMAIN/api/health
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ready
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://YOUR_DOMAIN/api/ops/smoke
```

## Open items before enterprise launch

- Configure Sentry alerts and source maps.
- Configure uptime monitoring.
- Define customer-facing status page.
- Document support escalation ownership.
- Validate Supabase backups and restore procedure.
- Schedule annual penetration test.
