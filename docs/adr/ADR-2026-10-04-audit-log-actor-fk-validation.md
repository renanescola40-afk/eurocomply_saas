# ADR-2026-10-04: Validate the audit log actor foreign key

## Status

Accepted for this migration.

## Context

The production `public.audit_logs` table contains the foreign key
`audit_logs_actor_user_id_fkey` from `actor_user_id` to `auth.users(id)`.
The constraint exists as `NOT VALID`, so PostgreSQL enforces it for new or
updated rows but does not yet mark the pre-existing row set as validated.

A read-only production integrity check before this change observed:

- `audit_logs` rows: 276
- non-null `actor_user_id` rows without a matching `auth.users(id)`: 0

The original PR migration used version `20261003221000`, which collided with
the existing `20261003221000_fix_team_invitation_acceptance_42702.sql`
migration. Repository replay controls correctly detected that collision as a
new duplicate migration-version group. This ADR records the corrected decision
and the migration is reissued with unique version `20261004002000`.

## Decision

Validate only the existing foreign key:

```sql
alter table public.audit_logs
  validate constraint audit_logs_actor_user_id_fkey;
```

No rows are inserted, updated, deleted, rewritten, or backfilled by this
migration. The constraint definition itself is not replaced.

## Evidence boundary

This decision relies on:

- the existing constraint already being present in production;
- the production pre-check showing 276 rows and 0 orphan actor references;
- repository migration replay and drift controls remaining green on the exact PR head.

This ADR does not claim anything about unrelated audit-log fields or other
foreign keys.

## Locking and operational risk

PostgreSQL must scan the existing rows while validating the constraint and
takes the lock required by `VALIDATE CONSTRAINT`. The table is currently
small (276 rows at the pre-check), so the expected validation window is
bounded. The migration intentionally avoids dropping/recreating the foreign
key and avoids data rewrites.

## Security and integrity impact

Validation strengthens evidence that historical `actor_user_id` values obey
the same referential-integrity rule already enforced for new writes. It does
not change RLS policies, role grants, tenant scope, or application authorization.

## Rollback

Constraint validation is metadata/integrity state rather than a customer-data
rewrite. There is no data rollback required. If deployment must be reversed,
the application can roll back independently because it does not depend on the
constraint becoming validated. Reverting the constraint to `NOT VALID`
would require replacing the constraint and would weaken integrity evidence, so
that is not an automatic rollback action and requires a separate reviewed
decision.

## Verification

After application, verify:

```sql
select convalidated
from pg_constraint
where conname = 'audit_logs_actor_user_id_fkey'
  and conrelid = 'public.audit_logs'::regclass;
```

Expected result: `true`.

Also require the repository duplicate-migration inventory, isolated schema
replay, migration drift audit, CI, and security gates to pass on the exact
head before merge.
