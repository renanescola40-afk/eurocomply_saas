# Security Policy

EuroComply is a European B2B compliance SaaS. Security reports are taken seriously and should be handled privately.

## Supported versions

The production deployment on the `main` branch is currently supported.

## Reporting a vulnerability

Please do not create a public GitHub issue for security vulnerabilities.

Current responsible disclosure contact: `renansilva2002@gmail.com`.

Send a private report with:

- affected URL, endpoint, or component;
- steps to reproduce;
- expected impact;
- screenshots or logs when safe to share;
- whether customer data, authentication, billing, storage, or organization isolation may be affected.

## Response targets

Initial triage targets:

- Critical: 24 hours
- High: 2 business days
- Medium: 5 business days
- Low: next planned maintenance window

These are operational targets, not a contractual SLA unless separately agreed in writing.

## Security scope

In scope:

- authentication and session handling;
- organization isolation and authorization;
- Supabase RLS/storage policies;
- Stripe billing and webhooks;
- GDPR export/delete workflows;
- document upload and controlled document storage;
- audit logs and notification integrity.

Out of scope unless combined with a real exploit:

- missing security headers already documented in the roadmap;
- social engineering;
- denial-of-service without a practical abuse path;
- vulnerabilities in third-party services outside EuroComply configuration.

## Production security posture

Before public launch, confirm:

- Supabase migrations are applied;
- storage bucket `controlled-documents` is private;
- RLS policies are active;
- Stripe webhook signature verification is enabled;
- Sentry source maps and alerting are configured if Sentry is enabled;
- `HEALTHCHECK_TOKEN` protects readiness and smoke endpoints;
- production secrets are rotated when personnel or deployment context changes.

## Claims guardrail

Do not claim SOC 2, ISO 27001 certification, completed third-party penetration testing, end-to-end encryption, immutable/WORM audit storage, 24/7 staffed monitoring, tested disaster recovery, tested backup restore, or guaranteed RTO/RPO unless approved evidence exists.
