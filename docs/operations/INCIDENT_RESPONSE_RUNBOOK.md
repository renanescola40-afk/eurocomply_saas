# Incident Response Runbook

## Purpose

This runbook tells the SRE/incident commander how to detect, triage, mitigate, communicate and close RISCK COMPLY production incidents. It applies to production, enterprise pilots and any environment handling customer data, billing, trust evidence, uploads, audit logs or compliance evidence.

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
| Support owner | Owns inbound support triage and customer impact grouping. |
| Security/privacy owner | Required for RLS, audit-chain, upload, auth or suspected data exposure incidents. |
| Billing owner | Required for Stripe, payment, subscription or invoice incidents. |

Release is **No-Go** if the release approval record does not name incident, rollback, support and customer communication owners or if the escalation path is absent.

## Detection sources

Start this runbook when any of these fire:

- `/api/health` fails from external monitoring.
- `/api/ready` returns unauthorized to a configured monitor or 503 for dependency readiness.
- `/api/observability/smoke` cannot reject anonymous calls or emit a protected smoke event when enabled.
- Sentry error rate crosses alert thresholds or a new release has a critical issue.
- Standardized security events spike or indicate failure: `rls_validation_failed`, `audit_chain_invalid`, `webhook_failed`, `step_up_failed`, `upload_blocked`, `security_denied`.
- Customer support reports login, billing, upload, dashboard, export or evidence-pack failures.
- CI/release gates fail after deployment.
- Provider status alerts from Vercel, Supabase, Stripe, auth provider, Sentry, Redis/Upstash, PostHog/analytics or upload scanner.

## First 15 minutes

1. Assign incident commander, technical lead, rollback owner, evidence owner, support owner and customer communication owner.
2. Declare severity and affected customer surface.
3. Freeze non-essential deployments until the incident commander clears them.
4. Capture current deployment SHA, build SHA, previous known-good deployment and release evidence path.
5. Check `/api/health` publicly.
6. Check protected `/api/ready` with the healthcheck bearer token.
7. Check Sentry for new issues correlated to the deploy SHA.
8. Check provider status pages and recent deploy/config changes.
9. Identify whether this is availability, dependency config, tenant isolation, billing, upload, auth, analytics/consent, observability, Redis/rate-limit or audit-chain.
10. Start a timestamped decision log.
11. Assign customer/support impact owner and prepare a holding statement if SEV-1 or customer-visible SEV-2.
12. Decide whether rollback criteria are met.

## Scenario runbooks

Each scenario below follows the required structure: severity, detection, impact, first 15 minutes, mitigation, internal communication, customer communication, owner, escalation path, rollback decision, evidence to collect and post-incident work.

### Supabase down or degraded

- Severity: SEV-1 if tenant isolation, writes or audit-chain integrity are uncertain; otherwise SEV-2 for dashboard/data outage.
- Detection: `/api/ready` database check fails, Supabase status alert, elevated query errors or Sentry `ready_supabase_check`.
- Impact: login/session-adjacent flows, dashboard, documents, evidence exports, audit logs and tenant data access may be degraded.
- First 15 minutes: check Supabase status, check recent migrations, run protected readiness, verify whether public pages still load, preserve failed query metadata.
- Mitigation: do not disable RLS; fail closed for tenant-sensitive actions; pause exports/uploads if isolation is uncertain; prefer read-only/maintenance messaging over unsafe writes.
- Internal communication: incident channel update every 15 minutes for SEV-1 and every 30 minutes for SEV-2.
- Customer communication: send availability/degraded dashboard update when customer-visible; avoid SQL, table names containing customer data or raw errors.
- Owner: incident commander + security/privacy owner + database owner.
- Escalation path: Support owner -> Incident owner -> Security owner -> Release owner.
- Rollback decision: rollback app only if deploy-correlated and compatible with schema; otherwise forward-fix or provider recovery.
- Evidence to collect: readiness output, Supabase status, sanitized query errors, migration IDs, Sentry issue IDs, request IDs.
- Post-incident: rerun live RLS validation, audit-chain validation and affected customer flow checks before closure.

### Stripe down or degraded

