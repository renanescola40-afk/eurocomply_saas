\set ON_ERROR_STOP on
\echo 'Validating Clerk organization tenant isolation metadata and live RLS behavior...'

begin;

create function pg_temp.assert_true(passed boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(passed, false) then
    raise exception 'Clerk organization tenant isolation validation failed: %', message;
  end if;
end;
$$;

-- Required Clerk mapping columns.
select pg_temp.assert_true(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organizations' and column_name = 'clerk_org_id'
), 'missing public.organizations.clerk_org_id');

select pg_temp.assert_true(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organizations' and column_name = 'created_by_clerk_user_id'
), 'missing public.organizations.created_by_clerk_user_id');

select pg_temp.assert_true(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organization_members' and column_name = 'clerk_user_id'
), 'missing public.organization_members.clerk_user_id');

select pg_temp.assert_true(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organization_members' and column_name = 'clerk_membership_id'
), 'missing public.organization_members.clerk_membership_id');

select pg_temp.assert_true(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organization_members' and column_name = 'last_clerk_sync_at'
), 'missing public.organization_members.last_clerk_sync_at');

-- Required indexes.
select pg_temp.assert_true(to_regclass('public.organizations_clerk_org_id_key') is not null, 'missing index public.organizations_clerk_org_id_key');
select pg_temp.assert_true(to_regclass('public.organization_members_org_clerk_user_key') is not null, 'missing index public.organization_members_org_clerk_user_key');

-- Required functions.
select pg_temp.assert_true(to_regprocedure('public.current_clerk_user_id()') is not null, 'missing function public.current_clerk_user_id()');
select pg_temp.assert_true(to_regprocedure('public.is_org_member(uuid)') is not null, 'missing function public.is_org_member(uuid)');
select pg_temp.assert_true(to_regprocedure('public.has_org_role(uuid,text[])') is not null, 'missing function public.has_org_role(uuid, text[])');

-- UUID-safe compatibility helpers introduced for mixed Clerk text IDs and Supabase legacy UUID IDs.
select pg_temp.assert_true(to_regprocedure('public.current_legacy_user_id()') is not null, 'missing function public.current_legacy_user_id()');
select pg_temp.assert_true(to_regprocedure('public.current_jwt_subject()') is not null, 'missing function public.current_jwt_subject()');

-- Existing tenant-owned tables must have RLS enabled.
with tenant_owned_tables(table_name) as (
  values
    ('organizations'),
    ('organization_members'),
    ('documents'),
    ('risks'),
    ('vendors'),
    ('tasks'),
    ('compliance_tasks'),
    ('ai_systems'),
    ('ai_incidents'),
    ('audit_events'),
    ('audit_logs'),
    ('subscriptions'),
    ('organization_invites'),
    ('invitations'),
    ('notifications')
), existing_tenant_owned_tables as (
  select t.table_name, c.relrowsecurity
  from tenant_owned_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.table_name))
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r', 'p')
)
select pg_temp.assert_true(not exists (
  select 1 from existing_tenant_owned_tables where relrowsecurity is not true
), 'one or more existing tenant-owned tables have RLS disabled');

select
  gen_random_uuid() as org_a_id,
  gen_random_uuid() as org_b_id,
  gen_random_uuid() as legacy_user_a_id,
  'org_rls_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_org_a,
  'org_rls_b_' || replace(gen_random_uuid()::text, '-', '') as clerk_org_b,
  'user_rls_owner_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_owner_a,
  'user_rls_admin_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_admin_a,
  'user_rls_member_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_member_a,
  'user_rls_viewer_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_viewer_a,
  'user_rls_owner_b_' || replace(gen_random_uuid()::text, '-', '') as clerk_owner_b,
  'mem_rls_owner_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_membership_owner_a,
  'mem_rls_admin_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_membership_admin_a,
  'mem_rls_member_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_membership_member_a,
  'mem_rls_viewer_a_' || replace(gen_random_uuid()::text, '-', '') as clerk_membership_viewer_a,
  'mem_rls_owner_b_' || replace(gen_random_uuid()::text, '-', '') as clerk_membership_owner_b
\gset

insert into public.organizations (id, name, slug, created_by, clerk_org_id, created_by_clerk_user_id, last_clerk_sync_at)
values
  (:'org_a_id'::uuid, 'RLS Clerk Tenant A', 'rls-clerk-a-' || replace(:'org_a_id', '-', ''), null, :'clerk_org_a', :'clerk_owner_a', now()),
  (:'org_b_id'::uuid, 'RLS Clerk Tenant B', 'rls-clerk-b-' || replace(:'org_b_id', '-', ''), null, :'clerk_org_b', :'clerk_owner_b', now());

