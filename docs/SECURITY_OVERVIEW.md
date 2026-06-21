# RISCK COMPLY Security Overview

RISCK COMPLY is designed for European B2B compliance teams that need a secure operating layer for documents, risk evidence, audit logs, regulatory calendars and third-party governance.

## Current security controls

### Authentication

- Supabase Auth is used for user authentication.
- Sensitive application areas are protected by middleware route guards.
- Authenticated users are redirected away from login/signup pages when already signed in.

### Tenant isolation

- Organization-scoped data access is enforced server-side.
- Supabase Row Level Security policies are provided in the launch-readiness migration.
- Service-role access is restricted to server-side query helpers and API routes.

### Storage

- Controlled documents are stored in a private Supabase Storage bucket.
- Uploads validate file type, size and organization membership.
- Documents receive a SHA-256 checksum and a UUID-based storage path.

### Auditability

- Critical actions create audit events when the `audit_events` table is available.
- Billing events are synchronized from Stripe webhooks and logged where metadata allows.
- GDPR export and deletion workflows create audit and notification records.

### Plan enforcement

- Commercial entitlements are enforced server-side.
- Document quotas, CSV exports, GDPR self-service, team invites, RACI, approvals, reports, AI calendar and AI news are gated by plan.

### Application security headers

- Content Security Policy is configured in middleware and Next.js headers.
- Production builds avoid `unsafe-eval`.
- Additional headers include frame, referrer and permissions policies.

### Operational checks

- `/api/health` provides a public liveness check.
- `/api/ready` and `/api/ops/smoke` can be protected with `HEALTHCHECK_TOKEN`.
- `npm run preflight` validates production environment variables before deployment.

## Security roadmap

The following controls are planned or should be completed before large enterprise procurement:

- Formal DPA and subprocessors page.
- Incident response policy.
- Backup and restore runbook.
- Annual penetration testing evidence.
- Sentry source-map uploads in production.
- Centralized distributed rate limiting for every sensitive write endpoint.
- Full removal of legacy runtime text translation fallback.
- SOC 2 / ISO 27001 readiness documentation.

## Required production actions

Before public launch, apply these Supabase migrations:

1. `supabase/migrations/20260610_public_launch_readiness.sql`
2. `supabase/migrations/20260610_billing_stripe_sync.sql`

Then configure Vercel production environment variables documented in `.env.example`.
