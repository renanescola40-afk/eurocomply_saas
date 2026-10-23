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

-- G1 verified canonical QA replay step 20 20260805223500_remove_permissive_tenant_rls_bypasses.sql SOURCE_BLOB_SHA 5be66c46c795aa438e05520acb4d219a6c5bde1e
-- Remove legacy permissive policies that are OR-combined with the current
-- tenant-scoped policies and therefore bypass organization isolation.
--
-- This migration is intentionally subtractive. It does not replace or broaden
-- access. On a clean replay that predates the canonical tenant-safe policy
-- foundation, zero canonical policies is an expected historical state; the
-- later reconciliation 20260807091341 materializes and verifies the full chain.
-- Any partial canonical state still fails closed here.


-- Membership writes are backend-only in the canonical policy model. These
-- legacy permissive policies otherwise remain OR-combined with the explicit
-- backend-only policies and allow direct authenticated mutations.
drop policy if exists "Users can insert their own memberships"
  on public.organization_members;
drop policy if exists "Admins can add members"
  on public.organization_members;
drop policy if exists "Admins can update members"
  on public.organization_members;
drop policy if exists "Admins can remove members"
  on public.organization_members;

-- Global authenticated read/write policies left over from the original schema.
drop policy if exists "Authenticated can insert audit logs"
  on public.audit_logs;
drop policy if exists "Authenticated can read audit logs"
  on public.audit_logs;

drop policy if exists "Authenticated can read compliance tasks"
  on public.compliance_tasks;
drop policy if exists "Authenticated can write compliance tasks"
  on public.compliance_tasks;

drop policy if exists "Authenticated can read documents"
  on public.documents;
drop policy if exists "Authenticated can write documents"
  on public.documents;

drop policy if exists "Authenticated can read risks"
  on public.risks;
drop policy if exists "Authenticated can write risks"
  on public.risks;

drop policy if exists "Authenticated can read vendors"
  on public.vendors;
drop policy if exists "Authenticated can write vendors"
  on public.vendors;

drop policy if exists "Authenticated can read subscriptions"
  on public.subscriptions;
drop policy if exists "Authenticated can write subscriptions"
  on public.subscriptions;

-- Fail closed for partially-materialized canonical policy chains. A clean
-- historical replay can legitimately have zero canonical policies at this point;
-- 20260807091341 is the authoritative reconciliation and full-chain guard.
do $migration_guard$
declare
  required_policy record;
  canonical_policy_count integer;
