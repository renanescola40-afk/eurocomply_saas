# Fail closed on AI-system reassessment audit persistence

- Status: Proposed
- Date: 2026-07-18
- Scope: `PATCH /api/ai-systems/[id]`

## Context

AI-system reassessment changes risk classification, lifecycle status, obligations, and next actions. The domain mutation and its AI-system history snapshot are already committed atomically by `reassess_ai_system_atomic`. The route previously awaited the cross-cutting `ai_system_reassessed` audit write but ignored its explicit `persisted` result, so a successful response could be returned without durable audit-chain evidence.

## Decision

A reassessment is successful only when the cross-cutting audit event reports `persisted: true`. When persistence fails, the route calls a service-role-only compensation RPC that:

1. locks the tenant-scoped AI-system row;
2. restores the previous record only if `updated_at` still equals the failed reassessment timestamp;
3. removes only the matching reassessment history snapshot for the actor and timestamp; and
4. returns a no-store HTTP 503 to the caller.

The compare-and-restore guard intentionally refuses compensation after a later concurrent edit. That case is reported with sanitized operational context and requires investigation rather than overwriting newer governance state.

## Consequences

- Positive: successful reassessments have durable domain history and cross-cutting audit accountability.
- Positive: compensation cannot overwrite a later reassessment.
- Trade-off: audit infrastructure failure makes reassessment temporarily unavailable.
- Residual risk: compensation can fail because of provider, schema, or concurrent-state changes; the route still fails closed and emits sanitized observability.

## Evidence boundaries

This change adds source-level regression coverage and a database migration. It does not claim that the migration has been applied to production, that runtime compensation has been exercised in production, or that an audit or penetration test occurred. Merge and deployment require green exact-head CI and normal migration review.

## Rollback

Revert the route, helper, test, and migration before deployment. After deployment, prefer a forward migration that drops `compensate_ai_system_reassessment_audit_failure` only after application code no longer calls it. Do not remove the existing atomic reassessment RPC or weaken current authentication, RBAC, origin, rate-limit, tenant, or optimistic-concurrency controls.
