# Incident Response Runbook

## Purpose

This runbook tells the SRE/incident commander how to detect, triage, mitigate, communicate and close RISCK COMPLY production incidents. It applies to production, enterprise pilots and any environment handling customer data, billing or trust evidence.

## Severity model

| Severity | Definition | Response target | Customer comms |
| --- | --- | --- | --- |
| SEV-1 | Broad outage, tenant isolation risk, audit-chain integrity failure, suspected data exposure, billing integrity failure across customers, security control bypass | Immediate incident command | Initial external update as soon as facts are confirmed, then frequent updates |
| SEV-2 | Significant customer impact, degraded readiness, webhook failure, upload scanner outage, auth/step-up unavailable for sensitive actions | Assign owner immediately | Customer update when impact is confirmed or likely to persist |
| SEV-3 | Limited degradation, contained failed job, noisy security denials without confirmed customer impact | Triage during business/on-call window | Usually internal only |
| SEV-4 | Cosmetic, documentation or low-risk operational issue | Backlog/follow-up | No external update |

## Required roles

A SEV-1 or SEV-2 must not proceed without named owners.

| Role | Responsibility |
| --- | --- |
| Incident commander | Owns coordination, severity, timeline, decision log and rollback call. |
| Technical lead | Leads debugging and mitigation. |
| Rollback owner | Owns rollback execution path and post-rollback validation. |
| Evidence owner | Preserves Sentry/logs/readiness output and command results. |
| Customer communication owner | Owns customer-facing updates and support macros. |
| Security/privacy owner | Required for RLS, audit-chain, upload, auth or suspected data exposure incidents. |
| Billing owner | Required for Stripe, payment, subscription or invoice incidents. |

Release is **No-Go** if the release approval record does not name incident, rollback and customer communication owners.

## Detection sources

Start this runbook when any of these fire:

- `/api/health` fails from external monitoring.
- `/api/ready` returns unauthorized to a configured monitor or 503 for dependency readiness.
- `/api/observability/smoke` cannot reject anonymous calls or emit a protected smoke event when enabled.
- Sentry error rate crosses alert thresholds or a new release has a critical issue.
- Standardized security events spike or indicate failure: `rls_validation_failed`, `audit_chain_invalid`, `webhook_failed`, `step_up_failed`, `upload_blocked`, `security_denied`.
- Customer support reports login, billing, upload, dashboard, export or evidence-pack failures.
- CI/release gates fail after deployment.
- Provider status alerts from Vercel, Supabase, Stripe, Clerk/auth provider, Sentry or PostHog/analytics.

## First 10 minutes

1. Assign incident commander, technical lead, rollback owner, evidence owner and customer communication owner.
2. Declare severity and affected customer surface.
3. Freeze non-essential deployments until the incident commander clears them.
4. Capture current deployment SHA, previous known-good deployment and release evidence path.
5. Check `/api/health` publicly.
6. Check protected `/api/ready` with the healthcheck bearer token.
7. Check Sentry for new issues correlated to the deploy SHA.
8. Check provider status pages and recent deploy/config changes.
9. Identify whether this is availability, dependency config, tenant isolation, billing, upload, auth, analytics/consent, observability or audit-chain.
10. Start a timestamped decision log.

## Scenario runbooks

### Supabase down or degraded

Detection: `/api/ready` database check fails, Supabase status alert, elevated query errors or Sentry `ready_supabase_check`.

Immediate actions:
- Do not disable RLS as mitigation.
- Confirm whether public pages still load and whether authenticated flows are impacted.
- Preserve Supabase logs, failed query metadata, migration status and Sentry issue IDs.
- If writes are unsafe or tenant isolation is uncertain, move to SEV-1.
- Prefer fail-closed for evidence exports, document uploads and tenant-sensitive actions.
- Use customer communication when dashboard, documents or evidence workflows are unavailable.

Recovery validation:
- `/api/ready` returns `ready`.
- Live RLS validators pass before closing any suspected isolation issue.
- Audit event creation works after recovery.

### Stripe down or degraded

Detection: readiness Stripe check fails, Stripe status alert, checkout/billing portal failures, failed webhook processing.

Immediate actions:
- Do not create manual subscription state changes without billing owner approval.
- Preserve Stripe event IDs, sanitized internal IDs and webhook delivery status.
- If checkout is down, disable or message paid upgrade CTAs rather than allowing broken payments.
- If webhooks are delayed, queue/retry with idempotency; do not replay blindly.

Recovery validation:
- Stripe API readiness passes.
- A safe test webhook verifies signature and idempotency.
- Subscription state matches Stripe for impacted accounts.

### Clerk/auth down or auth provider degraded

Detection: login/signup failures, session verification errors, step-up unavailable, auth-provider status alert.

Immediate actions:
- Confirm whether existing sessions continue to work.
- Do not bypass authentication, RBAC or step-up controls.
- Disable sensitive actions if step-up is unavailable.
- Use customer communication when users cannot access dashboard or required compliance workflows.