- Severity: SEV-2; SEV-1 if billing state is corrupted across customers or duplicate charges are possible.
- Detection: readiness Stripe check fails, Stripe status alert, checkout/billing portal failures, failed webhook processing.
- Impact: checkout, billing portal, subscription state, entitlements and invoice/payment updates.
- First 15 minutes: assign billing owner, check Stripe status, inspect recent webhook delivery failures, preserve event IDs and idempotency state.
- Mitigation: do not manually change subscription state without billing owner approval; disable or message broken paid CTAs; queue/retry safely.
- Internal communication: billing owner posts current failure mode and replay plan.
- Customer communication: use billing-degraded language; do not promise charge reversals until confirmed.
- Owner: billing owner + incident commander.
- Escalation path: Support owner -> Billing owner -> Incident owner -> Release owner.
- Rollback decision: rollback if application webhook code or price config regression is deploy-correlated; do not rotate webhook secrets without coordinated Vercel/Stripe update.
- Evidence to collect: Stripe event IDs, webhook delivery status, sanitized account IDs, readiness output, Sentry issue IDs.
- Post-incident: reconcile affected subscriptions, verify webhook idempotency and replay only after safe test event passes.

### Auth provider down or degraded

- Severity: SEV-2 for login/signup outage; SEV-1 for auth bypass, RBAC bypass or tenant isolation risk.
- Detection: login/signup failures, session verification errors, step-up unavailable, auth-provider status alert.
- Impact: users cannot access dashboard or sensitive actions; step-up may block critical workflows.
- First 15 minutes: verify existing sessions, login/signup, protected redirects and step-up controls; check provider status.
- Mitigation: do not bypass auth/RBAC/step-up; disable sensitive actions if step-up is unavailable; fail closed.
- Internal communication: security owner confirms whether this is availability or bypass risk.
- Customer communication: communicate login degradation only when confirmed; do not reveal security implementation detail.
- Owner: security owner + incident commander.
- Escalation path: Support owner -> Security owner -> Incident owner -> Release owner.
- Rollback decision: rollback if auth regression is deploy-correlated and previous known-good validates.
- Evidence to collect: request IDs, Sentry issue IDs, provider status, protected-route checks, sanitized auth errors.
- Post-incident: rerun auth/RBAC final validation and protected-route checks.

### Vercel deployment failed or bad deploy

- Severity: SEV-2 for failed deploy or customer-visible regression; SEV-1 if release creates security/data risk.
- Detection: failed deploy, build/runtime errors after deploy, public pages fail, `/api/health` fails, new Sentry release issue.
- Impact: public pages, login, dashboard, APIs and trust/compliance surfaces.
- First 15 minutes: freeze deploys, compare current SHA/build SHA with last known-good, run smoke/readiness, inspect Vercel logs.
- Mitigation: trigger rollback or disable affected feature flags; avoid repeated blind redeploys.
- Internal communication: release owner posts current/previous deployment URLs and rollback target.
- Customer communication: send degraded service or rollback-in-progress update when customer-visible.
- Owner: rollback owner + incident commander.
- Escalation path: Support owner -> Rollback owner -> Incident owner -> Release owner.
- Rollback decision: rollback when impact is customer-visible, security-sensitive or cannot be safely fixed forward quickly.
- Evidence to collect: Vercel build/deploy ID, current SHA, build SHA, Sentry release, smoke output, readiness output.
- Post-incident: attach post-rollback validation and update release approval record.

### Data exposure suspected

- Severity: SEV-1.
- Detection: cross-tenant access report, RLS failure, logs/Sentry containing avoidable PII, exposed document URL, accidental secret exposure.
- Impact: customer data confidentiality, regulatory obligations, trust center claims and enterprise evidence integrity.
- First 15 minutes: freeze deploys, assign security/privacy owner, preserve evidence without copying raw PII/secrets, stop exports/uploads if needed.
- Mitigation: revoke exposed credentials/URLs, disable affected feature, fail closed, identify affected tenants/time window.
- Internal communication: restricted incident channel only; avoid broad sharing of PII/secrets.
- Customer communication: security/privacy owner approves all language; communicate confirmed impact only.
- Owner: security/privacy owner + incident commander.
- Escalation path: Security owner -> Incident owner -> Release owner / approver.
- Rollback decision: rollback or disable feature if deploy-correlated and containment is safer than forward-fix.
- Evidence to collect: sanitized logs, request IDs, affected object references, RLS test results, credential rotation proof.
- Post-incident: rerun RLS, auth/RBAC, logs/Sentry sanitization and audit-chain validation; complete legal/privacy review.

### Security incident

