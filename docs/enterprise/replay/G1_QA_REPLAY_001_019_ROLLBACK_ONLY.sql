-- G1 QA-ONLY rollback-only source replay bundle, exactly source migrations 01..16.
-- Source baseline 70d3545f414d063379d481fd238aed563e05edda.
-- DO NOT EXECUTE ON PRODUCTION. This bundle never writes a migration ledger.
-- It is a transaction test script only; it MUST conclude with ROLLBACK.
-- All source portions below were downloaded unchanged from GitHub main and identify their blob SHA.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- G1 MIGRATION 001 20260605190000_organizations.sql GITHUB_BLOB_SHA 370757bd7e66193f6911fedf8237bf46870669fc
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- G1 MIGRATION 002 20260605190100_organization_members.sql GITHUB_BLOB_SHA 24f1800d801b7fa3883b5e71037277193334baeb
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

alter table public.organization_members enable row level security;

-- G1 MIGRATION 003 20260605190200_audit_logs.sql GITHUB_BLOB_SHA 02b458f33b2fc04d5414d6742b775fdc815ff0f5
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- G1 MIGRATION 004 20260605190300_profiles.sql GITHUB_BLOB_SHA 4bf2d2ade61ad47a58f9f3fb72b4dab29305ea2d
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- G1 MIGRATION 005 20260605190400_subscriptions.sql GITHUB_BLOB_SHA 52a3eaf3e99c13c69f8df85b1995155d8f58c0cb
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- G1 MIGRATION 006 20260605190500_basic_rls_policies.sql GITHUB_BLOB_SHA a3ceea129a4fbe066b06cbca5b0c29f164955a39
create policy "Users can view own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Members can view organizations"
on public.organizations for select
using (
  id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view memberships"
on public.organization_members for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view subscriptions"
on public.subscriptions for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view audit logs"
on public.audit_logs for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

-- G1 MIGRATION 007 20260605190600_rbac.sql GITHUB_BLOB_SHA 046aa40ec26997bf8d071379e9072c4b136e556a
create table if not exists public.permissions (
  key text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role text not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into public.permissions (key, description) values
  ('organization.manage', 'Manage organization settings'),
  ('members.manage', 'Invite and manage organization members'),
  ('billing.manage', 'Manage billing and subscription'),
  ('audit_logs.read', 'Read organization audit logs'),
  ('compliance.manage', 'Manage compliance workspace')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key) values
  ('owner', 'organization.manage'),
  ('owner', 'members.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'audit_logs.read'),
  ('owner', 'compliance.manage'),
  ('admin', 'members.manage'),
  ('admin', 'audit_logs.read'),
  ('admin', 'compliance.manage'),
  ('compliance_manager', 'compliance.manage'),
  ('viewer', 'audit_logs.read')
on conflict do nothing;

-- G1 MIGRATION 008 20260605190700_rbac_helpers.sql GITHUB_BLOB_SHA 7a1c1608712cd313de29a055c1af479a09322bb9
create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
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

-- G1 MIGRATION 009 20260605190800_admin_rls_policies.sql GITHUB_BLOB_SHA 7d282004c39866bbceed48f290d1d5d43556d4d0
create policy "Owners can update organizations"
on public.organizations
for update
using (public.has_org_role(id, array['owner']))
with check (public.has_org_role(id, array['owner']));

create policy "Admins can add members"
on public.organization_members
for insert
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "Admins can update members"
on public.organization_members
for update
using (public.has_org_role(organization_id, array['owner','admin']))
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "Admins can remove members"
on public.organization_members
for delete
using (public.has_org_role(organization_id, array['owner','admin']));

create policy "Owners can manage subscriptions"
on public.subscriptions
for all
using (public.has_org_role(organization_id, array['owner']))
with check (public.has_org_role(organization_id, array['owner']));

-- G1 MIGRATION 010 20260605190900_compliance_tasks.sql GITHUB_BLOB_SHA a4e245325d0959b57ddf7a4d62aaed3107e62f35
create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compliance_tasks enable row level security;

create policy "Members can read compliance tasks"
on public.compliance_tasks for select
using (public.is_org_member(organization_id));

create policy "Managers can create compliance tasks"
on public.compliance_tasks for insert
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

create policy "Managers can update compliance tasks"
on public.compliance_tasks for update
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

-- G1 MIGRATION 011 20260605191000_documents.sql GITHUB_BLOB_SHA 6b924d95631a941508beb4369c75187bff6c5fc1
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null default 'general',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  status text not null default 'active',
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Members can read documents"
on public.documents for select
using (public.is_org_member(organization_id));

create policy "Managers can create documents"
on public.documents for insert
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

create policy "Managers can update documents"
on public.documents for update
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

-- G1 MIGRATION 012 20260605191100_vendors.sql GITHUB_BLOB_SHA 1c10d5431b38248a67615640b1631803f38fa18e
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  website text,
  country text,
  category text not null default 'general',
  data_access_level text not null default 'unknown',
  risk_level text not null default 'medium',
  review_status text not null default 'pending',
  dpa_signed boolean not null default false,
  last_reviewed_at date,
  next_review_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create policy "Members can read vendors"
on public.vendors for select
using (public.is_org_member(organization_id));

create policy "Managers can manage vendors"
on public.vendors for all
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

-- G1 MIGRATION 013 20260605191200_risks.sql GITHUB_BLOB_SHA 7357a04fc476f0912fbd0ca310b7d5cc023876be
create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  likelihood integer not null default 3 check (likelihood between 1 and 5),
  impact integer not null default 3 check (impact between 1 and 5),
  risk_score integer generated always as (likelihood * impact) stored,
  status text not null default 'open',
  mitigation text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.risks enable row level security;

create policy "Members can read risks"
on public.risks for select
using (public.is_org_member(organization_id));

create policy "Managers can manage risks"
on public.risks for all
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

-- G1 MIGRATION 014 20260605211500_invitations.sql GITHUB_BLOB_SHA be3c86f2cee75b534a89d66c7a6b77ca81d553f8
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique(organization_id,email)
);

alter table public.invitations enable row level security;

create policy "Admins can manage invitations"
on public.invitations
for all
using (public.has_org_role(organization_id, array['owner','admin']))
with check (public.has_org_role(organization_id, array['owner','admin']));

-- G1 MIGRATION 015 20260605220000_document_storage.sql GITHUB_BLOB_SHA 1d8dbd9a1a2b8e2fb8f273ccdefb4261fc4df59a
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read organization document objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance-documents'
  and split_part(name, '/', 1)::uuid in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can upload organization document objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'compliance-documents'
  and split_part(name, '/', 1)::uuid in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

-- G1 MIGRATION 016 20260605222000_stripe_webhook_events.sql GITHUB_BLOB_SHA 5213f8f717de3bbe3626c725baf9806c4ae413c0
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

alter table public.stripe_webhook_events enable row level security;

-- G1 FINALIZER: the test may not persist data, RLS, buckets, or schema.

-- G1 migration 017 / main blob 1a1f8753d759b27003395ad5b76ebcc8e0788b62


alter table if exists public.permissions enable row level security;
alter table if exists public.permissions force row level security;
alter table if exists public.role_permissions enable row level security;
alter table if exists public.role_permissions force row level security;
alter table if exists public.stripe_webhook_events enable row level security;
alter table if exists public.stripe_webhook_events force row level security;

revoke all on table public.permissions from PUBLIC, anon, authenticated;
revoke all on table public.role_permissions from PUBLIC, anon, authenticated;
revoke all on table public.stripe_webhook_events from PUBLIC, anon, authenticated;

grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;

-- Keep one explicit authenticated-only catalog policy per table. The identity
-- predicate is fail-closed if the JWT/auth context is missing and does not
-- grant unconditional row access.
DROP POLICY IF EXISTS permissions_authenticated_read ON public.permissions;
DROP POLICY IF EXISTS permissions_select_authenticated ON public.permissions;
CREATE POLICY permissions_authenticated_read
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_permissions_authenticated_read ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_select_authenticated ON public.role_permissions;
CREATE POLICY role_permissions_authenticated_read
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Webhook idempotency records are backend-only. Intentionally create no policy.
-- Migration bookkeeping is owned by the Supabase CLI. Do not write to
-- supabase_migrations.schema_migrations from a canonical migration file.

do $$
declare
  table_name text;
begin
  foreach table_name in array array['permissions','role_permissions'] loop
    if not pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') then
      raise exception 'authenticated SELECT privilege missing for public.%', table_name;
    end if;

    if pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER') then
      raise exception 'authenticated write/admin privilege survived for public.%', table_name;
    end if;

    if pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'DELETE') then
      raise exception 'anon privilege survived for public.%', table_name;
    end if;
  end loop;

  if pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'UPDATE')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'DELETE')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'INSERT')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'UPDATE')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'DELETE') then
    raise exception 'client privilege survived for public.stripe_webhook_events';
  end if;