begin
  select count(*)::integer
    into canonical_policy_count
  from pg_catalog.pg_policies policy
  where policy.schemaname = 'public'
    and (
      (policy.tablename = 'organization_members' and policy.policyname in (
        'rls_organization_members_select_member',
        'rls_organization_members_insert_backend_only',
        'rls_organization_members_update_backend_only',
        'rls_organization_members_delete_backend_only'
      ))
      or (policy.tablename = 'audit_logs' and policy.policyname in (
        'rls_audit_logs_select_member',
        'rls_audit_logs_insert_backend_only'
      ))
      or (policy.tablename = 'compliance_tasks' and policy.policyname in (
        'rls_compliance_tasks_select_member',
        'rls_compliance_tasks_insert_writer',
        'rls_compliance_tasks_update_writer',
        'rls_compliance_tasks_delete_admin'
      ))
      or (policy.tablename = 'documents' and policy.policyname in (
        'rls_documents_select_member',
        'rls_documents_insert_writer',
        'rls_documents_update_writer',
        'rls_documents_delete_admin'
      ))
      or (policy.tablename = 'risks' and policy.policyname in (
        'rls_risks_select_member',
        'rls_risks_insert_writer',
        'rls_risks_update_writer',
        'rls_risks_delete_admin'
      ))
      or (policy.tablename = 'vendors' and policy.policyname in (
        'rls_vendors_select_member',
        'rls_vendors_insert_writer',
        'rls_vendors_update_writer',
        'rls_vendors_delete_admin'
      ))
      or (policy.tablename = 'subscriptions' and policy.policyname in (
        'rls_subscriptions_select_member',
        'rls_subscriptions_insert_backend_only',
        'rls_subscriptions_update_backend_only',
        'rls_subscriptions_delete_backend_only'
      ))
    );

  if canonical_policy_count > 0 then
    for required_policy in
      select *
      from (values
        ('organization_members', 'rls_organization_members_select_member'),
        ('organization_members', 'rls_organization_members_insert_backend_only'),
        ('organization_members', 'rls_organization_members_update_backend_only'),
        ('organization_members', 'rls_organization_members_delete_backend_only'),
        ('audit_logs', 'rls_audit_logs_select_member'),
        ('audit_logs', 'rls_audit_logs_insert_backend_only'),
        ('compliance_tasks', 'rls_compliance_tasks_select_member'),
        ('compliance_tasks', 'rls_compliance_tasks_insert_writer'),
        ('compliance_tasks', 'rls_compliance_tasks_update_writer'),
        ('compliance_tasks', 'rls_compliance_tasks_delete_admin'),
        ('documents', 'rls_documents_select_member'),
        ('documents', 'rls_documents_insert_writer'),
        ('documents', 'rls_documents_update_writer'),
        ('documents', 'rls_documents_delete_admin'),
        ('risks', 'rls_risks_select_member'),
        ('risks', 'rls_risks_insert_writer'),
        ('risks', 'rls_risks_update_writer'),
        ('risks', 'rls_risks_delete_admin'),
        ('vendors', 'rls_vendors_select_member'),
        ('vendors', 'rls_vendors_insert_writer'),
        ('vendors', 'rls_vendors_update_writer'),
        ('vendors', 'rls_vendors_delete_admin'),
        ('subscriptions', 'rls_subscriptions_select_member'),
        ('subscriptions', 'rls_subscriptions_insert_backend_only'),
        ('subscriptions', 'rls_subscriptions_update_backend_only'),
        ('subscriptions', 'rls_subscriptions_delete_backend_only')
      ) as expected(table_name, policy_name)
    loop
      if not exists (
        select 1
        from pg_catalog.pg_policies policy
        where policy.schemaname = 'public'
          and policy.tablename = required_policy.table_name
          and policy.policyname = required_policy.policy_name
      ) then
        raise exception 'Required tenant-safe RLS policy %.% is missing',
          required_policy.table_name, required_policy.policy_name;
      end if;
    end loop;
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'public'
      and (
        (policy.tablename = 'organization_members'
          and policy.policyname in (
            'Users can insert their own memberships',
            'Admins can add members',
            'Admins can update members',
            'Admins can remove members'
          ))
        or policy.policyname in (
          'Authenticated can insert audit logs',
          'Authenticated can read audit logs',
          'Authenticated can read compliance tasks',
          'Authenticated can write compliance tasks',
          'Authenticated can read documents',
          'Authenticated can write documents',
          'Authenticated can read risks',
          'Authenticated can write risks',
          'Authenticated can read vendors',
          'Authenticated can write vendors',
          'Authenticated can read subscriptions',
          'Authenticated can write subscriptions'
        )
      )
  ) then
    raise exception 'A permissive tenant RLS bypass policy remains after cleanup';
  end if;
end
$migration_guard$;

-- G1 verified canonical QA replay step 21 20260807091341_reconcile_membership_rls_and_remove_permissive_bypasses.sql SOURCE_BLOB_SHA 4aa0d2137406845a799a734039014dddc4db8148
-- Reconcile the deployed membership policy chain with the private-helper model.
--
-- The original backend-only migration predates moving SECURITY DEFINER helpers
-- into app_private. Replaying that historical migration on a partially migrated
-- environment would recreate privileged helpers in public. This repair is
-- idempotent and only rebuilds policies against the already-hardened private
-- helper, then removes the observed permissive bypass policies.
--
-- Applied to the linked production project before publication because the
-- permissive membership policies were confirmed live. No rows are modified.


