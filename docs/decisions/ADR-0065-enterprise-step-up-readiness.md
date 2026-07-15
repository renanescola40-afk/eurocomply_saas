# ADR-0065: Require dedicated step-up configuration for enterprise readiness

- Status: Proposed
- Date: 2026-07-15
- Scope: `GET /api/ready` and enterprise step-up configuration

## Context

The protected readiness endpoint already required enterprise-only malware-scanning and Sentry release-upload configuration, but it did not include step-up authentication in the final readiness decision.

Critical operations such as billing administration, team management, GDPR deletion, audit-chain verification/export, data export, and security-setting changes use step-up tokens. The step-up runtime fails closed when its enterprise provider configuration is unavailable, so an enterprise deployment could return HTTP 200 from `/api/ready` while those critical operations remained blocked.

The step-up helper also retains `AUDIT_CHAIN_SIGNING_SECRET` as a backwards-compatible fallback when resolving a signing secret. That compatibility behavior must not allow enterprise readiness to treat the audit-chain integrity key as a dedicated authorization-token key.

This finding is based only on repository source and tests. It does not prove a production misconfiguration, outage, customer impact, provider behavior, external audit, or penetration test.

## Decision

Add an enterprise step-up readiness check that:

- is informational and non-blocking outside the enterprise release profile;
- requires the existing step-up runtime configuration to be valid for enterprise releases;
- separately requires a non-blank `STEP_UP_SIGNING_SECRET` for enterprise releases;
- does not accept `AUDIT_CHAIN_SIGNING_SECRET` alone as sufficient readiness evidence;
- contributes to the final `/api/ready` HTTP 200/503 decision;
- exposes only booleans and never returns secret names, secret values, provider policy values, tokens, or credentials.

The existing step-up token format, provider verification, replay protection, token persistence, expiry, RBAC, tenant scope, rate limiting, readiness authentication, and `no-store` behavior remain unchanged.

## Impact

Enterprise `/api/ready` now returns HTTP 503 when step-up provider/runtime configuration is incomplete or when a dedicated step-up signing secret is absent or blank.

Public and non-enterprise readiness behavior is unchanged. No database migration, RLS policy, RBAC rule, entitlement, dependency, provider account, secret value, token schema, or public route is added or changed.

## Risks and trade-offs

- An enterprise deployment that previously relied on the audit-chain signing key fallback will become not-ready until `STEP_UP_SIGNING_SECRET` is configured.
- Configuration presence does not prove that MFA or identity-provider verification succeeds against the production provider.
- The readiness response reports boolean configuration state only; it intentionally does not reveal which environment variable or provider-policy value is missing.
- Existing backwards-compatible secret resolution remains available outside this readiness decision. Removing that fallback is a separate migration and rotation decision.
- Repository tests do not prove production deployment health, provider availability, audit delivery, or successful step-up execution.

## Tests and evidence

Focused tests cover:

- non-enterprise readiness remaining ready without requiring the enterprise step-up control;
- enterprise readiness failing when only the audit-chain signing secret can satisfy the legacy runtime fallback;
- enterprise readiness passing with a dedicated non-blank step-up signing secret and supported provider mode;
- readiness response redaction of secret names and values;
- preservation of existing storage-scanner and dependency readiness behavior.

GitHub Actions is authoritative for lint, typecheck, unit tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks on the exact pull-request head. No runtime evidence file is created or modified by this change.

## Rollback

Revert the route, test, and ADR commits. Enterprise readiness will stop checking step-up configuration and dedicated key separation. No schema rollback, data migration, credential rotation, provider action, or customer-data repair is required.