insert into public.organization_members (organization_id, user_id, clerk_user_id, clerk_membership_id, role, last_clerk_sync_at)
values
  (:'org_a_id'::uuid, null, :'clerk_owner_a', :'clerk_membership_owner_a', 'owner', now()),
  (:'org_a_id'::uuid, null, :'clerk_admin_a', :'clerk_membership_admin_a', 'admin', now()),
  (:'org_a_id'::uuid, null, :'clerk_member_a', :'clerk_membership_member_a', 'member', now()),
  (:'org_a_id'::uuid, null, :'clerk_viewer_a', :'clerk_membership_viewer_a', 'viewer', now()),
  (:'org_b_id'::uuid, null, :'clerk_owner_b', :'clerk_membership_owner_b', 'owner', now());

set local role authenticated;

-- Org A with User A: User A can read Org A but cannot read Org B.
select set_config('request.jwt.claim.sub', :'clerk_owner_a', true);
select pg_temp.assert_true(public.current_clerk_user_id() = :'clerk_owner_a', 'Clerk owner A subject was not resolved');
select pg_temp.assert_true(public.current_legacy_user_id() is null, 'Clerk text subject must not be cast as legacy UUID');
select pg_temp.assert_true(public.is_org_member(:'org_a_id'::uuid), 'User A owner is not recognized as Org A member');
select pg_temp.assert_true(not public.is_org_member(:'org_b_id'::uuid), 'User A owner is incorrectly recognized as Org B member');
select pg_temp.assert_true((select count(*) from public.organizations where id = :'org_a_id'::uuid) = 1, 'User A cannot read Org A');
select pg_temp.assert_true((select count(*) from public.organizations where id = :'org_b_id'::uuid) = 0, 'User A can read Org B');

-- Org B with User B: User B can read Org B but cannot read Org A.
select set_config('request.jwt.claim.sub', :'clerk_owner_b', true);
select pg_temp.assert_true(public.current_clerk_user_id() = :'clerk_owner_b', 'Clerk owner B subject was not resolved');
select pg_temp.assert_true(public.is_org_member(:'org_b_id'::uuid), 'User B owner is not recognized as Org B member');
select pg_temp.assert_true(not public.is_org_member(:'org_a_id'::uuid), 'User B owner is incorrectly recognized as Org A member');
select pg_temp.assert_true((select count(*) from public.organizations where id = :'org_b_id'::uuid) = 1, 'User B cannot read Org B');
select pg_temp.assert_true((select count(*) from public.organizations where id = :'org_a_id'::uuid) = 0, 'User B can read Org A');

-- Role behavior: owner/admin can access billing/settings/members gates.
select set_config('request.jwt.claim.sub', :'clerk_owner_a', true);
select pg_temp.assert_true(public.has_org_role(:'org_a_id'::uuid, array['owner','admin']), 'owner cannot access owner/admin gate for billing/settings/members');

select set_config('request.jwt.claim.sub', :'clerk_admin_a', true);
select pg_temp.assert_true(public.has_org_role(:'org_a_id'::uuid, array['owner','admin']), 'admin cannot access owner/admin gate for billing/settings/members');

-- Members are members, but cannot access owner/admin billing/settings gates.
select set_config('request.jwt.claim.sub', :'clerk_member_a', true);
select pg_temp.assert_true(public.is_org_member(:'org_a_id'::uuid), 'member cannot read own organization');
select pg_temp.assert_true(not public.has_org_role(:'org_a_id'::uuid, array['owner','admin']), 'member can access owner/admin billing/settings gate');

-- Viewers can read, but cannot access write/admin gates.
select set_config('request.jwt.claim.sub', :'clerk_viewer_a', true);
select pg_temp.assert_true(public.is_org_member(:'org_a_id'::uuid), 'viewer cannot read own organization');
select pg_temp.assert_true(not public.has_org_role(:'org_a_id'::uuid, array['owner','admin','editor','member']), 'viewer can access non-viewer role gate');

-- Legacy Supabase Auth UUID subjects remain parseable and do not get treated as Clerk text IDs.
select set_config('request.jwt.claim.sub', :'legacy_user_a_id', true);
select pg_temp.assert_true(public.current_legacy_user_id() = :'legacy_user_a_id'::uuid, 'legacy Supabase UUID subject was not resolved');
select pg_temp.assert_true(public.current_clerk_user_id() is null, 'legacy Supabase UUID subject was incorrectly treated as Clerk user ID');

reset role;
rollback;

\echo 'Clerk organization tenant isolation validation passed.'