alter table public.organization_members enable row level security;

drop policy if exists "Members can view memberships" on public.organization_members;
drop policy if exists "Members can manage memberships" on public.organization_members;
drop policy if exists "Users can manage memberships" on public.organization_members;
drop policy if exists "Organization members can view memberships" on public.organization_members;
drop policy if exists "Organization members can manage memberships" on public.organization_members;
drop policy if exists "Owners can manage memberships" on public.organization_members;
drop policy if exists "Admins can manage memberships" on public.organization_members;

drop policy if exists "rls_organization_members_select_member" on public.organization_members;
drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;
drop policy if exists "rls_organization_members_insert_backend_only" on public.organization_members;
drop policy if exists "rls_organization_members_update_backend_only" on public.organization_members;
drop policy if exists "rls_organization_members_delete_backend_only" on public.organization_members;

create policy "rls_organization_members_select_member"
  on public.organization_members
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

create policy "rls_organization_members_insert_backend_only"
  on public.organization_members
  for insert
  to authenticated
  with check (false);

create policy "rls_organization_members_update_backend_only"
  on public.organization_members
  for update
  to authenticated
  using (false)
  with check (false);

create policy "rls_organization_members_delete_backend_only"
  on public.organization_members
  for delete
  to authenticated
  using (false);

drop policy if exists "Users can insert their own memberships" on public.organization_members;
drop policy if exists "Admins can add members" on public.organization_members;
drop policy if exists "Admins can update members" on public.organization_members;
drop policy if exists "Admins can remove members" on public.organization_members;

drop policy if exists "Authenticated can insert audit logs" on public.audit_logs;
drop policy if exists "Authenticated can read audit logs" on public.audit_logs;
drop policy if exists "Authenticated can read compliance tasks" on public.compliance_tasks;
drop policy if exists "Authenticated can write compliance tasks" on public.compliance_tasks;
drop policy if exists "Authenticated can read documents" on public.documents;
drop policy if exists "Authenticated can write documents" on public.documents;
drop policy if exists "Authenticated can read risks" on public.risks;
drop policy if exists "Authenticated can write risks" on public.risks;
drop policy if exists "Authenticated can read vendors" on public.vendors;
drop policy if exists "Authenticated can write vendors" on public.vendors;
drop policy if exists "Authenticated can read subscriptions" on public.subscriptions;
drop policy if exists "Authenticated can write subscriptions" on public.subscriptions;

-- Fail closed on the membership policy chain this reconciliation owns directly.
-- Other table-specific canonical policy families are reconciled by their own
-- forward-only migrations; this historical migration only removes their legacy
-- permissive bypasses. Asserting future policy names here makes clean replay
-- impossible even though the final state remains fail-closed.
do $migration_guard$
declare
  required_policy record;
begin
  for required_policy in
    select *
    from (values
      ('organization_members', 'rls_organization_members_select_member'),
      ('organization_members', 'rls_organization_members_insert_backend_only'),
      ('organization_members', 'rls_organization_members_update_backend_only'),
      ('organization_members', 'rls_organization_members_delete_backend_only')
    ) as expected(table_name, policy_name)
  loop
    if not exists (
      select 1
      from pg_catalog.pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = required_policy.table_name
        and policy.policyname = required_policy.policy_name
    ) then
      raise exception 'Required tenant-safe RLS policy %.% is missing',
        required_policy.table_name, required_policy.policy_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'public'
      and (
        (policy.tablename = 'organization_members'
          and policy.policyname in (
            'Users can insert their own memberships',
            'Admins can add members',
            'Admins can update members',
            'Admins can remove members'
          ))
        or policy.policyname in (
          'Authenticated can insert audit logs',
          'Authenticated can read audit logs',
          'Authenticated can read compliance tasks',
          'Authenticated can write compliance tasks',
          'Authenticated can read documents',
          'Authenticated can write documents',
          'Authenticated can read risks',
          'Authenticated can write risks',
          'Authenticated can read vendors',
          'Authenticated can write vendors',
          'Authenticated can read subscriptions',
          'Authenticated can write subscriptions'
        )
      )
  ) then
    raise exception 'A permissive tenant RLS bypass policy remains after cleanup';
  end if;