- Severity: SEV-1 for credible bypass, tenant isolation, credential, malware or webhook signature risk; otherwise SEV-2.
- Detection: auth bypass, suspicious security-event spike, malware scanner bypass, webhook signature bypass, audit-chain invalid, vulnerability report.
- Impact: customer data, billing integrity, evidence integrity, upload safety and trust posture.
- First 15 minutes: assign security owner, preserve request IDs/logs, identify affected control and decide containment.
- Mitigation: disable affected high-risk feature or fail closed; rotate secrets when exposure is plausible; do not weaken controls.
- Internal communication: security owner owns technical detail; customer comms owner receives sanitized impact summary only.
- Customer communication: no exploit detail, no stack traces, no raw indicators that increase attack risk.
- Owner: security owner + incident commander.
- Escalation path: Security owner -> Incident owner -> Release owner / approver.
- Rollback decision: rollback if current release introduced the vulnerable behavior and previous known-good is safer.
- Evidence to collect: request IDs, Sentry issue IDs, security event samples, affected release SHA, mitigation proof.
- Post-incident: root cause, patch, retest, external disclosure decision and control update.

### Failed payment wave

- Severity: SEV-2; SEV-1 if duplicate charges or broad entitlement corruption are possible.
- Detection: many failed invoices/payments, Stripe outage, webhook delay, tax/price config regression.
- Impact: customer billing, access entitlements, invoices, upgrades/downgrades and support volume.
- First 15 minutes: assign billing owner, separate Stripe outage from app regression, pause customer-impacting automated downgrades if needed.
- Mitigation: use Stripe-safe retries; do not bulk retry charges manually without approval; reconcile state.
- Internal communication: billing owner posts affected count and retry/reconcile plan.
- Customer communication: billing support macro with clear “we are investigating” language.
- Owner: billing owner + support owner.
- Escalation path: Support owner -> Billing owner -> Incident owner -> Release owner.
- Rollback decision: rollback if price/webhook/entitlement code regression is deploy-correlated.
- Evidence to collect: Stripe event IDs, invoice IDs, webhook IDs, sanitized customer/account references, entitlement diffs.
- Post-incident: verify no duplicate charges, reconcile subscriptions and document customer credits if any.

### Webhook failure

- Severity: SEV-2; SEV-1 if signature verification is bypassed or billing state is corrupted.
- Detection: `webhook_failed` events, Stripe delivery retries, signature verification errors, raw body parsing failure.
- Impact: subscription status, billing events, entitlements and audit records.
- First 15 minutes: confirm webhook secret reference, raw-body handling, recent deploys and idempotency store.
- Mitigation: fix signature/config issues before replay; replay only after idempotency is confirmed.
- Internal communication: billing owner and security owner approve replay plan.
- Customer communication: send billing-update delay notice when visible.
- Owner: billing owner + security owner.
- Escalation path: Support owner -> Billing owner -> Security owner -> Incident owner.
- Rollback decision: rollback if webhook route regression is deploy-correlated.
- Evidence to collect: event IDs, delivery attempts, sanitized errors, route version/SHA, replay logs.
- Post-incident: reconcile backlog and attach replay/idempotency evidence.

### Upload scanner failure

- Severity: SEV-2; SEV-1 if unsafe uploads may have been accepted.
- Detection: upload scanner readiness failure, scanner provider alert, upload blocks spike, clean files rejected, `upload_blocked`/scanner errors.
- Impact: document upload availability and malware/content safety.
- First 15 minutes: verify scanner provider, endpoint/transport, allowed hosts, bucket config and fail-closed behavior.
- Mitigation: fail closed for unscanned uploads; pause uploads rather than accept unknown files; communicate upload degradation.
- Internal communication: security owner confirms whether any unsafe file could have been accepted.
- Customer communication: “secure document upload is temporarily unavailable/degraded” if customer-visible.
- Owner: security owner + technical lead.
- Escalation path: Support owner -> Security owner -> Incident owner -> Release owner.
- Rollback decision: rollback if upload security regression is deploy-correlated.
- Evidence to collect: scanner status, sanitized upload IDs, blocked/allowed counts, provider proof, request IDs.
- Post-incident: rerun upload scanner runtime validation and review fail-closed coverage.

### Sentry down or observability degraded

