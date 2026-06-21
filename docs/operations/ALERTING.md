# Alerting Runbook

## Scope

This runbook defines production alerting for EuroComply observability, security controls, customer-impacting dependencies and release readiness. Alerts must be actionable, owner-routed and safe to share internally without secrets, raw cookies, bearer tokens, customer PII or full request payloads.

## Alert quality rules

Every production alert must have:

- an owner or on-call rotation;
- a severity mapping;
- a user-impact statement;
- a first diagnostic query or dashboard link;
- a rollback or mitigation decision point;
- a customer-communication trigger for SEV-1 and SEV-2;
- evidence capture instructions.

Alerts that do not have an owner are treated as release blockers.

## Standardized security events

The application logger emits standardized events through `src/server/observability/logger.ts`.

| Event | Default severity | Page? | Notes |
| --- | --- | --- | --- |
| `security_denied` | SEV-3 | No | Unexpected auth/security denial spike. Page if associated with customer outage. |
| `rbac_denied` | SEV-3 | No | Page only if legitimate users are blocked after release. |
| `origin_denied` | SEV-3 | No | Watch for CSRF/origin attack or bad deployment config. |
| `rate_limit_blocked` | SEV-3 | No | Page if sustained and customer-impacting. |
| `step_up_failed` | SEV-2 | Yes when elevated | Sensitive action cannot complete or provider fails. |
| `webhook_failed` | SEV-2 | Yes | Billing/webhook failures can affect subscriptions and trust. |
| `upload_blocked` | SEV-3 | No | Page if clean enterprise uploads are blocked or scanner unavailable. |
| `rls_validation_failed` | SEV-1 | Yes | Tenant isolation failure or live RLS validation failure. |
| `audit_chain_invalid` | SEV-1 | Yes | Evidence integrity failure; preserve logs immediately. |

## Core production alerts

### Availability

| Signal | Threshold | Severity | Action |
| --- | --- | --- | --- |
| `/api/health` fails from external probe | 2 consecutive failures over 2 minutes | SEV-1 | Start incident, verify deploy/platform status, check `/api/ready`. |
| `/api/ready` returns 401 to monitor | Any occurrence | SEV-2 | Verify monitor secret, rotation, and `HEALTHCHECK_TOKEN`. |
| `/api/ready` returns 503 | 2 consecutive failures over 2 minutes | SEV-1/SEV-2 | Inspect dependency check: Supabase, Stripe config, Redis config, Sentry config. |

### Error rate

| Signal | Threshold | Severity | Action |
| --- | --- | --- | --- |
| Sentry unhandled server errors | > 1% requests or 20 events / 5 min | SEV-2 | Assign incident owner, inspect release correlation, capture event IDs. |
| Sentry edge/runtime errors | Any sustained spike after deploy | SEV-2 | Inspect middleware/proxy/origin guards. |
| Client errors on paid flows | > 5 events / 10 min | SEV-2 | Check billing, auth session and browser compatibility. |

### Security and tenant isolation

| Signal | Threshold | Severity | Action |
| --- | --- | --- | --- |
| `rls_validation_failed` | Any production event | SEV-1 | Freeze release, preserve Supabase evidence, run live isolation validator. |
| `audit_chain_invalid` | Any production event | SEV-1 | Stop evidence exports, preserve database/logs, assign evidence owner. |
| `webhook_failed` | 3 consecutive failures or Stripe retry storm | SEV-2 | Check Stripe signature, endpoint secret, raw body handling and idempotency. |
| `step_up_failed` | Spike or provider unavailable | SEV-2 | Disable only non-critical operations if safe; do not bypass protected actions. |
| `upload_blocked` with scanner unavailable | > 3 enterprise upload blocks / 10 min | SEV-2 | Verify scanner provider, fail-closed behavior and customer comms. |

## Readiness probes

- `/api/health` is public and simple. It must not test dependencies or reveal configuration.
- `/api/ready` is protected by `HEALTHCHECK_TOKEN`. Probes must send `Authorization: Bearer <token>`.
- Readiness response exposes grouped configuration counts only; it must not list secret variable names or values.

## Routing

| Area | Primary owner | Backup owner |
| --- | --- | --- |
| Incident command | Named release incident owner | Engineering lead |
| Rollback | Named rollback owner | Platform owner |
| Customer communication | Support/comms owner | Founder/GM |
| Supabase/RLS | Database owner | Security owner |
| Stripe/billing | Billing owner | Incident commander |
| Evidence/Sentry/logs | SRE owner | Security owner |

Release is **No-Go** unless the incident owner and rollback owner are named in the release approval record.

## Evidence to capture

For every SEV-1/SEV-2 alert:

1. Incident start time and detection source.
2. Sentry issue/event IDs, sanitized only.
3. Readiness response status and grouped check names.
4. Deployment SHA, release owner and rollback target.
5. Customer-impact summary.
6. Mitigation/rollback decision and timestamp.
7. Customer communication timestamps.
8. Closure criteria and post-incident review owner.

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run security:logs
npm run build
```