end
$migration_guard$;

notify pgrst, 'reload schema';

-- G1 verified canonical QA replay step 22 20260812160405_harden_security_definer_search_paths.sql SOURCE_BLOB_SHA 1deb46599425646bf1d0ea4f919c24de1ae57ae3
-- enterprise-migration-review: approved
-- Harden existing SECURITY DEFINER helpers so name resolution cannot be influenced
-- by mutable application or temporary schemas. Function bodies use schema-qualified
-- references, so pg_catalog alone is sufficient.
--
-- Clean-replay note: some historical creator migrations are absent from the
-- production migration ledger even though the corresponding functions exist in
-- the live runtime. Harden only signatures that actually exist, then fail closed
-- if any existing target is not pinned to pg_catalog.

do $security_definer_search_path_apply$
begin
  if to_regprocedure('app_private.is_org_member(uuid)') is not null then
    execute 'alter function app_private.is_org_member(uuid) set search_path = pg_catalog';
  end if;

  if to_regprocedure('app_private.has_org_role(uuid,text[])') is not null then
    execute 'alter function app_private.has_org_role(uuid, text[]) set search_path = pg_catalog';
  end if;

  if to_regprocedure('public.prevent_client_notification_scope_change()') is not null then
    execute 'alter function public.prevent_client_notification_scope_change() set search_path = pg_catalog';
  end if;
end
$security_definer_search_path_apply$;

do $security_definer_search_path_guard$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) in (
      ('app_private', 'is_org_member', 'target_organization_id uuid'),
      ('app_private', 'has_org_role', 'target_organization_id uuid, allowed_roles text[]'),
      ('public', 'prevent_client_notification_scope_change', '')
    )
      and coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=pg_catalog'
  ) then
    raise exception 'SECURITY DEFINER search_path hardening postcondition failed';
  end if;
end
$security_definer_search_path_guard$;

-- G1 verified canonical QA replay step 23 20260812164435_lock_stripe_events_processed_backend_only.sql SOURCE_BLOB_SHA 740e5ca6be924e6812443e6ce11ec28069c1a678
-- enterprise-migration-review: approved
-- The Stripe processing ledger is an internal webhook idempotency/recovery table.
-- All application access uses the server-side service role; client grants are unnecessary.
--
-- Clean-replay note: historical ledgers may contain this hardening migration before
-- the table creator is present. Harden only when the table exists; when it exists,
-- preserve the backend-only ACL and FORCE RLS postcondition.

do $stripe_events_processed_backend_only$
begin
  if to_regclass('public.stripe_events_processed') is not null then
    execute 'revoke all on table public.stripe_events_processed from public, anon, authenticated';
    execute 'alter table public.stripe_events_processed force row level security';

    if has_table_privilege('anon', 'public.stripe_events_processed', 'SELECT')
       or has_table_privilege('anon', 'public.stripe_events_processed', 'INSERT')
       or has_table_privilege('authenticated', 'public.stripe_events_processed', 'SELECT')
       or has_table_privilege('authenticated', 'public.stripe_events_processed', 'INSERT')
       or not has_table_privilege('service_role', 'public.stripe_events_processed', 'SELECT')
       or not has_table_privilege('service_role', 'public.stripe_events_processed', 'INSERT') then
      raise exception 'stripe_events_processed backend-only ACL postcondition failed';
    end if;
  end if;
end
$stripe_events_processed_backend_only$;