Recovery validation:
- Login/signup works.
- Protected routes redirect unauthenticated users correctly.
- Sensitive actions still require the expected auth/step-up guard.

### Vercel deployment failed or bad deploy

Detection: failed deploy, build/runtime errors after deploy, public pages fail, `/api/health` fails, new Sentry release issue.

Immediate actions:
- Freeze further deploys.
- Compare current SHA with last known-good.
- Run `npm run release:rollback:dry-run` with the previous known-good deployment configured.
- Trigger rollback when impact is customer-visible, security-sensitive, or cannot be safely fixed forward.

Recovery validation:
- Previous known-good `/api/health` passes.
- `/api/ready` passes when readiness validation is enabled.
- Public landing, pricing, trust, login and protected-route redirects work.

### Data exposure suspected

Detection: cross-tenant access report, RLS failure, logs/Sentry containing avoidable PII, exposed document URL, accidental secret exposure.

Immediate actions:
- Escalate to SEV-1.
- Freeze deploys and revoke exposed credentials if applicable.
- Preserve evidence without copying raw PII/secrets into GitHub, Slack or public tools.
- Stop external evidence exports until impact is understood.
- Identify affected tenants, tables, objects and time window.
- Engage security/privacy owner before customer or regulator language is finalized.

Recovery validation:
- RLS and authorization tests pass.
- Logs and Sentry events are sanitized.
- Any exposed credential or URL is rotated or invalidated.
- Customer/regulatory decision is documented by owner.

### Security incident

Detection: auth bypass, suspicious security-event spike, malware scanner bypass, webhook signature bypass, audit-chain invalid, vulnerability report.

Immediate actions:
- Escalate to SEV-1 for credible bypass, tenant isolation, credential or malware risk.
- Do not publish exploit details in customer updates.
- Preserve logs, request IDs, Sentry issue IDs and relevant deploy/config changes.
- Disable affected high-risk feature if needed instead of weakening security controls.
- Rotate secrets when exposure is plausible.

Recovery validation:
- Relevant security gates pass.
- No new `audit_chain_invalid`, `rls_validation_failed` or bypass event after mitigation.
- Post-incident review has owner and due date.

### Failed payment wave

Detection: many failed invoices/payments, Stripe outage, webhook delay, tax/price config regression.

Immediate actions:
- Assign billing owner.
- Separate provider outage from application/webhook regression.
- Do not retry charges outside Stripe-safe retry behavior without approval.
- Pause automated customer-impacting downgrades if webhook/payment state is unreliable.
- Prepare customer support macro for billing confusion.

Recovery validation:
- Affected subscriptions reconcile with Stripe.
- Webhook replay is idempotent.
- No duplicate invoices or incorrect entitlement changes remain.

### Webhook failure

Detection: `webhook_failed` events, Stripe delivery retries, signature verification errors, raw body parsing failure.

Immediate actions:
- Confirm webhook secret reference and raw-body handling.
- Preserve event IDs and sanitized application IDs.
- Fix signature/config issues before replay.
- Replay only after idempotency is confirmed.

Recovery validation:
- Safe test event verifies.
- Failed event backlog is replayed or intentionally skipped with owner approval.
- Subscription/document/audit state is reconciled.

### Rollback emergency

Detection: incident commander determines current release is unsafe or customer impact is growing.

Immediate actions:
- Follow `docs/operations/ROLLBACK_RUNBOOK.md`.
- Configure `RELEASE_ROLLBACK_TARGET` or `LAST_KNOWN_GOOD_DEPLOYMENT_URL`.
- Configure `RELEASE_ROLLBACK_TARGET_SHA` or `LAST_KNOWN_GOOD_SHA`.
- Run `npm run release:rollback:dry-run`.
- Do not mark rollback ready unless runtime target health passes and functional validation proof is recorded.

Recovery validation:
- Rollback dry-run evidence is `Complete/passed`.
- Runtime post-rollback checks pass.
- Customer communication owner sends mitigation/closure update when required.

## Communication rules

- SEV-1: prepare external communication immediately after impact is confirmed; do not wait for full root cause.
- SEV-2: prepare targeted communication when impact is customer-visible or likely to persist.
- Never include secrets, tokens, raw cookies, customer PII, stack traces or internal exploit detail.
- Use grouped status terms: availability, login, uploads, billing, reporting, evidence exports.
- Record timestamps for first detection, first internal declaration, first external update, mitigation, rollback and resolution.

## Closure criteria

An incident can close only when:

- `/api/health` and `/api/ready` are healthy.
- Sentry error rate is back to baseline.
- affected customer flows are validated.
- security controls remain enabled.
- rollback or forward fix is documented.
- customer communication owner has sent closure update when required.
- evidence owner has attached sanitized logs, Sentry IDs and command results.
- post-incident review owner and due date are assigned.

## Required verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run security:logs
npm run release:observability-smoke
npm run release:rollback:dry-run
npm run build
```
