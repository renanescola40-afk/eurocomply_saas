# Security Policy

EuroComply is a European B2B compliance SaaS. Security reports are taken seriously and should be handled privately.

## Supported versions

The production deployment on the `main` branch is currently supported.

## Reporting a security issue

Please do not create a public GitHub issue for private security reports.

Send a private report to `renansilva2002@gmail.com` with:

- affected URL, endpoint, or component;
- steps to reproduce;
- expected impact;
- screenshots or logs when safe to share;
- whether customer data, authentication, billing, storage, or organization isolation may be affected.

## Response targets

Initial triage targets are operational goals, not contractual SLAs unless agreed separately:

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

## Claims guardrail

Do not claim SOC 2, ISO 27001 certification, completed external review, tested disaster recovery, guaranteed RTO/RPO, or 24/7 staffed monitoring unless approved evidence exists. Use `designed to support` for evidence-dependent capabilities.