-- G1 verified canonical QA replay step 24 20260812213753_guard_enterprise_entitlement_snapshots_against_stale_observations.sql SOURCE_BLOB_SHA 48765f25c68880330f33233a2fc1f5c6aded3f24
-- enterprise-migration-review: approved
-- Historical clean-replay compatibility: the entitlement snapshot creator is not
-- guaranteed to exist in the production migration ledger. Keep the trigger
-- hardening fail-closed when the table exists, but do not abort when it is
-- legitimately absent from an isolated historical replay.

create or replace function public.reject_stale_enterprise_entitlement_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.organization_id::text || ':entitlement-reconcile', 0)
  );

  if exists (
    select 1
    from public.enterprise_entitlement_snapshots as existing
    where existing.organization_id = new.organization_id
      and existing.observed_at > new.observed_at
  ) then
    raise exception 'stale enterprise entitlement observation'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_stale_enterprise_entitlement_snapshot() from public, anon, authenticated;
grant execute on function public.reject_stale_enterprise_entitlement_snapshot() to service_role;

do $enterprise_entitlement_snapshot_trigger_apply$
begin
  if to_regclass('public.enterprise_entitlement_snapshots') is not null then
    execute 'drop trigger if exists enterprise_entitlement_snapshot_freshness_guard on public.enterprise_entitlement_snapshots';
    execute 'create trigger enterprise_entitlement_snapshot_freshness_guard before insert on public.enterprise_entitlement_snapshots for each row execute function public.reject_stale_enterprise_entitlement_snapshot()';
  end if;
end
$enterprise_entitlement_snapshot_trigger_apply$;

do $enterprise_entitlement_snapshot_trigger_guard$
begin
  if to_regclass('public.enterprise_entitlement_snapshots') is not null
     and not exists (
       select 1
       from pg_catalog.pg_trigger t
       join pg_catalog.pg_class c on c.oid = t.tgrelid
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'enterprise_entitlement_snapshots'
         and t.tgname = 'enterprise_entitlement_snapshot_freshness_guard'
         and not t.tgisinternal
     ) then
    raise exception 'enterprise entitlement snapshot freshness trigger postcondition failed';
  end if;
end
$enterprise_entitlement_snapshot_trigger_guard$;

-- G1 verified canonical QA replay step 25 20260812221912_reconcile_billing_lifecycle_requests_runtime.sql SOURCE_BLOB_SHA 29266a9a97b2647cb9fb96dec22164b1b4c76a0a
create table if not exists public.billing_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null,
  action text not null check (action in ('upgrade','downgrade','cancel','reactivate','replace_add_ons')),
  source_plan text,
  target_plan text,
  billing_interval text check (billing_interval in ('month','year')),
  add_ons jsonb not null default '[]'::jsonb,
  stripe_subscription_id text,
  stripe_request_id text,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
  failure_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists billing_lifecycle_requests_org_created_idx
  on public.billing_lifecycle_requests (organization_id, requested_at desc);

create unique index if not exists billing_lifecycle_requests_one_processing_idx
  on public.billing_lifecycle_requests (organization_id)
  where status in ('pending','processing');

create index if not exists billing_lifecycle_requests_org_request_idx
  on public.billing_lifecycle_requests (organization_id, stripe_request_id, requested_at desc)
  where stripe_request_id is not null;

alter table public.billing_lifecycle_requests enable row level security;
alter table public.billing_lifecycle_requests force row level security;

revoke all on public.billing_lifecycle_requests from public, anon, authenticated;
grant all on public.billing_lifecycle_requests to service_role;

comment on table public.billing_lifecycle_requests is
  'Append-oriented operational evidence for Stripe subscription lifecycle mutations. Browser clients have no direct access.';

