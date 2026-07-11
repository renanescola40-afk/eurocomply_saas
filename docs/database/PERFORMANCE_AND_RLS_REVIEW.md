# Database Performance and RLS Review

Status: mandatory review checklist and release gate. Live database verification is still required.

## Tenant isolation invariants

- Every tenant-scoped table has an immutable tenant key, normally `organization_id`, with a foreign key to the organization table.
- RLS is enabled and forced where appropriate.
- Policies derive identity from the authenticated Supabase user and verified membership; client-provided user IDs or role strings are never trusted.
- Service-role access is isolated to narrowly scoped server jobs and never exposed to the browser.
- Cross-tenant negative tests cover SELECT, INSERT, UPDATE, DELETE, RPCs and storage objects.

## Index review

Validate indexes for:

- all foreign-key columns used in joins;
- `organization_id` on tenant-scoped tables;
- common compound filters such as `(organization_id, created_at)`, `(organization_id, status)` and `(organization_id, user_id)`;
- unique membership constraints such as `(organization_id, user_id)`;
- webhook/event idempotency keys;
- audit-log time ordering and organization filters.

Indexes must be justified by measured query plans. Avoid duplicate or low-selectivity indexes that increase write cost.

## Query review

- Eliminate request-loop queries and per-row membership checks.
- Prefer bounded pagination; never return unbounded audit logs, documents or vendor lists.
- Select only required columns and avoid shipping document bodies in list views.
- Use stable ordering with a unique tie-breaker.
- Run `EXPLAIN (ANALYZE, BUFFERS)` against representative data before accepting performance claims.

## Migration safety

1. Migrations are append-only after production use.
2. Separate expand and contract phases for breaking schema changes.
3. Create large indexes concurrently where supported and operationally safe.
4. Backfill in bounded batches with resumability and monitoring.
5. Do not combine destructive DDL with application rollout unless rollback is proven.
6. Prefer forward-fix for irreversible database changes.
7. Record migration SHA, owner, preconditions, verification query and rollback/forward-fix plan.

## Backup, restore, RPO and RTO

Provider backup configuration alone is not restore proof. Enterprise Go requires a dated restore drill to an isolated environment, integrity checks, measured restore duration and owner sign-off. RPO/RTO values must be approved from measured capability, not marketing assumptions.

## Required evidence

- Live Supabase RLS validation tied to project and commit.
- Policy inventory for every tenant-scoped table and storage bucket.
- Negative tenant-isolation test output.
- Slow-query baseline and top query plans.
- Index inventory with duplicates/unused candidates reviewed.
- Last restore-drill record, measured RPO/RTO and unresolved findings.

## Release decision

Any confirmed cross-tenant read/write, disabled RLS on tenant data, public service-role exposure, or untested destructive migration is P0 and forces No-Go.
