-- Clerk organization identity mapping
-- Keeps existing Supabase Auth UUID columns for backwards compatibility while allowing Clerk user/org IDs.

alter table public.organizations
  add column if not exists clerk_org_id text,
  add column if not exists created_by_clerk_user_id text,
  add column if not exists last_clerk_sync_at timestamptz;

create unique index if not exists organizations_clerk_org_id_key
  on public.organizations (clerk_org_id)
  where clerk_org_id is not null;

create index if not exists organizations_created_by_clerk_user_id_idx
  on public.organizations (created_by_clerk_user_id)
  where created_by_clerk_user_id is not null;

alter table public.organization_members
  add column if not exists clerk_user_id text,
  add column if not exists clerk_membership_id text,
  add column if not exists last_clerk_sync_at timestamptz;

alter table public.organization_members
  alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_user_identity_required'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_user_identity_required
      check (user_id is not null or clerk_user_id is not null);
  end if;
end $$;

create unique index if not exists organization_members_org_clerk_user_key
  on public.organization_members (organization_id, clerk_user_id)
  where clerk_user_id is not null;

create unique index if not exists organization_members_clerk_membership_key
  on public.organization_members (clerk_membership_id)
  where clerk_membership_id is not null;

create index if not exists organization_members_clerk_user_id_idx
  on public.organization_members (clerk_user_id)
  where clerk_user_id is not null;

comment on column public.organizations.clerk_org_id is 'Clerk organization ID, for example org_xxx. Used to map Clerk Organizations to Supabase tenant rows.';
comment on column public.organizations.created_by_clerk_user_id is 'Clerk user ID that created the tenant row when Supabase Auth UUID is not available.';
comment on column public.organizations.last_clerk_sync_at is 'Last time this tenant row was synchronized from Clerk Organizations.';
comment on column public.organization_members.clerk_user_id is 'Clerk user ID for membership rows created by Clerk-backed authentication.';
comment on column public.organization_members.clerk_membership_id is 'Optional Clerk membership ID for idempotent membership synchronization.';
comment on column public.organization_members.last_clerk_sync_at is 'Last time this membership row was synchronized from Clerk Organizations.';
