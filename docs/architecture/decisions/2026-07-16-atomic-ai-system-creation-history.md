# ADR: Persist AI-system creation and history atomically

- Date: 2026-07-16
- Status: Proposed
- Priority: P1 AI-governance integrity

## Context

The AI inventory creation path inserted `ai_systems` first and then attempted to insert the corresponding `ai_system_history` record in a separate best-effort operation. The helper returned silently when the admin client was unavailable and only logged a warning for most history-write failures.

That ordering allowed a successful inventory record to exist without its creation snapshot. The repository already treats reassessment history as integrity-relevant and persists reassessment plus history in one PostgreSQL transaction. Creation should provide the same invariant.

This finding is based on static repository inspection. It does not claim that production history is missing, that a customer was affected, or that an external audit identified the issue.

## Decision

Add a backend-only `security definer` function, `public.create_ai_system_atomic`, that:

1. validates required identifiers and the JSON payload shape;
2. inserts the tenant-scoped AI-system record;
3. inserts its `created` history snapshot;
4. returns the created row only after both writes succeed.

Revoke execution from `public`, `anon`, and `authenticated`, and grant it only to `service_role`. The existing API route remains responsible for authentication, organization resolution, RBAC, trusted-origin enforcement, rate limiting, schema validation, and classification before calling the query layer.

The query layer now calls the RPC and fails closed on database errors, malformed results, or rejected input. The previous post-insert best-effort history helper is removed.

## Consequences

### Positive

- A successful create response cannot be produced without the corresponding creation-history snapshot.
- A history insert failure rolls back the AI-system insert in the same PostgreSQL transaction.
- Direct browser clients cannot invoke the privileged RPC.
- Existing route-level authorization and validation controls remain unchanged.

### Risks and mitigations

- **Migration not applied:** creation fails closed rather than falling back to non-atomic writes. Release procedures must apply migrations before deploying the application commit.
- **Payload contract drift:** the RPC validates required JSON types, and repository contract tests bind the TypeScript call to the SQL function.
- **Security-definer exposure:** execution is restricted to `service_role`, and the function pins `search_path` to `public, pg_temp`.

## Evidence boundary

This change supplies repository implementation and regression contracts only. It does not prove that the migration has been applied to production, that live creation succeeds, or that historical records are complete. No runtime evidence file is changed or marked passed.

## Validation

Required checks include the targeted Vitest contract, TypeScript, lint, migration/security gates, and the repository's exact-head GitHub Actions suite.

## Rollback

Revert the application commit and migration before production promotion. If the migration has already been applied, deploy a follow-up migration that revokes and drops `public.create_ai_system_atomic(uuid, uuid, jsonb)` only after the application no longer calls it. Existing AI-system and history rows are not modified by rollback.
