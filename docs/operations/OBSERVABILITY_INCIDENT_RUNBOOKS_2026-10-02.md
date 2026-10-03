# RISCK COMPLY — Observability and Incident Runbooks

Version: 1.0  
Status date: 2026-10-02  
Baseline: `main@82715c36e9d6e9e96205f52eb0d4f61f52349f22`  
Mode: read-only verification + documentation closure

## Observability architecture

Observed evidence sources:
- Vercel runtime logs and grouped runtime error clusters.
- Sentry-tagged application errors visible through Vercel runtime evidence.
- Supabase unified logs including `edge_logs`, `postgres_logs`, `auth_logs`, `storage_logs`, `pgbouncer_logs`, `auth_audit_logs`, `postgrest_logs`, `supavisor_logs`, and `realtime_logs` within the inspected window.
- Stripe provider event/webhook visibility is part of the billing provider boundary; no mutation was performed in this lane.
- Application-generated request IDs are present in observability smoke evidence, with some historical errors reporting `req_unavailable`.

No claim is made that all signals have paging alerts, 24/7 staffing, contractual response times, or infinite retention.

## Event-source matrix

| Signal | Source | Status | Primary use |
| --- | --- | --- | --- |
| Application runtime errors | Vercel runtime | OBSERVED | Diagnose API/server failures |
| Error tracking | Application/Sentry integration evidence | OBSERVED | Aggregate/report application failures |
| Request IDs | Application logs | OBSERVED/PARTIAL | Correlate request-level incidents where present |
| Database logs | Supabase `postgres_logs` | OBSERVED | DB failures and diagnostics |
| Auth logs | Supabase `auth_logs` | OBSERVED | Authentication failures |
| Auth audit logs | Supabase `auth_audit_logs` | OBSERVED | Authentication audit evidence |
| Storage logs | Supabase `storage_logs` | OBSERVED | File/object operations and failures |
| Edge/API logs | Supabase `edge_logs` / Vercel | OBSERVED | Request/provider visibility |
| Realtime logs | Supabase `realtime_logs` | OBSERVED | Realtime service failures |
| Billing/webhook failures | App runtime + Stripe provider boundary | OBSERVED at app runtime | Billing incident diagnosis |
| Health/readiness | Application readiness/health surfaces where deployed | DOCUMENTED/OBSERVED historically | Service availability checks |

## Logging policy

1. Log operationally useful event metadata, route, provider, error class/code, timestamp, request/correlation ID where available, and non-sensitive tenant-safe context.
2. Never intentionally log passwords, authentication tokens, session cookies, API secret keys, webhook signing secrets, raw card/payment credentials, or full sensitive document contents.
3. Avoid logging personal/customer data unless necessary for an authorized incident investigation; prefer identifiers and redacted metadata.
4. Security and billing logs must support evidence preservation without weakening tenant boundaries.
5. Log access remains restricted to authorized operators/provider accounts.
6. Retention claims are provider/configuration dependent; where exact account retention was not verified, classify it as `EXTERNAL_DEPENDENCY/FACT_REQUIRED` rather than inventing a period.

## Log-retention matrix

| Source | Exact configured retention verified? | Documentation status |
| --- | --- | --- |
| Vercel runtime logs | NO in this lane | FACT_REQUIRED / provider-account dependent |
| Sentry | NO in this lane | FACT_REQUIRED / provider-plan dependent |
| Supabase logs | NO exact retention value verified in this lane | FACT_REQUIRED / provider-plan dependent |
| Stripe event history | NO exact retention value verified in this lane | FACT_REQUIRED / provider dependent |
| Application audit tables | Schema/data retention not changed in this lane | Existing product/data-retention policy applies |

## Alerting matrix

| Condition | Desired severity | Current evidence | Required response |
| --- | --- | --- | --- |
| Cross-tenant/auth bypass indication | P0 | Detection sources exist; paging configuration not proven | Immediate owner escalation, containment, evidence preservation |
| Sustained 5xx/core API outage | P0/P1 | Vercel runtime visibility exists | Triage deployment/provider failure |
| Database unavailable/corrupt | P0 | Supabase logs/status available | Freeze risky changes, provider escalation, recovery assessment |
| Auth widespread failure | P1 | Auth/auth-audit logs available | Validate provider/app boundary, communicate impact |
| Repeated webhook processing failure | P1 | Runtime evidence observed | Preserve Stripe event IDs/logs, reconcile without duplicate effects |
| Payment failure for individual customer | P2 | Provider/app billing visibility | Customer/account-specific reconciliation |
| Storage outage | P1/P2 | Storage logs available | Determine read/write/customer-file impact |
| Monitoring pipeline unavailable | P2 | Multiple provider log sources exist | Use alternate provider logs; restore monitoring |

Automated alert delivery configuration is not claimed proven where account evidence was not read in this lane.

## Severity definitions

- **P0 Critical:** confirmed/credible active compromise, cross-tenant exposure, authentication bypass, destructive data integrity event, or broad service outage with severe customer impact.
- **P1 High:** material production degradation, widespread auth/database/billing/storage failure, or high-risk security incident without confirmed catastrophic impact.
- **P2 Medium:** limited customer impact, isolated provider/integration failure, degraded non-core capability, or contained security weakness.
- **P3 Low:** informational defect, documentation issue, cosmetic/non-critical incident, or hardening item.

## Customer impact classification

- `NONE`: no verified customer impact.
- `POTENTIAL`: impact plausible but not confirmed.
- `LIMITED`: isolated tenant/account/workflow affected.
- `MATERIAL`: multiple customers, critical workflow, security/privacy or financial impact.
- `WIDESPREAD`: broad service/customer impact.

