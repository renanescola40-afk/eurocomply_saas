# Fail closed when AI-system creation audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Priority: P1 AI-governance accountability

## Context

`POST /api/ai-systems` creates an organization-scoped AI-system inventory record and an atomic creation-history snapshot. After that transaction, the route writes the cross-cutting `ai_system_created` audit event.

The audit writer returns an explicit `persisted` result. The route previously ignored that result and returned the created system even when durable audit persistence was unavailable. This permitted an AI-governance inventory mutation to become visible without the accountability record expected by audit, incident-response, and governance workflows.

No production occurrence, customer impact, external audit finding, penetration test, or certification result is claimed.

## Decision

A successful AI-system creation response requires `createAuditEvent` to report `persisted: true`.

When persistence fails, the route attempts a compensating deletion scoped by:

- AI-system ID;
- organization ID;
- creator user ID;
- exact creation timestamp.

The existing `ai_system_history.ai_system_id` foreign key uses `ON DELETE CASCADE`, so successful compensation also removes the atomic creation-history row. The route returns a no-store HTTP 503 response and never returns the created system.

Compensation failure is reported with a fixed message and provider error code only. No payload, system name, use case, classification details, personal data, secrets, or tenant content is logged.

## Consequences

- AI-system creation becomes temporarily unavailable during audit-persistence outages.
- Callers may safely retry after receiving `ai_system_creation_audit_unavailable`.
- Compensation remains best effort rather than a single database transaction spanning the domain write and application audit chain.
- A cleanup failure can leave the record present; sanitized observability provides an investigation signal.
- Authentication, trusted-origin enforcement, tenant resolution, RBAC, bounded validation, distributed rate limiting, classification, and atomic domain-history creation are unchanged.

## Evidence boundary

This change provides repository-level source and regression-test evidence only. It does not prove production deployment, production audit availability, compensation success in a live database, regulatory compliance, external assurance, or operational effectiveness.

## Rollback

Revert the route guard, compensation block, regression test, and this decision record together. Rollback restores the prior availability behavior but also restores the known accountability gap, so it must not be treated as a security-neutral change.
