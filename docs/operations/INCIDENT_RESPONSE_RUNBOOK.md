# Incident Response Runbook

## Purpose

This runbook tells the SRE/incident lead how to detect, triage, mitigate, communicate and close EuroComply incidents. It applies to production, enterprise pilots and any environment handling customer data or billing.

## Severity model

| Severity | Definition | Response target | Customer comms |
| --- | --- | --- | --- |
| SEV-1 | Broad outage, tenant isolation risk, audit-chain integrity failure, suspected data exposure, billing integrity failure across customers | Immediate incident command | Initial external update as soon as facts are confirmed, then frequent updates |
| SEV-2 | Significant customer impact, degraded readiness, webhook failure, upload scanner outage, step-up auth unavailable for sensitive actions | Assign owner immediately | Customer update when impact is confirmed or likely to persist |
| SEV-3 | Limited degradation, contained failed job, noisy security denials without confirmed customer impact | Triage during business/on-call window | Usually internal only |
| SEV-4 | Cosmetic, documentation or low-risk operational issue | Backlog/follow-up | No external update |

## Required roles

A SEV-1 or SEV-2 must not proceed without named owners:

| Role | Responsibility |
| --- | --- |
| Incident commander | Owns coordination, severity, timeline and decision log. |
| Technical lead | Leads debugging and mitigation. |
| Rollback owner | Owns rollback decision and execution path. |
| Evidence owner | Preserves Sentry/logs/readiness output and command results. |
| Customer communication owner | Owns customer-facing updates and support macros. |
| Security/privacy owner | Required for RLS, audit-chain, upload, auth or suspected data exposure incidents. |

Release is **No-Go** if the release approval record does not name an incident owner and rollback owner.

## Detection sources

Start this runbook when any of these fire:

- `/api/health` fails from external monitoring.
- `/api/ready` returns unauthorized to a configured monitor or 503 for dependency readiness.
- Sentry error rate crosses alert thresholds.
- Standardized security events spike or indicate failure: `rls_validation_failed`, `audit_chain_invalid`, `webhook_failed`, `step_up_failed`, `upload_blocked`.
- Customer support reports login, billing, upload, dashboard or export failures.
- CI/release gates fail after a deployment.

## First 10 minutes

1. Assign incident commander, technical lead, rollback owner and customer communication owner.
2. Declare severity and affected customer surface.
3. Freeze non-essential deployments until incident commander clears them.
4. Capture current deployment SHA and previous known-good deployment.
5. Check `/api/health` and protected `/api/ready`.
6. Check Sentry for new issues correlated to the deploy SHA.
7. Identify whether this is availability, dependency config, tenant isolation, billing, upload, auth or audit-chain.
8. Start a decision log with timestamps.

## Triage checklist

### Availability/readiness

- Is `/api/health` returning 200?
- Is `/api/ready` returning 200 with the healthcheck bearer token?
- Which grouped readiness check is failing: Supabase, Stripe, Redis or Sentry?
- Did the latest deployment change config, routes, middleware/proxy, auth or billing?

### Supabase/RLS

- Do not disable RLS as mitigation.
- Run or schedule the live RLS validator before closing any suspected tenant-isolation issue.
- Preserve Supabase logs, migration status, failed query metadata and Sentry issue IDs.
- Escalate to SEV-1 for any credible cross-tenant read/write risk.

### Audit chain

- Stop sharing new external evidence packs until integrity is reviewed.
- Preserve database rows and event hashes.
- Escalate to SEV-1 when `audit_chain_invalid` is emitted in production.

### Billing/webhooks

- Verify Stripe webhook secret and raw body handling.
- Confirm idempotency and subscription state transitions.
- Preserve Stripe event IDs and sanitized application event IDs.
- Escalate to SEV-2 or SEV-1 depending on customer impact.

### Uploads

- Verify scanner provider health and fail-closed behavior.
- Do not bypass malware scanning for enterprise production uploads.
- Use customer communication if clean uploads are blocked for enterprise users.

### Authentication/step-up

- Do not bypass step-up for protected actions.
- If provider is down, disable affected sensitive actions rather than weakening the control.

## Mitigation and rollback decision

Trigger rollback when any of these are true:

- error rate or readiness degradation is correlated with the current deploy;
- customer-impacting flows cannot be restored quickly by config-only mitigation;
- RLS, audit-chain, billing integrity or upload security behavior is ambiguous;
- the incident commander cannot identify a safe forward fix inside the response window.

Use `docs/operations/ROLLBACK_RUNBOOK.md` for rollback execution.

## Communication rules

- SEV-1: prepare external communication immediately after impact is confirmed; do not wait for root cause.
- SEV-2: prepare targeted communication when impact is customer-visible or likely to persist.
- Never include secrets, tokens, raw cookies, customer PII, stack traces or internal exploit detail.
- Use grouped status terms: availability, login, uploads, billing, reporting, evidence exports.
- Record timestamps for first detection, first internal declaration, first external update, mitigation, rollback and resolution.

## Closure criteria

An incident can close only when:

- `/api/health` and `/api/ready` are healthy;
- Sentry error rate is back to baseline;
- affected customer flows are validated;
- security controls remain enabled;
- rollback or forward fix is documented;
- customer communication owner has sent closure update when required;
- evidence owner has attached sanitized logs, Sentry IDs and command results;
- post-incident review owner and due date are assigned.

## Required verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run security:logs
npm run build
```