do $$
declare
  rls_enabled boolean;
  force_rls boolean;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, force_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'billing_lifecycle_requests'
    and c.relkind in ('r','p');

  if rls_enabled is distinct from true or force_rls is distinct from true then
    raise exception 'billing lifecycle ledger RLS hardening verification failed';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.billing_lifecycle_requests', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.billing_lifecycle_requests', 'INSERT')
     or pg_catalog.has_table_privilege('anon', 'public.billing_lifecycle_requests', 'UPDATE')
     or pg_catalog.has_table_privilege('anon', 'public.billing_lifecycle_requests', 'DELETE')
     or pg_catalog.has_table_privilege('authenticated', 'public.billing_lifecycle_requests', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.billing_lifecycle_requests', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.billing_lifecycle_requests', 'UPDATE')
     or pg_catalog.has_table_privilege('authenticated', 'public.billing_lifecycle_requests', 'DELETE') then
    raise exception 'billing lifecycle ledger client grants verification failed';
  end if;

  if not pg_catalog.has_table_privilege('service_role', 'public.billing_lifecycle_requests', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'billing lifecycle ledger service role grants verification failed';
  end if;
end $$;

-- G1 verified canonical QA replay step 26 20260812224650_tighten_permissions_catalog_authenticated_grants.sql SOURCE_BLOB_SHA 220514e30fbaea3f85340b018dfb9b24ae93179c


alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;

revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;

grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;

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

-- G1 verified canonical QA replay step 27 20260812225906_consolidate_canonical_rls_and_client_grants.sql SOURCE_BLOB_SHA 2636809f1c8824b859ce021bf42095db46a5135a


-- Historical clean-replay compatibility.
-- Several creator migrations for these evolved runtime tables are not represented
-- in the production migration ledger. Harden every object that exists and keep
-- its canonical policy/grant postconditions fail-closed; legitimately absent
-- objects are left for the later forward-reconciliation chain.
do $canonical_rls_apply$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'subscriptions',
    'monitoring_preferences',
    'notifications',
    'onboarding_activation_runs',
    'ai_systems',
    'audit_events',
    'audit_logs',
    'invitations',
    'regulatory_updates',
    'organization_members',
    'organizations'
  ] loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('alter table public.%I force row level security', target_table);
    end if;
  end loop;

  for target_table, policy_name in
    select * from (values
      ('subscriptions','Owners can manage subscriptions'),
      ('subscriptions','Members can view subscriptions'),
      ('monitoring_preferences','live_rls_monitoring_preferences_delete_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_insert_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_select_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_update_member'),
      ('notifications','live_rls_notifications_delete_member'),
      ('notifications','live_rls_notifications_insert_member'),
      ('notifications','live_rls_notifications_select_member'),
      ('notifications','live_rls_notifications_update_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_delete_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_insert_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_select_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_update_member'),
      ('ai_systems','Owners and admins can delete AI systems'),
      ('ai_systems','Editors can insert AI systems'),
      ('ai_systems','Members can read AI systems'),
      ('ai_systems','Editors can update AI systems'),
      ('audit_events','live_rls_audit_events_delete_deny'),
      ('audit_events','live_rls_audit_events_insert_deny'),
      ('audit_events','live_rls_audit_events_select_member'),
      ('audit_events','live_rls_audit_events_update_deny'),
      ('audit_logs','Members can view audit logs'),
      ('invitations','live_rls_invitations_delete_deny'),
      ('invitations','live_rls_invitations_insert_deny'),
      ('invitations','live_rls_invitations_select_member'),
      ('invitations','live_rls_invitations_update_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_delete_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_insert_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_select_authenticated'),
      ('regulatory_updates','live_rls_regulatory_updates_update_deny'),
      ('organization_members','Users can view their memberships'),
      ('organizations','Users can view their organizations')
    ) as legacy(table_name, policy_name)
  loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end if;
  end loop;

  if to_regclass('public.subscriptions') is not null then
    execute 'revoke all on table public.subscriptions from PUBLIC, anon, authenticated';
    execute 'grant select on table public.subscriptions to authenticated';
  end if;

  if to_regclass('public.monitoring_preferences') is not null then
    execute 'revoke all on table public.monitoring_preferences from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.monitoring_preferences to authenticated';
  end if;

  if to_regclass('public.notifications') is not null then
    execute 'revoke all on table public.notifications from PUBLIC, anon, authenticated';
    execute 'grant select, update, delete on table public.notifications to authenticated';
  end if;

  if to_regclass('public.onboarding_activation_runs') is not null then
    execute 'revoke all on table public.onboarding_activation_runs from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.onboarding_activation_runs to authenticated';
  end if;

  if to_regclass('public.ai_systems') is not null then
    execute 'revoke all on table public.ai_systems from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.ai_systems to authenticated';
  end if;

  if to_regclass('public.audit_events') is not null then
    execute 'revoke all on table public.audit_events from PUBLIC, anon, authenticated';
    execute 'grant select on table public.audit_events to authenticated';
  end if;

  if to_regclass('public.audit_logs') is not null then
    execute 'revoke all on table public.audit_logs from PUBLIC, anon, authenticated';
    execute 'grant select on table public.audit_logs to authenticated';
  end if;

  if to_regclass('public.invitations') is not null then
    execute 'revoke all on table public.invitations from PUBLIC, anon, authenticated';
    execute 'grant select on table public.invitations to authenticated';
  end if;

  if to_regclass('public.regulatory_updates') is not null then
    execute 'revoke all on table public.regulatory_updates from PUBLIC, anon, authenticated';
    execute 'grant select on table public.regulatory_updates to authenticated';
  end if;

  if to_regclass('public.organization_members') is not null then
    execute 'revoke all on table public.organization_members from PUBLIC, anon, authenticated';
    execute 'grant select on table public.organization_members to authenticated';
  end if;

  if to_regclass('public.organizations') is not null then
    execute 'revoke all on table public.organizations from PUBLIC, anon, authenticated';
    execute 'grant select, update on table public.organizations to authenticated';
  end if;