end $$;


-- G1 migration 018 / QA-only guarded overlay blob f017f87ac0828fabb0c2bb369932fb30e7430547
-- G1 reviewed QA-only reconciliation overlay for provider ledger migration 18 (20260804224915).
-- NEVER run this as a production migration or modify Supabase production migration statements.
-- Source provider migration requires 9 function signatures that the clean replay prefix does not create.
-- This overlay hardens every existing function, requires both historical member helpers,
-- and records optional absence for downstream fail-closed final ACL postconditions.
-- Owner/source lineage: main 70d3545f414d063379d481fd238aed563e05edda
-- Original source: supabase/migrations/20260804224915_live_security_definer_acl_hardening.sql
-- Original blob SHA: e82dd33f0f5a5052572ee36228667fe14db7eb74
-- Apply in a single caller-owned QA transaction; no BEGIN/COMMIT provided here.

DO $g1_qa18_acl$
DECLARE
  spec record;
  procedure_signature regprocedure;
  optional_absent_count integer := 0;
BEGIN
  FOR spec IN
    SELECT *
    FROM (VALUES
      ('public.delete_user_account(uuid)', false, false, 'pg_catalog, auth'),
      ('public.is_org_member(uuid)', true, true, NULL),
      ('public.has_org_role(uuid,text[])', true, true, NULL),
      ('public.has_org_write_role(uuid)', false, true, NULL),
      ('public.live_rls_validation_is_org_member(uuid)', false, true, NULL),
      ('public.current_jwt_subject()', false, true, 'pg_catalog'),
      ('public.current_legacy_user_id()', false, true, 'pg_catalog, public'),
      ('public.current_clerk_user_id()', false, true, 'pg_catalog, public'),
      ('public.prevent_client_notification_scope_change()', false, false, NULL),
      ('public.set_ai_systems_updated_at()', false, false, 'pg_catalog, public'),
      ('public.set_ai_incidents_updated_at()', false, false, 'pg_catalog, public')
    ) AS catalog(signature, required_for_prefix, authenticated_allowed, effective_search_path)
  LOOP
    procedure_signature := to_regprocedure(spec.signature);
    IF procedure_signature IS NULL THEN
      IF spec.required_for_prefix THEN
        RAISE EXCEPTION 'G1 QA18 prerequisite missing: %', spec.signature;
      END IF;
      optional_absent_count := optional_absent_count + 1;
      CONTINUE;
    END IF;

    IF spec.effective_search_path IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = %s', procedure_signature, spec.effective_search_path);
    END IF;

    -- Do not permit PUBLIC's inherited EXECUTE on privileged functions.
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', procedure_signature);
    IF spec.authenticated_allowed THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', procedure_signature);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', procedure_signature);
    END IF;
  END LOOP;

  IF optional_absent_count <> 9 THEN
    RAISE EXCEPTION 'G1 QA18 unexpected optional helper inventory: % (expected 9)', optional_absent_count;
  END IF;

  IF has_function_privilege('anon', 'public.is_org_member(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.has_org_role(uuid,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'G1 QA18 anonymous EXECUTE still allowed';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_org_member(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.has_org_role(uuid,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'G1 QA18 required authenticated helper ACL missing';
  END IF;
END $g1_qa18_acl$;

-- G1 migration 019 / QA-only guarded overlay blob be6a51bf0da0fd8b5c031e55beb16f4848bdfa67
-- G1 QA-only safe provenance overlay for migration index 19 / version 20260804230433.
-- Original main SQL unchanged. Blob SHA: 513a04a0e244dd5acd4a3e54f270334e84dba4ae
-- Only absent PRE-MATERIALIZATION helper moves are skipped, then wrappers are CREATED and guarded.
-- No BEGIN/COMMIT; caller MUST use isolated QA transaction and ROLLBACK.

-- enterprise-migration-review: approved
-- Keep privileged RLS helpers callable by policies without exposing them as
-- PostgREST RPC endpoints in the public schema.


create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

-- ALTER ... SET SCHEMA preserves each function OID, so PostgreSQL rewrites all
-- dependent policy expressions atomically instead of requiring policy churn.
alter function public.is_org_member(uuid) set schema app_private;
alter function public.has_org_role(uuid, text[]) set schema app_private;
DO $g1_optional_write_helper$
BEGIN
  IF to_regprocedure('public.has_org_write_role(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.has_org_write_role(uuid) SET SCHEMA app_private;
  END IF;
END $g1_optional_write_helper$;
DO $g1_optional_validation_helper$
BEGIN
  IF to_regprocedure('public.live_rls_validation_is_org_member(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.live_rls_validation_is_org_member(uuid) SET SCHEMA app_private;
  END IF;
END $g1_optional_validation_helper$;

-- These two wrappers referenced their former public-qualified dependencies in
-- their SQL bodies, so replace them after the atomic move.
create or replace function app_private.has_org_write_role(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app_private
as $$
  select app_private.has_org_role(
    target_organization_id,
    array['owner', 'admin', 'editor']
  );
$$;

create or replace function app_private.live_rls_validation_is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app_private
as $$
  select app_private.is_org_member(target_organization_id);
$$;

revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, text[]) from public, anon;
revoke all on function app_private.has_org_write_role(uuid) from public, anon;
revoke all on function app_private.live_rls_validation_is_org_member(uuid) from public, anon;

grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function app_private.has_org_write_role(uuid) to authenticated, service_role;
grant execute on function app_private.live_rls_validation_is_org_member(uuid) to authenticated, service_role;

comment on schema app_private is
  'Non-exposed schema for privileged helpers used internally by RLS policies.';

-- Required QA-only proof that no privileged helper is exposed by public PostgREST.
DO $g1_private_guard$
BEGIN
  IF to_regprocedure('public.is_org_member(uuid)') IS NOT NULL
     OR to_regprocedure('public.has_org_role(uuid,text[])') IS NOT NULL
     OR to_regprocedure('public.has_org_write_role(uuid)') IS NOT NULL
     OR to_regprocedure('public.live_rls_validation_is_org_member(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'G1 QA19 a privileged member helper remains exposed in public';
  END IF;
  IF to_regprocedure('app_private.is_org_member(uuid)') IS NULL
     OR to_regprocedure('app_private.has_org_role(uuid,text[])') IS NULL
     OR to_regprocedure('app_private.has_org_write_role(uuid)') IS NULL
     OR to_regprocedure('app_private.live_rls_validation_is_org_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'G1 QA19 an expected private helper is absent';
  END IF;
  IF has_schema_privilege('anon','app_private','USAGE') THEN
    RAISE EXCEPTION 'G1 QA19 private helper schema available to anon';
  END IF;
  IF NOT has_schema_privilege('authenticated','app_private','USAGE') THEN
    RAISE EXCEPTION 'G1 QA19 authenticated policies cannot resolve private helpers';
  END IF;
END $g1_private_guard$;

-- G1 mandatory rollback / no persisted schema or ledger
ROLLBACK;
