# Fail closed when Enterprise Readiness export auditing is unavailable

- Status: Proposed
- Date: 2026-07-17
- Scope: `GET /api/enterprise-readiness/export`
- Priority: P1 audit integrity / governance evidence integrity

## Context

The Enterprise Readiness export produces an integrity-hashed, organization-scoped evidence artifact after authentication, explicit export permission, plan enforcement, step-up verification, and rate limiting.

Before this decision, the route attempted to persist `enterprise_readiness.exported`, but treated audit persistence as non-blocking. It still returned the downloadable JSON artifact when the audit writer returned `persisted: false` or threw. The artifact itself disclosed that the audit had not persisted.

That behavior created a false-success condition: a governance evidence export could leave the system without durable accountability evidence while the client still received a successful download.

## Decision

The route must fail closed before returning the artifact unless `createAuditEvent` confirms `persisted: true`.

When persistence is unavailable, the route:

1. reports sanitized operational context;
2. returns a no-store `503` response with `enterprise_readiness_export_audit_unavailable` when the writer returns `persisted: false`;
3. returns the existing sanitized failure response if the writer throws;
4. does not construct or return a downloadable export representing an unaudited operation.

A successful artifact now has the invariant `audit.attempted === true` and `audit.persisted === true`.

## Impact

- Prevents unaudited Enterprise Readiness evidence exports.
- Aligns this export with the repository's fail-closed handling for other sensitive report and governance exports.
- Preserves existing authentication, organization isolation, permission, entitlement, step-up, rate-limit, integrity-hash, and no-store controls.
- Intentionally reduces export availability during audit-store or privileged-database failures.

## Risks

- Customers cannot download the artifact while durable audit persistence is unavailable.
- The generic catch path returns `500` when the audit writer throws, while an explicit non-persistence result returns `503`. This preserves the route's existing exception boundary and avoids broad error-contract changes in this narrow patch.
- Static regression tests verify control ordering and response contracts, not live Supabase persistence.

## Evidence boundaries

This decision and its test are repository evidence only. They do not claim that production audit storage, database connectivity, runtime configuration, or external controls have been validated. Runtime assurance still depends on green exact-head CI and production evidence gathered by the established release process.

## Rollback

Revert the commits in this pull request. No database migration, dependency change, secret change, or data backfill is required.

## Merge conditions

- All required exact-head CI, security, lint, typecheck, test, build, dependency, secret-scanning, and release gates are green.
- Human review confirms the intentional availability trade-off.
- No supported client depends on receiving an artifact whose audit metadata reports `persisted: false`.
