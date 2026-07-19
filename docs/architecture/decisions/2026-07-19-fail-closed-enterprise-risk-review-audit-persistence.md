# Fail closed on enterprise risk-review audit persistence

- **Date:** 2026-07-19
- **Status:** Proposed
- **Priority:** P1 — AI governance, risk accountability, audit integrity

## Context

`POST /api/ai-systems?workflow=risk_review` creates an organization-scoped enterprise risk-review record and then emits `risk_review_started` through the durable audit writer. The route previously ignored the writer's explicit `persisted` result and returned HTTP 201 even when the audit event could not be stored.

That behavior could leave an active governance review without durable evidence identifying who initiated it and under which organization. This finding is based on repository control flow only. It does not assert a production incident, exploit, penetration test, external audit result, or customer impact.

## Decision

The workflow must require `audit.persisted === true` before returning the created review.

When persistence fails, the route attempts to delete the exact newly inserted row using:

- risk-review ID;
- organization ID;
- requesting user ID;
- creation timestamp.

The route then returns a no-store HTTP 503 response with the stable error code `risk_review_audit_unavailable`. A compensation failure is reported only with a fixed event name and sanitized provider code.

## Preserved controls

The change preserves trusted-origin validation, authenticated-user enforcement, tenant-scoped `manage_risks` authorization, bounded Zod parsing, organization-scoped AI-system validation, distributed rate limiting, no-store responses, and sanitized API error handling.

## Consequences and risks

Risk-review creation becomes temporarily unavailable when durable audit persistence is unavailable. Compensation is best effort because the insert and audit write are not one database transaction. If compensation fails, operators receive a sanitized warning and the request still fails closed; reconciliation may then be required.

The optimistic `created_at` guard reduces the chance of deleting a row that changed after creation, but it also means a concurrent mutation can prevent compensation. No schema, dependency, secret, environment, or infrastructure change is introduced.

## Validation boundary

The accompanying regression test statically verifies the audit guard, exact-row compensation scope, 503 response, and preservation of surrounding controls. Required repository CI must validate lint, typecheck, tests, build, security checks, and enterprise gates against the exact pull-request head.

No runtime validation, production deployment, audit certification, penetration testing, or live compensation success is claimed.

## Rollback

Revert the commits in the pull request. No database migration, data migration, dependency rollback, secret rotation, or infrastructure rollback is required. Existing risk-review rows are not modified by the rollback.