end
$canonical_rls_apply$;

-- Fail closed for every object that actually exists at this historical replay point.
-- A table whose canonical policy catalog is still completely unmaterialized (0/N)
-- is a legitimate historical state; once any canonical policy exists, the entire
-- table-specific catalog must be complete, otherwise replay fails closed.
do $canonical_rls_guard$
declare
  missing_policy_count integer;
  legacy_policy_count integer;
  unexpected_grant_count integer;
begin
  select count(*) into legacy_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'subscriptions' and policyname in ('Owners can manage subscriptions','Members can view subscriptions'))
      or policyname like 'live_rls_monitoring_preferences_%'
      or policyname like 'live_rls_notifications_%'
      or policyname like 'live_rls_onboarding_activation_runs_%'
      or (tablename = 'ai_systems' and policyname in ('Owners and admins can delete AI systems','Editors can insert AI systems','Members can read AI systems','Editors can update AI systems'))
      or policyname like 'live_rls_audit_events_%'
      or (tablename = 'audit_logs' and policyname = 'Members can view audit logs')
      or policyname like 'live_rls_invitations_%'
      or policyname like 'live_rls_regulatory_updates_%'
      or (tablename = 'organization_members' and policyname = 'Users can view their memberships')
      or (tablename = 'organizations' and policyname = 'Users can view their organizations')
    );
  if legacy_policy_count <> 0 then
    raise exception 'legacy permissive policies survived canonical RLS consolidation: %', legacy_policy_count;
  end if;

  with required(tablename, policyname) as (
    values
      ('subscriptions','rls_subscriptions_select_member'),
      ('subscriptions','rls_subscriptions_insert_backend_only'),
      ('subscriptions','rls_subscriptions_update_backend_only'),
      ('subscriptions','rls_subscriptions_delete_backend_only'),
      ('monitoring_preferences','rls_monitoring_preferences_select_member_or_owner'),
      ('monitoring_preferences','rls_monitoring_preferences_insert_self_or_admin'),
      ('monitoring_preferences','rls_monitoring_preferences_update_self_or_admin'),
      ('monitoring_preferences','rls_monitoring_preferences_delete_self_or_admin'),
      ('notifications','rls_notifications_select_recipient'),
      ('notifications','rls_notifications_insert_backend_only'),
      ('notifications','rls_notifications_update_recipient'),
      ('notifications','rls_notifications_delete_recipient'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_select_member'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_insert_writer'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_update_writer'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_delete_admin'),
      ('ai_systems','rls_ai_systems_select_member'),
      ('ai_systems','rls_ai_systems_insert_writer'),
      ('ai_systems','rls_ai_systems_update_writer'),
      ('ai_systems','rls_ai_systems_delete_admin'),
      ('audit_events','rls_audit_events_select_member'),
      ('audit_events','rls_audit_events_insert_backend_only'),
      ('audit_events','rls_audit_events_update_backend_only'),
      ('audit_events','rls_audit_events_delete_backend_only'),
      ('audit_logs','rls_audit_logs_select_member'),
      ('audit_logs','rls_audit_logs_insert_backend_only'),
      ('audit_logs','rls_audit_logs_update_backend_only'),
      ('audit_logs','rls_audit_logs_delete_backend_only'),
      ('invitations','rls_invitations_select_member'),
      ('invitations','rls_invitations_insert_backend_only'),
      ('invitations','rls_invitations_update_backend_only'),
      ('invitations','rls_invitations_delete_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_select_authenticated'),
      ('regulatory_updates','rls_regulatory_updates_insert_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_update_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_delete_backend_only'),
      ('organization_members','rls_organization_members_select_member'),
      ('organization_members','rls_organization_members_insert_backend_only'),
      ('organization_members','rls_organization_members_update_backend_only'),
      ('organization_members','rls_organization_members_delete_backend_only'),
      ('organizations','Members can view organizations'),
      ('organizations','Owners can update organizations')
  ), materialized as (
    select distinct r.tablename
    from required r
    join pg_policies p
      on p.schemaname='public'
     and p.tablename=r.tablename
     and p.policyname=r.policyname
  )
  select count(*) into missing_policy_count
  from required r
  join materialized m on m.tablename=r.tablename
  where to_regclass(format('public.%I', r.tablename)) is not null
    and not exists (
      select 1 from pg_policies p
      where p.schemaname='public' and p.tablename=r.tablename and p.policyname=r.policyname
    );
  if missing_policy_count <> 0 then
    raise exception 'canonical RLS policy missing after partial materialization: %', missing_policy_count;
  end if;

  select count(*) into unexpected_grant_count
  from information_schema.table_privileges p
  where p.table_schema='public'
    and p.table_name in ('subscriptions','monitoring_preferences','notifications','onboarding_activation_runs','ai_systems','audit_events','audit_logs','invitations','regulatory_updates','organization_members','organizations')
    and p.grantee in ('PUBLIC','anon','authenticated')
    and not (
      p.grantee='authenticated' and (
        (p.table_name in ('subscriptions','audit_events','audit_logs','invitations','regulatory_updates','organization_members') and p.privilege_type='SELECT')
        or (p.table_name='notifications' and p.privilege_type in ('SELECT','UPDATE','DELETE'))
        or (p.table_name in ('monitoring_preferences','onboarding_activation_runs','ai_systems') and p.privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))
        or (p.table_name='organizations' and p.privilege_type in ('SELECT','UPDATE'))
      )
    );
  if unexpected_grant_count <> 0 then
    raise exception 'unexpected client table privileges survived canonical RLS consolidation: %', unexpected_grant_count;
  end if;
end
$canonical_rls_guard$;

-- G1 MANDATORY TRANSACTION ABORT: QA regression only / DO NOT COMMIT
ROLLBACK;
