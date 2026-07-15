# Reject invalid security-settings payloads before mutation

Date: 2026-07-15

Status: Proposed

## Context

`POST /api/security/settings` protects organization step-up authentication configuration. The route already required authentication, `manage_settings`, trusted-mutation controls, distributed rate limiting, and step-up verification before reading a bounded JSON body.

The bounded JSON read was followed by `.catch(() => ({}))`. Malformed JSON, an oversized body, or another bounded-reader rejection was therefore converted into an empty object. The normalization layer then selected the default `supabase_mfa` provider mode and empty IdP allow-lists, after which the route could upsert those values and create a successful `security_settings_changed` audit event.

This is a repository-observed P1 security-configuration integrity gap. No production misconfiguration, exploitation, customer impact, external audit, or penetration test is claimed.

## Decision

Fail closed when the bounded JSON reader rejects:

- return HTTP 400 with the stable reason `invalid_security_settings_payload`;
- preserve `Cache-Control: no-store`;
- do not create an admin database client;
- do not upsert security settings;
- do not create a successful audit event.

Valid bounded payloads continue through the existing normalization and mutation path after all access gates pass.

## Impact

Malformed or oversized requests can no longer be interpreted as an intentional reset to default step-up settings. Valid requests retain the existing response shape, settings schema, tenant scope, audit action, and authorization requirements.

No migration, dependency, RLS, RBAC, entitlement, provider configuration, secret, or public endpoint expansion is introduced.

## Risks and limitations

- clients that previously relied on malformed JSON being silently accepted will now receive HTTP 400;
- this change does not make every individual field strict: unsupported provider modes still follow the existing normalization policy;
- repository tests do not prove production proxy limits, provider behavior, audit durability, or runtime deployment health.

## Tests and evidence

Focused route tests cover:

- malformed JSON returning HTTP 400 and `no-store`;
- no database mutation or success audit after parse failure;
- successful persistence of a valid bounded payload after the existing access gates.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, release gates, and enterprise readiness checks on the exact PR head.

No runtime evidence file is created, modified, simulated, or marked complete by this decision.

## Rollback

Revert the route, test, and this decision record. The prior behavior will again convert bounded-reader failures into an empty settings object. No schema rollback, data migration, credential rotation, provider action, or customer-data repair is required.
