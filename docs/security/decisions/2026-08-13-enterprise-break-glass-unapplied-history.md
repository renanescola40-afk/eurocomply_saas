# Enterprise Break-Glass historical migration replacement boundary

- Date: 2026-08-13
- Historical file: `supabase/migrations/20260727160000_enterprise_break_glass_governance.sql`
- Forward reconciliation: `supabase/migrations/20260813234000_reconcile_enterprise_break_glass_governance.sql`
- Production history action: none
- Production write authorized by this document: no

## Observed state

Read-only production verification on 2026-08-13 established that:

- migration version `20260727160000` is absent from `supabase_migrations.schema_migrations`;
- `public.enterprise_break_glass_requests` is absent;
- `public.enterprise_break_glass_approvals` is absent;
- `public.enterprise_break_glass_events` is absent;
- `public.enterprise_break_glass_reviews` is absent;
- `public.organization_members` has a primary key on `id`, a unique `(organization_id,user_id)` constraint, and no unique `(organization_id,id)` key.

## Replay failure

The historical migration cannot replay as written. Its first tenant-safe composite foreign key targets:

`public.organization_members(organization_id, id)`

but that column pair is not a unique/primary key in the prerequisite schema. The same migration also creates child foreign keys targeting:

`public.enterprise_break_glass_requests(organization_id, id)`

without first creating a unique constraint for that referenced pair.

PostgreSQL correctly rejects the migration with:

`there is no unique constraint matching given keys for referenced table "organization_members"`

The disposable replay must not invent a prerequisite key solely to make the historical bytes execute, because production never applied those historical bytes and doing so would misrepresent migration-history fidelity.

## Decision

Treat `20260727160000_enterprise_break_glass_governance.sql` as an **unapplied historical schema-effect source** for disposable replay purposes only.

Its intended runtime schema is reconciled under a new forward-only execution identity:

`20260813234000_reconcile_enterprise_break_glass_governance.sql`

The reconciliation:

- creates the explicit tenant composite key required on `organization_members`;
- creates the explicit `(organization_id,id)` unique request key required by child tenant foreign keys;
- materializes the four backend-only Break-Glass tables;
- recreates tenant-safe composite foreign keys;
- preserves the 15–240 minute access bound, two-approval default, duplicate-open-target prevention, review lifecycle and event hashing storage contract;
- enables and forces RLS on all Break-Glass tables;
- denies browser table access and grants the service role backend path;
- hardens the expiry function with fixed `pg_catalog` search path and service-role-only execution;
- contains a fail-closed verification block.

## Disposable replay boundary

`run-ephemeral-project-schema-replay.mjs` may temporarily remove the historical file from the disposable migration tree while leaving the forward reconciliation file present for normal timestamp-ordered execution.

The historical repository bytes must be restored byte-for-byte after the disposable replay.

The replay must continue to export:

`RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false`

because this is schema-effect recovery evidence, not migration-history repair evidence.

## What this does not authorize

This decision does **not** authorize:

- modifying or deleting the historical migration in Git history;
- inserting `20260727160000` into the production migration ledger;
- `supabase migration repair`;
- unrestricted `supabase db push --include-all`;
- direct production SQL;
- production deployment of the forward migration without the normal exact-SHA rehearsal, dry-run, protected approval and execution boundaries.