- Severity: SEV-3 normally; SEV-2 during active release/incident or when critical monitoring is blind.
- Detection: Sentry status alert, observability smoke fails, source-map upload failure, missing release events.
- Impact: reduced ability to detect/triage issues and correlate deploy SHA to errors.
- First 15 minutes: run observability smoke, verify local structured logs and request IDs, check Sentry status and DSN config.
- Mitigation: rely on provider logs/local structured logs temporarily; do not disable error handling.
- Internal communication: incident commander notes monitoring blind spot and fallback logs.
- Customer communication: usually none unless customer-facing service is impacted.
- Owner: SRE/observability owner.
- Escalation path: Incident owner -> Security owner -> Release owner.
- Rollback decision: rollback only if app code caused error-reporting regression during a release or if blind release is unsafe.
- Evidence to collect: smoke output, Sentry status, release/source-map config state, request IDs.
- Post-incident: rerun observability smoke and attach evidence.

### Redis/rate-limit down

- Severity: SEV-2 if sensitive mutations are unprotected or fail broadly; SEV-1 if rate limits fail open on abuse-sensitive endpoints.
- Detection: `/api/ready` Redis group missing/unavailable, Upstash status alert, rate-limit errors, spike in denied/allowed security events.
- Impact: API abuse protection, sensitive mutations, observability smoke rate limiting and availability.
- First 15 minutes: check Upstash status, readiness, recent env changes and rate-limit fallback mode.
- Mitigation: fail closed for abuse-sensitive internal/sensitive operations; temporarily reduce exposure if safe; do not remove origin/token guards.
- Internal communication: security owner confirms whether the system is fail-closed or fail-open.
- Customer communication: only when legitimate customer workflows are degraded.
- Owner: security owner + SRE owner.
- Escalation path: Support owner -> Security owner -> Incident owner -> Release owner.
- Rollback decision: rollback if rate-limit regression is deploy-correlated or fallback changed to unsafe mode.
- Evidence to collect: readiness output, Upstash status, request IDs, security event counts, affected routes.
- Post-incident: rerun security:origin-guards, security:no-store, security:api-guards and readiness smoke.

### Rollback emergency

- Severity: matches triggering incident; SEV-1 if customer data/security is at risk.
- Detection: incident commander determines current release is unsafe or customer impact is growing.
- Impact: current release must be reverted or disabled to restore safety/availability.
- First 15 minutes: follow `docs/operations/ROLLBACK_RUNBOOK.md`, configure previous known-good deployment/SHA, run dry-run, freeze deployments.
- Mitigation: promote previous known-good deployment, forward-fix config or disable feature flags depending on safest path.
- Internal communication: rollback owner posts exact current SHA, target SHA prefix, validation status and timeline.
- Customer communication: mitigation/rollback update when customer-visible.
- Owner: rollback owner + incident commander.
- Escalation path: Rollback owner -> Incident owner -> Release owner / approver.
- Rollback decision: mandatory when current release is unsafe and previous known-good passes dry-run; otherwise document why forward-fix is safer.
- Evidence to collect: dry-run evidence, health/readiness output, deployment IDs, Sentry release, smoke output.
- Post-incident: post-rollback validation and post-incident review.

### Post-incident review

- Severity: required for all SEV-1/SEV-2 and optional for repeated SEV-3.
- Detection: incident resolved or mitigated.
- Impact: prevents repeat failures and updates controls/evidence.
- First 15 minutes: create PIR owner and due date at closure.
- Mitigation: confirm temporary mitigations have owners/expiry.
- Internal communication: share timeline, root cause, contributing factors and action items.
- Customer communication: send closure/follow-up when customer-facing impact occurred.
- Owner: incident commander.
- Escalation path: Incident owner -> Release owner / approver.
- Rollback decision: record whether rollback happened, why, and validation result.
- Evidence to collect: timeline, customer impact, request IDs, Sentry issues, provider statuses, commands run, evidence files.
- Post-incident: update runbooks/tests/alerts and close action items with owners.

## Communication rules

- SEV-1: prepare external communication immediately after impact is confirmed; do not wait for full root cause.
- SEV-2: prepare targeted communication when impact is customer-visible or likely to persist.
- Never include secrets, tokens, raw cookies, customer PII, stack traces or internal exploit detail.
- Use grouped status terms: availability, login, uploads, billing, reporting, evidence exports.
- Record timestamps for first detection, first internal declaration, first external update, mitigation, rollback and resolution.

## Closure criteria

An incident can close only when:

- `/api/health` and `/api/ready` are healthy.
- Sentry error rate is back to baseline or fallback observability is explicitly accepted.
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