Use verified evidence only. Do not notify customers with speculative technical conclusions.

## Escalation procedure

1. Incident detector records timestamp, service, evidence and preliminary severity.
2. RISCK COMPLY owner is current final operational authority.
3. P0/P1 incidents require immediate owner escalation when detected.
4. Provider escalation is initiated through the relevant authorized account/support channel as needed.
5. Legal/privacy notification assessment is separate from technical severity and must be based on verified impact and applicable obligations.
6. No email communication may be sent from this workflow without explicit owner approval for that specific message.

## Health-check runbook

1. Check public production availability and documented health/readiness endpoints.
2. Check latest production deployment and runtime error clusters.
3. Check Supabase project health and relevant log sources.
4. Check provider-specific failures (Stripe, auth, storage) if the health/readiness signal indicates them.
5. Record timestamp, exact deployment SHA, status, and evidence links.
6. Escalate on sustained or material degradation.

## Application failure runbook

- Identify failing route/component and first/last seen time.
- Correlate request ID, deployment ID and exact Git SHA.
- Determine whether failure is code, configuration, dependency or provider related.
- Preserve logs before any rollback/fix.
- If remediation would alter the MaaSec pentest candidate, report and defer to a separately authorized post-pentest/change lane.

## Auth failure runbook

- Inspect Supabase `auth_logs` and `auth_audit_logs` for scope and error type.
- Distinguish user-specific credential issues from systemic provider/session failures.
- Do not log credentials/tokens.
- Validate tenant authorization separately from authentication success.
- Escalate P0 for any credible auth bypass/cross-tenant effect.

## Database incident runbook

- Confirm Supabase project status and inspect `postgres_logs`, connection/pool logs and API symptoms.
- Classify availability vs integrity/corruption issue.
- Stop unsafe operational actions where possible.
- Preserve evidence and assess restore requirement.
- Destructive restore requires separate explicit owner authorization.

## Stripe incident runbook

- Identify webhook/request/event correlation evidence without exposing secrets or raw payment data.
- Distinguish provider failure, application processing failure, configuration failure and replay/idempotency issues.
- Preserve Stripe event IDs and application error context.
- Avoid manually duplicating entitlement/subscription state.
- Reconcile state only in an authorized change lane.

## Webhook incident runbook

- Verify endpoint availability and signature-verification path evidence.
- Identify failed/retried event IDs.
- Confirm idempotency/replay behavior before reprocessing.
- Do not expose webhook secret.
- Treat repeated processing failures affecting entitlement/payment state as P1 until bounded.

## Third-party provider incident runbook

- Confirm provider status and internal symptoms.
- Identify blast radius and fallback signals.
- Avoid unsafe local bypasses of security controls.
- Preserve provider incident references and timestamps.
- Update customers/status page only with verified impact and owner-approved communications.

## Security incident runbook

1. Intake and record evidence.
2. Assign severity and customer impact classification.
3. Contain exposure without destroying forensic evidence.
4. Preserve Vercel/Supabase/app/provider logs.
5. Identify affected tenants/data categories and time window.
6. Validate remediation in a safe authorized lane.
7. Assess legal/regulatory/customer notification duties.
8. Complete post-incident review and corrective actions.

## Incident evidence checklist

- Incident ID
- Detection time / source
- Severity and impact class
- Exact production deployment ID and Git SHA
- Affected services/routes/tenants
- Request/correlation IDs where available
- Vercel runtime/build evidence
- Supabase relevant log evidence
- Stripe event references where relevant
- Sentry/error-tracking references where relevant
- Timeline
- Containment actions
- Recovery actions
- Customer impact determination
- Notification decision/approvals
- Root cause
- Corrective actions / owners / due dates

## Customer communication procedure

Draft communications must state only verified facts: affected service, customer impact, start time if known, current containment/recovery state, and next update commitment if actually supportable. Do not disclose exploit details, secrets, other customers, internal security architecture beyond approved scope, or speculate on root cause. Email sending requires explicit owner approval per message.

## Internal incident log template

```
INCIDENT_ID=
OPENED_AT=
SEVERITY=
IMPACT_CLASS=
DETECTION_SOURCE=
PRODUCTION_DEPLOYMENT=
GIT_SHA=
SERVICES_AFFECTED=
TENANTS_AFFECTED=
DATA_CATEGORIES=
TIMELINE=
EVIDENCE_LINKS=
CONTAINMENT=
RECOVERY=
CUSTOMER_NOTIFICATION_REQUIRED=
LEGAL_REVIEW_REQUIRED=
OWNER=
STATUS=
```

## Post-incident review template

```
INCIDENT_ID=
SUMMARY=
CUSTOMER_IMPACT=
ROOT_CAUSE=
CONTRIBUTING_FACTORS=
DETECTION_GAPS=
TIMELINE=
WHAT_WORKED=
WHAT_FAILED=
CORRECTIVE_ACTIONS=
OWNERS=
DUE_DATES=
RTO_ACTUAL=
RPO_ACTUAL=
EVIDENCE=
FINAL_APPROVAL=
```

## Current evidence boundary

- Vercel grouped runtime errors are observable and have included Sentry-tagged errors and request IDs.
- Supabase operational/auth/storage/database log sources are observable.
- Exact alert routing, paging, staffing and provider log-retention periods are not all proven.
- This document does not convert historical runtime errors into open current defects without separate current reproduction/verification.
- No logging/monitoring/alert configuration was changed.