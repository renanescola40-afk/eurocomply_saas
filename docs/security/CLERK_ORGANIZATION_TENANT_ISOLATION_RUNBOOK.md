# Clerk Organizations + Supabase tenant isolation runbook

This runbook covers the production/staging rollout for Clerk Organizations while Supabase remains the database. It assumes the app has migrated authentication to Clerk, but still needs to preserve legacy Supabase Auth UUID memberships.

## Scope

The rollout validates:

- `public.organizations.clerk_org_id`
- `public.organizations.created_by_clerk_user_id`
- `public.organization_members.clerk_user_id`
- `public.organization_members.clerk_membership_id`
- `public.organization_members.last_clerk_sync_at`
- `organizations_clerk_org_id_key`
- `organization_members_org_clerk_user_key`
- `public.current_clerk_user_id()`
- `public.is_org_member(uuid)`
- `public.has_org_role(uuid, text[])`
- RLS on existing tenant-owned tables
- A/B tenant isolation for Clerk text IDs
- role gates for owner/admin/member/viewer
- legacy Supabase UUID subject parsing

## Required GitHub environment secrets

Configure these secrets separately on the `staging` and `production` GitHub environments:

- `SUPABASE_DB_URL`: Supabase Postgres transaction pooler URI. Prefer the IPv4 transaction pooler, normally port `6543`. Do not use the direct IPv6-only `db.<project>.supabase.co:5432` endpoint from GitHub-hosted runners.
- `NEXT_PUBLIC_SUPABASE_URL`: required only when running the optional legacy UUID live validator.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required only when running the optional legacy UUID live validator.
- `SUPABASE_SERVICE_ROLE_KEY`: required only when running the optional legacy UUID live validator.

The service-role key must remain server-side only. The application admin client imports `server-only`, reads `SUPABASE_SERVICE_ROLE_KEY` from `process.env`, and creates the privileged Supabase client only from server code. Keep this invariant during review.

## Rollout order

1. Merge the workflow/migration branch to `main`.
2. Run **Supabase Clerk Organization Migration Validation** against `staging` with:
   - `target_environment=staging`
   - `apply_migrations=true`
   - `run_legacy_uuid_validator=true` when staging has Supabase Auth admin API credentials configured.
3. Review the backup artifact and validation logs.
4. Run the same workflow against `production` with:
   - `target_environment=production`
   - `apply_migrations=true`
   - `run_legacy_uuid_validator=true` when production credentials are configured and the live fixture test is approved.

The workflow always creates a database backup before migration application. The backup artifact contains:

- custom-format full `pg_dump`
- schema-only dump
- `sha256sum` manifest

Treat backup artifacts as sensitive production data. Retention is intentionally short.

## Migrations applied by the workflow

The workflow applies the Clerk organization migrations in this order:

1. `supabase/migrations/20260625193000_clerk_organization_identity_mapping.sql`
2. `supabase/migrations/20260625214500_clerk_rls_identity_helpers.sql`
3. `supabase/migrations/20260626120000_clerk_uuid_safe_rls_helpers.sql`

The final hardening migration avoids calling `auth.uid()` for Clerk text subjects. Supabase Auth UUID subjects continue through `current_legacy_user_id()`, while Clerk `user_...` subjects are resolved through `current_clerk_user_id()`.

## Validation performed

`scripts/security/validate-clerk-organization-tenant-isolation.sql` runs inside a single transaction and rolls back all fixture rows at the end.

It validates metadata:

- required Clerk columns exist
- required unique indexes exist
- required helper functions exist
- existing tenant-owned tables have RLS enabled

It validates runtime behavior under `role authenticated` and simulated JWT claims:

- Org A + User A can read Org A
- User A cannot read Org B
- Org B + User B can read Org B
- User B cannot read Org A
- owner/admin pass the `owner/admin` role gate for billing/settings/members
- member remains an org member but fails the `owner/admin` billing/settings gate
- viewer remains readable-only and fails non-viewer role gates
- legacy UUID subject resolves via `current_legacy_user_id()` and is not treated as a Clerk text ID

The optional `run_legacy_uuid_validator=true` step runs the existing live Supabase UUID validator, which creates real temporary Supabase Auth users through server-side service-role credentials and verifies legacy behavior with real sessions.

## Manual local command sequence

Use this sequence only from a trusted machine with production/staging database access:

```bash
set -euo pipefail
export SUPABASE_DB_URL='postgresql://...'

mkdir -p supabase-backups
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --file=supabase-backups/pre-clerk-org.dump
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges --file=supabase-backups/pre-clerk-org.schema.sql
sha256sum supabase-backups/pre-clerk-org.dump supabase-backups/pre-clerk-org.schema.sql > supabase-backups/pre-clerk-org.sha256

psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --single-transaction --file=supabase/migrations/20260625193000_clerk_organization_identity_mapping.sql
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --single-transaction --file=supabase/migrations/20260625214500_clerk_rls_identity_helpers.sql
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --single-transaction --file=supabase/migrations/20260626120000_clerk_uuid_safe_rls_helpers.sql
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --file=scripts/security/validate-clerk-organization-tenant-isolation.sql
```

## Rollback

Prefer restore-based rollback for production because dropping Clerk columns can destroy mapping data.

### Option A: restore backup into a replacement database/project

1. Stop deploys and background jobs that write tenant/org membership data.
2. Restore the pre-migration artifact into a new Supabase database/project or an approved maintenance restore target:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$ROLLBACK_DB_URL" supabase-backups/pre-clerk-org.dump
```

3. Point the application back to the restored database/project.
4. Run the pre-Clerk release verification suite.
5. Keep the failed migrated database read-only until forensic review is complete.

### Option B: forward rollback of helper behavior only

Use this only if the failure is isolated to Clerk RLS helper behavior and the new columns/indexes are safe to keep.

```sql
begin;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

commit;
```

This intentionally restores legacy UUID-only behavior. It will break Clerk text-ID tenant access, so pair it with an application rollback.

### Option C: destructive schema rollback

Only use this after exporting Clerk organization/member mappings. It removes the Clerk mapping layer.

```sql
begin;

drop index if exists public.organization_members_org_clerk_user_key;
drop index if exists public.organization_members_clerk_membership_key;
drop index if exists public.organization_members_clerk_user_id_idx;
drop index if exists public.organizations_clerk_org_id_key;
drop index if exists public.organizations_created_by_clerk_user_id_idx;

alter table public.organization_members
  drop constraint if exists organization_members_user_identity_required,
  drop column if exists clerk_user_id,
  drop column if exists clerk_membership_id,
  drop column if exists last_clerk_sync_at;

alter table public.organizations
  drop column if exists clerk_org_id,
  drop column if exists created_by_clerk_user_id,
  drop column if exists last_clerk_sync_at;

drop function if exists public.current_jwt_subject();
drop function if exists public.current_legacy_user_id();
drop function if exists public.current_clerk_user_id();

commit;
```

After destructive rollback, verify that `organization_members.user_id` nullability and legacy policies match the pre-Clerk schema before reopening writes.
