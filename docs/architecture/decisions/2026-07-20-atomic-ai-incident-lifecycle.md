# Make AI incident lifecycle transitions atomic and auditable

- Status: Proposed
- Date: 2026-07-20
- Priority: P0 security, AI governance and audit integrity

## Context

AI incidents are material governance records. Updating an incident, recording its lifecycle history and appending its chained audit event in separate operations could leave partial state when a database or audit write fails. Concurrent operators could also overwrite a newer incident state without detecting the conflict.

The collection endpoint already creates incidents through an atomic database function. The detail lifecycle needed the same transactional boundary while preserving tenant isolation, workflow RBAC, trusted-origin enforcement, bounded input and distributed abuse controls.

## Decision

Add a tenant-scoped detail route and a service-role-only PostgreSQL function that:

- requires `read_ai_incidents` for detail reads and `manage_ai_incidents` for mutations;
- validates trusted origin, UUID selectors, bounded Zod input and distributed rate limits before mutation;
- uses `updated_at` as an optimistic-concurrency precondition;
- locks the incident row and permits only explicit lifecycle transitions;
- requires an authority before entering the reported state;
- rejects AI-system references outside the incident organization;
- writes the incident update, immutable history snapshot and chained audit event in one transaction;
- serializes the organization audit chain and rejects a stale previous hash;
- exposes the transition function only to `service_role`;
- returns no-store, sanitized API responses.

## Consequences

A successful lifecycle mutation now implies that the incident state, history and audit chain were committed together. Concurrent stale editors receive a conflict instead of silently overwriting state. Invalid transitions and cross-tenant AI-system links fail closed.

The new history table preserves tenant-scoped authenticated reads but has no client mutation policy. The administrative server boundary remains responsible for writes.

## Risks and trade-offs

- Audit-chain contention can require bounded retries and can temporarily reject a mutation under sustained concurrency.
- The migration is prospective and does not reconstruct historical incident transitions.
- Static repository tests do not prove migration execution, production Supabase behavior, provider availability or historical-data quality.
- Operational workflows must review the allowed transition graph and authority requirement before production rollout.

## Validation

Repository contracts verify route registration, guard ordering, tenant filters, optimistic concurrency, transition restrictions, tenant-bound AI-system validation, atomic history/audit writes and service-role-only execution. Exact-head GitHub Actions remain authoritative for lint, typecheck, tests, build, security gates and scorecard integration.

## Rollback

Before deployment, revert the route, query module, migration, tests and this ADR together. After migration application, use a reviewed forward migration to remove the transition function and history policies/table only after confirming no retained evidence obligation depends on them. Rolling back the atomic path reopens partial-write and stale-update risk and requires explicit security acceptance.
