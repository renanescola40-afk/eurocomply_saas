# Compliance-alert pre-authentication rate limit

Date: 2026-07-14
Status: Proposed
Priority: P1

## Context

`/api/internal/compliance-alerts` is an internal cron-compatible endpoint. After authorization it creates privileged Supabase clients, reads document and vendor records across organizations, resolves owner email addresses, sends transactional email, and records notification completion.

The route previously entered internal-cron credential validation without the repository's distributed pre-authentication throttle. The daily-maintenance orchestrator has its own boundary, but the compliance-alert route remains directly callable and therefore requires an independent control.

Repository inspection establishes this source-level control-flow gap only. It does not establish exploitation, production impact, delivery failures, an audit, a penetration test, or compliance certification.

## Decision

Apply `enforceInternalAuthenticationRateLimit` before `isAuthorizedInternalCronRequest` using:

- route: `/api/internal/compliance-alerts`
- action: `authenticate_compliance_alerts`
- policy and limits: the existing shared internal-auth defaults
- failure mode: the helper's existing `fail-closed` behavior

A limiter denial returns before credential validation, admin-client creation, database reads, recipient lookup, email delivery, or completion writes.

## Impact

Repeated authentication attempts against this privileged route are bounded by the existing distributed control. Authorized alert selection, templates, idempotency, deduplication, partial-failure reporting, response structure, and GET compatibility are unchanged.

No database schema, migration, dependency, secret, provider configuration, stored data, cron schedule, or infrastructure resource changes.

## Risks and limitations

The fail-closed policy can temporarily block legitimate alert execution when the distributed limiter is unavailable. This availability trade-off is intentional for a privileged state-changing endpoint.

Rate limiting does not replace strong credential rotation, network restrictions, monitoring, idempotency, or incident response. Direct runtime behavior remains subject to deployment configuration and must be validated by repository CI and operational checks.

## Validation

A focused source-contract regression test verifies that the shared limiter is configured for the route and executes before credential validation and privileged alert work.

GitHub Actions remains the authority for lint, typecheck, tests, build, and security checks. No green-CI or production-runtime claim is made in this decision record.

## Rollback

Revert the route, test, and this decision record. No data, schema, credential, provider, cron, or infrastructure rollback is required.
