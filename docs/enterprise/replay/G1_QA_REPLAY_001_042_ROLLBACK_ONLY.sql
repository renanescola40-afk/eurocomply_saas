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

-- G1 source step 28 20260812230229_optimize_ai_incidents_rls_and_deduplicate_ai_systems_index.sql blob 69d38cce42fe3c8081f9fcc28607f837f8e345be


-- Historical clean-replay compatibility: creator migrations for these evolved
-- tables are not guaranteed to be represented in the production ledger. Harden
-- every object that exists; preserve fail-closed policy/grant verification for it.
do $ai_runtime_hardening_apply$
begin
  if to_regclass('public.ai_incidents') is not null then
    execute 'alter table public.ai_incidents enable row level security';
    execute 'alter table public.ai_incidents force row level security';

    execute 'drop policy if exists "Organization members can insert ai incidents" on public.ai_incidents';
    execute 'drop policy if exists "Organization members can read ai incidents" on public.ai_incidents';
    execute 'drop policy if exists "Organization members can update ai incidents" on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_insert_member on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_select_member on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_update_member on public.ai_incidents';

    execute $policy$
      create policy rls_ai_incidents_select_member
        on public.ai_incidents
        for select
        to authenticated
        using (app_private.is_org_member(organization_id))
    $policy$;

    execute $policy$
      create policy rls_ai_incidents_insert_member
        on public.ai_incidents
        for insert
        to authenticated
        with check (app_private.is_org_member(organization_id))
    $policy$;

    execute $policy$
      create policy rls_ai_incidents_update_member
        on public.ai_incidents
        for update
        to authenticated
        using (app_private.is_org_member(organization_id))
        with check (app_private.is_org_member(organization_id))
    $policy$;

    execute 'revoke all on table public.ai_incidents from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update on table public.ai_incidents to authenticated';
  end if;

  if to_regclass('public.regulatory_updates') is not null then
    execute 'drop policy if exists rls_regulatory_updates_select_authenticated on public.regulatory_updates';
    execute $policy$
      create policy rls_regulatory_updates_select_authenticated
        on public.regulatory_updates
        for select
        to authenticated
        using ((select auth.uid()) is not null)
    $policy$;
  end if;

  -- DROP INDEX IF EXISTS is replay-safe even when the parent table is absent.
  drop index if exists public.ai_systems_org_created_idx;
end
$ai_runtime_hardening_apply$;

do $ai_runtime_hardening_guard$
declare
  unexpected_grants integer;
  duplicate_indexes integer;
begin
  if to_regclass('public.ai_incidents') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='ai_incidents'
        and policyname='rls_ai_incidents_select_member' and cmd='SELECT'
        and roles = array['authenticated']::name[]
    ) then
      raise exception 'canonical ai_incidents SELECT policy missing';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='ai_incidents'
        and policyname='rls_ai_incidents_insert_member' and cmd='INSERT'
        and roles = array['authenticated']::name[]
    ) then
      raise exception 'canonical ai_incidents INSERT policy missing';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='ai_incidents'
        and policyname='rls_ai_incidents_update_member' and cmd='UPDATE'
        and roles = array['authenticated']::name[]
    ) then
      raise exception 'canonical ai_incidents UPDATE policy missing';
    end if;

    select count(*) into unexpected_grants
    from information_schema.table_privileges
    where table_schema='public' and table_name='ai_incidents'
      and grantee in ('PUBLIC','anon','authenticated')
      and not (grantee='authenticated' and privilege_type in ('SELECT','INSERT','UPDATE'));
    if unexpected_grants <> 0 then
      raise exception 'unexpected ai_incidents client grants survived: %', unexpected_grants;
    end if;
  end if;

  if to_regclass('public.regulatory_updates') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname='public' and tablename='regulatory_updates'
         and policyname='rls_regulatory_updates_select_authenticated'
         and cmd='SELECT'
         and roles = array['authenticated']::name[]
     ) then
    raise exception 'canonical regulatory_updates SELECT policy missing';
  end if;

  if to_regclass('public.ai_systems') is not null then
    select count(*) into duplicate_indexes
    from pg_indexes
    where schemaname='public' and tablename='ai_systems'
      and indexname in ('ai_systems_org_created_at_idx','ai_systems_org_created_idx');
    if duplicate_indexes <> 1 then
      raise exception 'ai_systems created-at duplicate index reconciliation failed: %', duplicate_indexes;
    end if;
  end if;
end
$ai_runtime_hardening_guard$;


-- G1 source step 29 20260812230541_add_missing_foreign_key_covering_indexes.sql blob 3acc203840ae224bbe2bc44bfe44950b077dc988


-- Historical clean-replay compatibility: create each advisor-backed covering
-- index only when both its base table and every target column exist at this
-- replay point. Historical lineages may contain an earlier table shape without
-- the later FK column; those shapes are intentionally skipped here and are
-- reconciled by the later forward migrations. Whenever a target is applicable,
-- index creation remains fail-closed.
do $fk_covering_indexes_apply$
declare
  v_index_name text;
  v_table_name text;
  v_target_columns text[];
  v_create_sql text;
  v_missing_columns integer;
begin
  for v_index_name, v_table_name, v_target_columns, v_create_sql in
    select * from (values
      ('idx_ai_assessments_ai_system_fk','ai_assessments',array['ai_system_id']::text[],'create index if not exists idx_ai_assessments_ai_system_fk on public.ai_assessments (ai_system_id)'),
      ('idx_ai_assessments_created_by_fk','ai_assessments',array['created_by']::text[],'create index if not exists idx_ai_assessments_created_by_fk on public.ai_assessments (created_by)'),
      ('idx_ai_incidents_ai_system_fk','ai_incidents',array['ai_system_id']::text[],'create index if not exists idx_ai_incidents_ai_system_fk on public.ai_incidents (ai_system_id)'),
      ('idx_ai_incidents_created_by_fk','ai_incidents',array['created_by']::text[],'create index if not exists idx_ai_incidents_created_by_fk on public.ai_incidents (created_by)'),
      ('idx_audit_logs_actor_fk','audit_logs',array['actor_id']::text[],'create index if not exists idx_audit_logs_actor_fk on public.audit_logs (actor_id)'),
      ('idx_audit_logs_user_fk','audit_logs',array['user_id']::text[],'create index if not exists idx_audit_logs_user_fk on public.audit_logs (user_id)'),
      ('idx_metric_snapshots_org_fk','compliance_metric_snapshots',array['organization_id']::text[],'create index if not exists idx_metric_snapshots_org_fk on public.compliance_metric_snapshots (organization_id)'),
      ('idx_compliance_tasks_assigned_fk','compliance_tasks',array['assigned_to']::text[],'create index if not exists idx_compliance_tasks_assigned_fk on public.compliance_tasks (assigned_to)'),
      ('idx_compliance_tasks_created_by_fk','compliance_tasks',array['created_by']::text[],'create index if not exists idx_compliance_tasks_created_by_fk on public.compliance_tasks (created_by)'),
      ('idx_documents_created_by_fk','documents',array['created_by']::text[],'create index if not exists idx_documents_created_by_fk on public.documents (created_by)'),
      ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events',array['actor_user_id']::text[],'create index if not exists idx_ent_recon_events_actor_fk on public.enterprise_entitlement_reconciliation_events (actor_user_id)'),
      ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots',array['source_id','organization_id']::text[],'create index if not exists idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (source_id, organization_id)'),
      ('idx_seat_events_actor_fk','enterprise_seat_events',array['actor_user_id']::text[],'create index if not exists idx_seat_events_actor_fk on public.enterprise_seat_events (actor_user_id)'),
      ('idx_seat_events_reservation_fk','enterprise_seat_events',array['reservation_id']::text[],'create index if not exists idx_seat_events_reservation_fk on public.enterprise_seat_events (reservation_id)'),
      ('idx_seat_policies_updated_by_fk','enterprise_seat_policies',array['updated_by']::text[],'create index if not exists idx_seat_policies_updated_by_fk on public.enterprise_seat_policies (updated_by)'),
      ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations',array['reserved_by']::text[],'create index if not exists idx_seat_reservations_reserved_by_fk on public.enterprise_seat_reservations (reserved_by)'),
      ('idx_invitations_invited_by_fk','invitations',array['invited_by']::text[],'create index if not exists idx_invitations_invited_by_fk on public.invitations (invited_by)'),
      ('idx_monitoring_preferences_user_fk','monitoring_preferences',array['user_id']::text[],'create index if not exists idx_monitoring_preferences_user_fk on public.monitoring_preferences (user_id)'),
      ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs',array['created_by']::text[],'create index if not exists idx_onboarding_runs_created_by_fk on public.onboarding_activation_runs (created_by)'),
      ('idx_org_members_user_fk','organization_members',array['user_id']::text[],'create index if not exists idx_org_members_user_fk on public.organization_members (user_id)'),
      ('idx_organizations_created_by_fk','organizations',array['created_by']::text[],'create index if not exists idx_organizations_created_by_fk on public.organizations (created_by)'),
      ('idx_organizations_owner_fk','organizations',array['owner_id']::text[],'create index if not exists idx_organizations_owner_fk on public.organizations (owner_id)'),
      ('idx_risks_created_by_fk','risks',array['created_by']::text[],'create index if not exists idx_risks_created_by_fk on public.risks (created_by)'),
      ('idx_risks_owner_fk','risks',array['owner_id']::text[],'create index if not exists idx_risks_owner_fk on public.risks (owner_id)'),
      ('idx_role_permissions_permission_fk','role_permissions',array['permission_key']::text[],'create index if not exists idx_role_permissions_permission_fk on public.role_permissions (permission_key)'),
      ('idx_vendors_created_by_fk','vendors',array['created_by']::text[],'create index if not exists idx_vendors_created_by_fk on public.vendors (created_by)'),
      ('idx_vendors_owner_fk','vendors',array['owner_id']::text[],'create index if not exists idx_vendors_owner_fk on public.vendors (owner_id)')
    ) as expected(index_name, table_name, target_columns, create_sql)
  loop
    if to_regclass(format('public.%I', v_table_name)) is not null then
      select count(*) into v_missing_columns
      from unnest(v_target_columns) as required_column(column_name)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = v_table_name
          and c.column_name = required_column.column_name
      );

      if v_missing_columns = 0 then
        execute v_create_sql;
      end if;
    end if;
  end loop;
end
$fk_covering_indexes_apply$;

do $fk_covering_indexes_guard$
declare
  missing integer := 0;
  required record;
  missing_columns integer;
begin
  for required in
    select * from (values
      ('idx_ai_assessments_ai_system_fk','ai_assessments',array['ai_system_id']::text[]),
      ('idx_ai_assessments_created_by_fk','ai_assessments',array['created_by']::text[]),
      ('idx_ai_incidents_ai_system_fk','ai_incidents',array['ai_system_id']::text[]),
      ('idx_ai_incidents_created_by_fk','ai_incidents',array['created_by']::text[]),
      ('idx_audit_logs_actor_fk','audit_logs',array['actor_id']::text[]),
      ('idx_audit_logs_user_fk','audit_logs',array['user_id']::text[]),
      ('idx_metric_snapshots_org_fk','compliance_metric_snapshots',array['organization_id']::text[]),
      ('idx_compliance_tasks_assigned_fk','compliance_tasks',array['assigned_to']::text[]),
      ('idx_compliance_tasks_created_by_fk','compliance_tasks',array['created_by']::text[]),
      ('idx_documents_created_by_fk','documents',array['created_by']::text[]),
      ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events',array['actor_user_id']::text[]),
      ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots',array['source_id','organization_id']::text[]),
      ('idx_seat_events_actor_fk','enterprise_seat_events',array['actor_user_id']::text[]),
      ('idx_seat_events_reservation_fk','enterprise_seat_events',array['reservation_id']::text[]),
      ('idx_seat_policies_updated_by_fk','enterprise_seat_policies',array['updated_by']::text[]),
      ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations',array['reserved_by']::text[]),
      ('idx_invitations_invited_by_fk','invitations',array['invited_by']::text[]),
      ('idx_monitoring_preferences_user_fk','monitoring_preferences',array['user_id']::text[]),
      ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs',array['created_by']::text[]),
      ('idx_org_members_user_fk','organization_members',array['user_id']::text[]),
      ('idx_organizations_created_by_fk','organizations',array['created_by']::text[]),
      ('idx_organizations_owner_fk','organizations',array['owner_id']::text[]),
      ('idx_risks_created_by_fk','risks',array['created_by']::text[]),
      ('idx_risks_owner_fk','risks',array['owner_id']::text[]),
      ('idx_role_permissions_permission_fk','role_permissions',array['permission_key']::text[]),
      ('idx_vendors_created_by_fk','vendors',array['created_by']::text[]),
      ('idx_vendors_owner_fk','vendors',array['owner_id']::text[])
    ) as expected(index_name, table_name, target_columns)
  loop
    if to_regclass(format('public.%I', required.table_name)) is not null then
      select count(*) into missing_columns
      from unnest(required.target_columns) as required_column(column_name)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = required.table_name
          and c.column_name = required_column.column_name
      );

      if missing_columns = 0
        and to_regclass('public.' || required.index_name) is null then
        missing := missing + 1;
      end if;
    end if;
  end loop;

  if missing <> 0 then
    raise exception 'missing required foreign-key covering indexes after reconciliation: %', missing;
  end if;
end
$fk_covering_indexes_guard$;


-- G1 source step 30 20260812230911_tighten_monitoring_preferences_horizontal_read_isolation.sql blob 4378394c1bf3940462513f9fc5b23d1c57cd6841


-- Historical clean-replay compatibility: the monitoring_preferences creator is
-- not guaranteed to exist in the production migration ledger. When the table
-- exists, retain the self/admin policy and fail-closed verification unchanged.
do $monitoring_preferences_policy_apply$
begin
  if to_regclass('public.monitoring_preferences') is not null then
    execute 'alter table public.monitoring_preferences enable row level security';
    execute 'alter table public.monitoring_preferences force row level security';

    execute 'drop policy if exists rls_monitoring_preferences_select_member_or_owner on public.monitoring_preferences';
    execute 'drop policy if exists rls_monitoring_preferences_select_self_or_admin on public.monitoring_preferences';

    execute $policy$
      create policy rls_monitoring_preferences_select_self_or_admin
        on public.monitoring_preferences
        for select
        to authenticated
        using (
          app_private.is_org_member(organization_id)
          and (
            current_app_user_matches(user_id)
            or app_private.has_org_role(organization_id, array['owner','admin']::text[])
          )
        )
    $policy$;
  end if;
end
$monitoring_preferences_policy_apply$;

do $monitoring_preferences_policy_guard$
begin
  if to_regclass('public.monitoring_preferences') is not null then
    if exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='monitoring_preferences'
        and policyname='rls_monitoring_preferences_select_member_or_owner'
    ) then
      raise exception 'legacy member-wide monitoring preferences SELECT policy survived';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='monitoring_preferences'
        and policyname='rls_monitoring_preferences_select_self_or_admin'
        and cmd='SELECT'
        and roles = array['authenticated']::name[]
    ) then
      raise exception 'self/admin monitoring preferences SELECT policy missing';
    end if;
  end if;
end
$monitoring_preferences_policy_guard$;


-- G1 source step 31 20260813102900_add_durable_billing_lifecycle_replay_contract.sql blob 848191f037b4731bcb8d6d574a6ffee8785e528f
alter table public.billing_lifecycle_requests
  add column if not exists request_fingerprint text,
  add column if not exists result_snapshot jsonb;

create unique index if not exists billing_lifecycle_requests_org_request_unique_idx
  on public.billing_lifecycle_requests (organization_id, stripe_request_id)
  where stripe_request_id is not null;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_request_digest_format,
  add constraint billing_lifecycle_requests_request_digest_format
    check (stripe_request_id is null or stripe_request_id ~ '^[0-9a-f]{64}$') not valid;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_request_fingerprint_format,
  add constraint billing_lifecycle_requests_request_fingerprint_format
    check (request_fingerprint is null or request_fingerprint ~ '^[0-9a-f]{64}$') not valid;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_result_snapshot_shape,
  add constraint billing_lifecycle_requests_result_snapshot_shape
    check (
      result_snapshot is null or (
        jsonb_typeof(result_snapshot) = 'object'
        and jsonb_typeof(result_snapshot->'subscriptionId') = 'string'
        and length(result_snapshot->>'subscriptionId') between 1 and 255
        and jsonb_typeof(result_snapshot->'status') = 'string'
        and length(result_snapshot->>'status') between 1 and 64
        and jsonb_typeof(result_snapshot->'cancelAtPeriodEnd') = 'boolean'
        and (
          result_snapshot->'currentPeriodEnd' = 'null'::jsonb
          or (
            jsonb_typeof(result_snapshot->'currentPeriodEnd') = 'number'
            and (result_snapshot->>'currentPeriodEnd')::numeric > 0
          )
        )
        and (result_snapshot->>'plan') in ('starter','professional','business','enterprise')
        and (result_snapshot->>'interval') in ('month','year')
        and jsonb_typeof(result_snapshot->'addOns') = 'array'
      )
    ) not valid;

alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_request_digest_format;
alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_request_fingerprint_format;
alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_result_snapshot_shape;

comment on column public.billing_lifecycle_requests.request_fingerprint is
  'SHA-256 fingerprint of the original lifecycle mutation intent; new runtimes require it for replay identity.';
comment on column public.billing_lifecycle_requests.result_snapshot is
  'Sanitized Stripe lifecycle result persisted after provider success and reused for durable audit/completion replay.';


-- G1 source step 32 20260813102951_harden_remaining_public_security_definer_search_paths.sql blob d174618375ccd5f21e355cac7877ba788080b794
-- Historical clean-replay compatibility: creator migrations for these helpers
-- are not guaranteed to exist in the production migration ledger. Harden each
-- existing signature and keep ACL/search_path verification fail-closed for it.
do $remaining_security_definer_apply$
begin
  if to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') is not null then
    execute 'alter function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text) set search_path = pg_catalog';
  end if;

  if to_regprocedure('public.apply_enterprise_entitlement_snapshot_atomic(uuid,uuid,text,bigint,text,integer,integer,integer,jsonb,text,timestamptz,timestamptz,timestamptz,uuid)') is not null then
    execute 'alter function public.apply_enterprise_entitlement_snapshot_atomic(uuid, uuid, text, bigint, text, integer, integer, integer, jsonb, text, timestamptz, timestamptz, timestamptz, uuid) set search_path = pg_catalog';
  end if;

  if to_regprocedure('public.consume_enterprise_seat_reservation_atomic(uuid,uuid,uuid,bigint,uuid)') is not null then
    execute 'alter function public.consume_enterprise_seat_reservation_atomic(uuid, uuid, uuid, bigint, uuid) set search_path = pg_catalog';
  end if;

  if to_regprocedure('public.reserve_enterprise_seat_atomic(uuid,text,text,bigint,uuid,uuid,text,integer)') is not null then
    execute 'alter function public.reserve_enterprise_seat_atomic(uuid, text, text, bigint, uuid, uuid, text, integer) set search_path = pg_catalog';
  end if;
end
$remaining_security_definer_apply$;

do $remaining_security_definer_guard$
declare
  bad_search_path integer;
  exposed_execute integer;
  missing_service_role integer;
begin
  select count(*) into bad_search_path
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and not ('search_path=pg_catalog' = any(coalesce(p.proconfig, array[]::text[])));
  if bad_search_path <> 0 then raise exception 'security definer search_path hardening verification failed'; end if;

  select count(*) into exposed_execute
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and (pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') or pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if exposed_execute <> 0 then raise exception 'security definer client execute boundary verification failed'; end if;

  select count(*) into missing_service_role
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and not pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE');
  if missing_service_role <> 0 then raise exception 'security definer service role execute boundary verification failed'; end if;
end
$remaining_security_definer_guard$;


-- G1 source step 33 20260813124224_reconcile_organization_add_ons.sql blob 5033185fc5e33105e03ba48696e45357154303dc


create extension if not exists pgcrypto;

create table if not exists public.organization_add_ons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  add_on_id text not null,
  status text not null default 'inactive',
  stripe_subscription_item_id text,
  stripe_price_id text,
  quantity integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_add_ons_status_check check (status in ('inactive', 'active', 'trialing', 'past_due', 'cancelled')),
  constraint organization_add_ons_quantity_check check (quantity > 0),
  constraint organization_add_ons_unique_org_addon unique (organization_id, add_on_id)
);

create index if not exists organization_add_ons_org_status_idx on public.organization_add_ons (organization_id, status);
create index if not exists organization_add_ons_stripe_subscription_item_idx on public.organization_add_ons (stripe_subscription_item_id) where stripe_subscription_item_id is not null;

alter table public.organization_add_ons enable row level security;
alter table public.organization_add_ons force row level security;

drop policy if exists "organization members can read add-ons" on public.organization_add_ons;
create policy "organization members can read add-ons" on public.organization_add_ons for select to authenticated using (
  exists (
    select 1 from public.organization_members members
    where members.organization_id = organization_add_ons.organization_id
      and members.user_id = auth.uid()
  )
);

revoke all on table public.organization_add_ons from anon;
revoke insert, update, delete, truncate, references, trigger on table public.organization_add_ons from authenticated;
grant select on table public.organization_add_ons to authenticated;
grant all on table public.organization_add_ons to service_role;

create or replace function public.touch_organization_add_on_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$function$;

revoke all on function public.touch_organization_add_on_updated_at() from public;
revoke all on function public.touch_organization_add_on_updated_at() from anon;
revoke all on function public.touch_organization_add_on_updated_at() from authenticated;
grant execute on function public.touch_organization_add_on_updated_at() to service_role;

drop trigger if exists organization_add_ons_set_updated_at on public.organization_add_ons;
create trigger organization_add_ons_set_updated_at before update on public.organization_add_ons for each row execute function public.touch_organization_add_on_updated_at();

comment on table public.organization_add_ons is 'Canonical organization-scoped Stripe add-on state. Browser writes are denied; service-role billing flows own mutations.';


-- G1 source step 34 20260822120617_atomic_vendor_risk_quota_mutations.sql blob 1fde4a94844589874a28c9ca4b8b18d5ce0384ae


-- P0 commercial entitlement integrity.
--
-- Vendor/risk create and delete operations change commercial quota usage. The
-- application resolves the authoritative paid-plan capacity, while this
-- service-role-only RPC serializes the final quota decision, mutation and audit
-- persistence in one PostgreSQL transaction.
--
-- It deliberately uses the exact organization advisory-lock key used by
-- append_audit_event_chained. That makes create/delete, audit ordering and
-- compensating audit failures one serialized database authority instead of
-- separate application requests.
--
-- Repository migration presence is not evidence that production applied it.

create or replace function public.mutate_commercial_resource_with_audit_atomic(
  p_resource_type text,
  p_operation text,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_entity_id uuid,
  p_payload jsonb,
  p_max_count integer,
  p_expected_review_version integer,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table (
  outcome text,
  resource_record jsonb,
  current_count integer,
  max_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous_hash text;
  v_count integer := 0;
  v_record jsonb;
  v_review_status text;
begin
  if p_resource_type not in ('vendor', 'risk')
    or p_operation not in ('create', 'delete')
    or p_organization_id is null
    or p_actor_user_id is null
    or p_entity_id is null
    or p_audit_id is null
    or p_audit_created_at is null
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or (p_hash_signature is not null and p_hash_signature !~ '^[0-9a-f]{64}$')
    or (p_operation = 'create' and (p_payload is null or jsonb_typeof(p_payload) <> 'object'))
    or (p_operation = 'create' and p_max_count is not null and p_max_count < 0)
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  if p_operation = 'create' and p_resource_type = 'vendor'
    and nullif(trim(coalesce(p_payload ->> 'name', '')), '') is null
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  if p_operation = 'create' and p_resource_type = 'risk'
    and (
      nullif(trim(coalesce(p_payload ->> 'title', '')), '') is null
      or coalesce(p_payload ->> 'likelihood', '') !~ '^[1-5]$'
      or coalesce(p_payload ->> 'impact', '') !~ '^[1-5]$'
    )
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  -- Same key as append_audit_event_chained: all organization-scoped audit
  -- appends and quota-changing mutations are serialized for this transaction.
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select ae.event_hash into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  if coalesce(v_previous_hash, '') <> coalesce(p_previous_hash, '') then
    raise exception 'audit chain previous hash mismatch' using errcode = '40001';
  end if;

  if p_operation = 'create' and p_resource_type = 'vendor' then
    select count(*)::integer into v_count
    from public.vendors
    where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    v_review_status := coalesce(nullif(trim(p_payload ->> 'review_status'), ''), 'pending');

    insert into public.vendors (
      id,
      organization_id,
      created_by,
      name,
      website,
      country,
      category,
      data_access_level,
      risk_level,
      review_status,
      dpa_signed,
      last_reviewed_at,
      next_review_at,
      approved_at,
      approved_by
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      trim(p_payload ->> 'name'),
      nullif(trim(coalesce(p_payload ->> 'website', '')), ''),
      nullif(trim(coalesce(p_payload ->> 'country', '')), ''),
      coalesce(nullif(trim(p_payload ->> 'category'), ''), 'general'),
      coalesce(nullif(trim(p_payload ->> 'data_access_level'), ''), 'low'),
      coalesce(nullif(trim(p_payload ->> 'risk_level'), ''), 'medium'),
      v_review_status,
      coalesce((p_payload ->> 'dpa_signed')::boolean, false),
      nullif(trim(coalesce(p_payload ->> 'last_reviewed_at', '')), '')::date,
      nullif(trim(coalesce(p_payload ->> 'next_review_at', '')), '')::date,
      case when v_review_status = 'approved' then now() else null end,
      case when v_review_status = 'approved' then p_actor_user_id else null end
    )
    returning to_jsonb(vendors.*) into v_record;

    v_count := v_count + 1;

  elsif p_operation = 'create' and p_resource_type = 'risk' then
    select count(*)::integer into v_count
    from public.risks
    where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    insert into public.risks (
      id,
      organization_id,
      created_by,
      owner_user_id,
      title,
      description,
      category,
      likelihood,
      impact,
      status,
      mitigation,
      due_date
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      nullif(trim(coalesce(p_payload ->> 'owner_user_id', '')), '')::uuid,
      trim(p_payload ->> 'title'),
      nullif(p_payload ->> 'description', ''),
      coalesce(nullif(trim(p_payload ->> 'category'), ''), 'general'),
      (p_payload ->> 'likelihood')::integer,
      (p_payload ->> 'impact')::integer,
      coalesce(nullif(trim(p_payload ->> 'status'), ''), 'open'),
      nullif(p_payload ->> 'mitigation', ''),
      nullif(trim(coalesce(p_payload ->> 'due_date', '')), '')::date
    )
    returning to_jsonb(risks.*) into v_record;

    v_count := v_count + 1;

  elsif p_operation = 'delete' and p_resource_type = 'vendor' then
    delete from public.vendors
    where id = p_entity_id
      and organization_id = p_organization_id
      and (p_expected_review_version is null or review_version = p_expected_review_version)
    returning to_jsonb(vendors.*) into v_record;

    if v_record is null then
      return query select 'not_found_or_conflict'::text, null::jsonb, 0, p_max_count;
      return;
    end if;

    select count(*)::integer into v_count
    from public.vendors
    where organization_id = p_organization_id;

  elsif p_operation = 'delete' and p_resource_type = 'risk' then
    delete from public.risks
    where id = p_entity_id
      and organization_id = p_organization_id
    returning to_jsonb(risks.*) into v_record;

    if v_record is null then
      return query select 'not_found_or_conflict'::text, null::jsonb, 0, p_max_count;
      return;
    end if;

    select count(*)::integer into v_count
    from public.risks
    where organization_id = p_organization_id;
  end if;

  -- The legacy stream and the canonical chained stream are committed together
  -- with the resource mutation. Any audit write failure aborts the mutation.
  insert into public.audit_logs (
    id,
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    p_resource_type || '.' || p_operation,
    p_resource_type,
    p_entity_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at
  );

  insert into public.audit_events (
    id,
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at,
    previous_hash,
    event_hash,
    hash_algorithm,
    hash_signature
  ) values (
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    p_resource_type || '.' || p_operation,
    p_resource_type,
    p_entity_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at,
    v_previous_hash,
    p_event_hash,
    'sha256',
    p_hash_signature
  );

  return query select
    case when p_operation = 'create' then 'created' else 'deleted' end,
    v_record,
    v_count,
    p_max_count;
end;
$$;

revoke all on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) from public, anon, authenticated;

grant execute on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) to service_role;

comment on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) is 'Service-role-only vendor/risk create/delete authority with organization-scoped serialization, transactional quota enforcement and dual audit persistence.';


-- G1 source step 35 20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql blob 60116bf40f074604ed356d3a25357d719f185452


-- Preserve the existing tenant-scoped SELECT policy and browser role boundary
-- while evaluating auth.uid() once per statement instead of once per row.
alter policy "organization members can read add-ons"
on public.organization_add_ons
to authenticated
using (
  exists (
    select 1
    from public.organization_members as members
    where members.organization_id = organization_add_ons.organization_id
      and members.user_id = (select auth.uid())
  )
);


-- G1 source step 36 20260822123540_v19_reconcile_step_up_challenges_runtime.sql blob 94ad57eb4428142a3f4a51e79e5d63cb2a2a9546


-- Forward-only reconciliation for the runtime store used by
-- src/server/security/step-up-provider.ts. The historical 20260623120000
-- migration shares a duplicate version and is therefore not used as the
-- production execution identity.
create extension if not exists pgcrypto;

create table if not exists public.step_up_challenges (
  nonce text primary key,
  nonce_hash text not null unique,
  user_id uuid not null,
  organization_id uuid not null,
  action text not null check (action in (
    'export_data',
    'manage_billing',
    'manage_team',
    'gdpr_delete',
    'audit_chain_verify',
    'audit_chain_export',
    'change_security_settings'
  )),
  provider text not null check (provider in ('supabase_mfa', 'enterprise_idp')),
  status text not null default 'active' check (status in ('active', 'verified', 'revoked', 'expired')),
  provider_challenge_id text,
  provider_factor_id text,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_up_challenges_short_lived check (expires_at <= issued_at + interval '2 minutes'),
  constraint step_up_challenges_consumed_after_issue check (consumed_at is null or consumed_at >= issued_at)
);

create unique index if not exists step_up_challenges_active_nonce_hash_idx
  on public.step_up_challenges (nonce_hash)
  where status = 'active' and consumed_at is null;

create index if not exists step_up_challenges_scope_idx
  on public.step_up_challenges (organization_id, user_id, action, expires_at desc);

create index if not exists step_up_challenges_expiry_idx
  on public.step_up_challenges (expires_at)
  where status = 'active';

create or replace function public.touch_step_up_challenges_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_step_up_challenges_updated_at() from public;
revoke all on function public.touch_step_up_challenges_updated_at() from anon;
revoke all on function public.touch_step_up_challenges_updated_at() from authenticated;
grant execute on function public.touch_step_up_challenges_updated_at() to service_role;

drop trigger if exists trg_touch_step_up_challenges_updated_at on public.step_up_challenges;
create trigger trg_touch_step_up_challenges_updated_at
before update on public.step_up_challenges
for each row execute function public.touch_step_up_challenges_updated_at();

alter table public.step_up_challenges enable row level security;
alter table public.step_up_challenges force row level security;

-- The store is backend-only. Browser roles do not need table privileges or RLS
-- policies because every challenge mutation is performed through the admin
-- client after authenticated request/organization/permission checks.
revoke all on table public.step_up_challenges from public;
revoke all on table public.step_up_challenges from anon;
revoke all on table public.step_up_challenges from authenticated;
grant all on table public.step_up_challenges to service_role;

-- Remove the historical explicit browser-deny policies if the duplicate-version
-- migration was applied in a non-production environment. ACL denial remains the
-- authoritative boundary and avoids retaining redundant policy surface.
drop policy if exists "step_up_challenges_client_select_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_insert_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_update_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_delete_deny" on public.step_up_challenges;

do $verify$
declare
  trigger_function_oid oid := to_regprocedure('public.touch_step_up_challenges_updated_at()');
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'step_up_challenges'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'step_up_challenges must have RLS and FORCE RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('anon', 'public.step_up_challenges', 'DELETE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'DELETE') then
    raise exception 'browser roles unexpectedly retain step_up_challenges privileges';
  end if;

  if not has_table_privilege('service_role', 'public.step_up_challenges', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'service_role lacks required step_up_challenges privileges';
  end if;

  if trigger_function_oid is null then
    raise exception 'step_up challenge trigger function is missing';
  end if;

  if has_function_privilege('anon', trigger_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', trigger_function_oid, 'EXECUTE') then
    raise exception 'browser roles unexpectedly retain trigger function execution';
  end if;

  if not has_function_privilege('service_role', trigger_function_oid, 'EXECUTE') then
    raise exception 'service_role lacks trigger function execution';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = trigger_function_oid
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'step_up challenge trigger function search_path is not fixed';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'step_up_challenges'
      and indexname = 'step_up_challenges_scope_idx'
  ) then
    raise exception 'step_up challenge scope index is missing';
  end if;
end
$verify$;


-- QA-only mandatory transaction abort

-- G1 QA step 37 guarded source 3579669e4ef94e692dea5816a51cc8af965779c1
-- G1 QA-only missing source-lineage column reconciliation for historical migration #37.
-- Original production ledger and main migration untouched. Source blob 37f2936e8ab0fdec7da6f4621f1ea8a7792763db.
-- Fail closed on any existing subscriptions; caller must enclose in BEGIN/ROLLBACK and target isolated QA.



-- Forward-only schema reconciliation for the canonical billing plans used by
-- src/lib/billing/plans.ts. Existing subscription row values are not rewritten.
-- QA-only prerequisite for a schema-only replay where early production creator migrations are omitted.
DO $g1_qa37_missing_columns$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE EXCEPTION 'G1 QA37 subscription creator missing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions) THEN
    RAISE EXCEPTION 'G1 QA37 not permitted with customer or synthetic subscription rows';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='tier'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN tier text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='entitlements'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN entitlements jsonb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions'
      AND ((column_name='tier' AND udt_name<>'text') OR (column_name='entitlements' AND udt_name<>'jsonb'))
  ) THEN
    RAISE EXCEPTION 'G1 QA37 inconsistent column types';
  END IF;
END $g1_qa37_missing_columns$;

do $guard$
begin
  if to_regclass('public.subscriptions') is null then
    raise exception 'public.subscriptions must exist before subscription schema reconciliation';
  end if;

  if exists (
    select 1
    from public.subscriptions
    where plan not in ('starter', 'professional', 'business', 'enterprise')
       or tier is null
       or tier not in ('starter', 'professional', 'business', 'enterprise')
  ) then
    raise exception 'subscription rows must be canonically normalized before schema defaults are tightened';
  end if;
end
$guard$;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check,
  drop constraint if exists subscriptions_tier_check;

alter table public.subscriptions
  alter column plan set default 'starter',
  alter column plan set not null,
  alter column tier set default 'starter',
  alter column tier set not null,
  alter column status set default 'inactive',
  alter column status set not null,
  alter column entitlements set default '{
    "users": 3,
    "documents": 100,
    "vendors": 5,
    "risks": 25,
    "organizations": 1,
    "aiSystems": 25,
    "storageGb": 10,
    "apiRequestsMonthly": 0,
    "webhooks": 0,
    "exportsMonthly": 25,
    "auditLogsDays": 30
  }'::jsonb,
  alter column entitlements set not null;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('starter', 'professional', 'business', 'enterprise')) not valid,
  add constraint subscriptions_tier_check
    check (tier in ('starter', 'professional', 'business', 'enterprise')) not valid;

alter table public.subscriptions validate constraint subscriptions_plan_check;
alter table public.subscriptions validate constraint subscriptions_tier_check;

create unique index if not exists subscriptions_organization_id_uidx
  on public.subscriptions (organization_id);

do $verify$
declare
  plan_default text;
  tier_default text;
  status_default text;
begin
  select pg_get_expr(d.adbin, d.adrelid)
    into plan_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'plan';

  select pg_get_expr(d.adbin, d.adrelid)
    into tier_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'tier';

  select pg_get_expr(d.adbin, d.adrelid)
    into status_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'status';

  if plan_default <> '''starter''::text'
     or tier_default <> '''starter''::text'
     or status_default <> '''inactive''::text' then
    raise exception 'subscription defaults did not reconcile to the canonical fail-closed contract';
  end if;
end
$verify$;


-- QA-only schema invariants after applying the original source migration 37.
DO $g1_qa37_postconditions$
DECLARE correct integer;
BEGIN
  SELECT COUNT(*) INTO correct FROM information_schema.columns
  WHERE table_schema='public' AND table_name='subscriptions'
    AND ((column_name='tier' AND udt_name='text' AND is_nullable='NO')
      OR (column_name='entitlements' AND udt_name='jsonb' AND is_nullable='NO'));
  IF correct<>2 THEN RAISE EXCEPTION 'G1 QA37 tier/entitlements not reconciled: %',correct; END IF;
END $g1_qa37_postconditions$;

-- mandatory aborted transaction

-- QA replay step 38 supabase/migrations/20260822123544_v19_reconcile_controlled_document_storage.sql GITHUB_BLOB 1fc6a4caa7f90d03a719c2dc066f39ab3de81caa


-- Forward-only reconciliation for the controlled document runtime contract.
-- Historical storage/upload migrations are not used as production execution
-- identities when their lineage is ambiguous. Existing document rows are not
-- rewritten; prospective constraints remain fail-closed for new writes.

do $document_guard$
begin
  if to_regclass('public.documents') is null then
    raise exception 'public.documents must exist before controlled storage reconciliation';
  end if;
end
$document_guard$;

-- Materialize every column written by src/app/api/documents/upload/route.ts.
-- Nullable columns preserve legacy rows. Security booleans/metadata use safe
-- defaults so future backend writes have deterministic values.
alter table public.documents
  add column if not exists uploaded_by uuid,
  add column if not exists storage_path text,
  add column if not exists checksum_sha256 text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists scan_status text,
  add column if not exists scan_provider text,
  add column if not exists scan_required boolean not null default false,
  add column if not exists scan_checked_at timestamptz,
  add column if not exists file_hash text,
  add column if not exists file_size bigint,
  add column if not exists mime_detected text,
  add column if not exists upload_security_metadata jsonb not null default '{}'::jsonb;

alter table public.documents enable row level security;
alter table public.documents force row level security;

-- Recreate prospective constraints under the canonical definitions. NOT VALID
-- avoids claiming that legacy rows were already normalized while still enforcing
-- the constraints for every future INSERT/UPDATE.
alter table public.documents
  drop constraint if exists documents_storage_path_org_prefix_chk,
  drop constraint if exists documents_scan_status_chk;

alter table public.documents
  add constraint documents_storage_path_org_prefix_chk
    check (
      storage_path is null
      or (
        organization_id is not null
        and storage_path like organization_id::text || '/%'
      )
    ) not valid,
  add constraint documents_scan_status_chk
    check (
      scan_status is null
      or scan_status in (
        'clean',
        'infected',
        'suspicious',
        'not_configured',
        'unavailable',
        'error',
        'not_run'
      )
    ) not valid;

create index if not exists documents_upload_scan_status_idx
  on public.documents (organization_id, scan_status, created_at desc);
create index if not exists documents_file_hash_idx
  on public.documents (organization_id, file_hash)
  where file_hash is not null;

-- Prospective tenant-consistent uploader attribution. Null remains permitted for
-- legacy rows and non-UUID external identities; any recorded UUID must be a
-- member of the document organization.
create or replace function public.enforce_document_uploader_member_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.uploaded_by is null then
    return new;
  end if;

  if new.organization_id is null or not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.uploaded_by
  ) then
    raise exception using
      errcode = '23514',
      message = 'Document uploader must belong to the document organization';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_document_uploader_member_scope() from public;
revoke all on function public.enforce_document_uploader_member_scope() from anon;
revoke all on function public.enforce_document_uploader_member_scope() from authenticated;
grant execute on function public.enforce_document_uploader_member_scope() to service_role;

drop trigger if exists enforce_document_uploader_member_scope on public.documents;
create trigger enforce_document_uploader_member_scope
before insert or update of organization_id, uploaded_by
on public.documents
for each row
execute function public.enforce_document_uploader_member_scope();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'controlled-documents',
  'controlled-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Direct browser access would bypass application RBAC, audit logging, malware
-- scanning and short-lived URL issuance. The trusted service-role backend is the
-- only controlled-document object path.
drop policy if exists "Members can read controlled documents" on storage.objects;
drop policy if exists "Members can upload controlled documents" on storage.objects;
drop policy if exists "Members can update controlled documents" on storage.objects;
drop policy if exists "Members can delete controlled documents" on storage.objects;
drop policy if exists "No direct controlled document reads" on storage.objects;
drop policy if exists "No direct controlled document uploads" on storage.objects;
drop policy if exists "No direct controlled document updates" on storage.objects;
drop policy if exists "No direct controlled document deletes" on storage.objects;

create policy "No direct controlled document reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'controlled-documents' and false)
  with check (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'controlled-documents' and false);

do $verify$
declare
  bucket_record record;
  policy_count integer;
  runtime_column_count integer;
  uploader_function_oid oid := to_regprocedure('public.enforce_document_uploader_member_scope()');
begin
  select count(*)
    into runtime_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'documents'
    and column_name in (
      'uploaded_by',
      'storage_path',
      'checksum_sha256',
      'mime_type',
      'size_bytes',
      'scan_status',
      'scan_provider',
      'scan_required',
      'scan_checked_at',
      'file_hash',
      'file_size',
      'mime_detected',
      'upload_security_metadata'
    );

  if runtime_column_count <> 13 then
    raise exception 'controlled document runtime columns are incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'documents'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'documents must have RLS and FORCE RLS enabled';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_path_org_prefix_chk'
      and conrelid = 'public.documents'::regclass
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'documents_scan_status_chk'
      and conrelid = 'public.documents'::regclass
  ) then
    raise exception 'controlled document prospective constraints are incomplete';
  end if;

  if uploader_function_oid is null then
    raise exception 'document uploader membership function is missing';
  end if;

  if has_function_privilege('anon', uploader_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', uploader_function_oid, 'EXECUTE') then
    raise exception 'browser roles unexpectedly retain uploader function execution';
  end if;

  if not has_function_privilege('service_role', uploader_function_oid, 'EXECUTE') then
    raise exception 'service_role lacks uploader function execution';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = uploader_function_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'document uploader function security configuration is not fixed';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.documents'::regclass
      and tgname = 'enforce_document_uploader_member_scope'
      and not tgisinternal
  ) then
    raise exception 'document uploader membership trigger is missing';
  end if;

  select id, public, file_size_limit, allowed_mime_types
    into bucket_record
  from storage.buckets
  where id = 'controlled-documents';

  if bucket_record.id is null
     or bucket_record.public
     or bucket_record.file_size_limit <> 10485760 then
    raise exception 'controlled document bucket boundary is not canonical';
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'No direct controlled document reads',
      'No direct controlled document uploads',
      'No direct controlled document updates',
      'No direct controlled document deletes'
    )
    and roles = array['authenticated']::name[];

  if policy_count <> 4 then
    raise exception 'controlled document browser-deny policy set is incomplete';
  end if;
end
$verify$;

notify pgrst, 'reload schema';


-- QA replay step 39-prerequisite docs/enterprise/replay/G1_QA_MIGRATION_039_TASKS_SOURCE_PREREQUISITE.sql GITHUB_BLOB b7f61a6f7b6f46ef671e2b377cc5bca651216fc4
-- G1 QA-ONLY precondition for historical migration 39, version 20260822123546.
-- Missing creator from production-ledger replay lineage: source 20260624220000 (blob 6845b942046019a5ad9191276b9c110faa9c5b90).
-- Canonical task RLS policy chain from 20260809135000 (blob ff15730715ac2631ed4b0b2ff002424cd291fada).
-- Production current read-only schema confirms 8-column minimal tasks shape.
-- Fails closed if tasks already exists or when app_private tenant helpers are absent.
-- DO NOT USE AS A PRODUCTION MIGRATION. Enclose in test transaction + ROLLBACK.

DO $g1_no_existing_tasks$
BEGIN
 IF to_regclass('public.tasks') IS NOT NULL THEN
   RAISE EXCEPTION 'G1 QA39 refuses to overwrite an existing tasks table';
 END IF;
 IF to_regprocedure('app_private.is_org_member(uuid)') IS NULL
   OR to_regprocedure('app_private.has_org_role(uuid,text[])') IS NULL THEN
   RAISE EXCEPTION 'G1 QA39 private tenant helpers not ready';
 END IF;
END $g1_no_existing_tasks$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_by uuid,
  assigned_to uuid,
  title text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tasks FROM PUBLIC, anon, authenticated;

-- Exact canonical scoped task policies; source provenance pinned above.
create policy rls_tasks_select_member
  on public.tasks for select to authenticated
  using (app_private.is_org_member(organization_id));
create policy rls_tasks_insert_writer
  on public.tasks for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_update_writer
  on public.tasks for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']))
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_delete_admin
  on public.tasks for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin']));


DO $g1_task_policy_postconditions$
DECLARE n int;
BEGIN
 SELECT COUNT(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
   AND policyname IN ('rls_tasks_select_member','rls_tasks_insert_writer','rls_tasks_update_writer','rls_tasks_delete_admin')
   AND 'authenticated'=ANY(roles);
 IF n<>4 THEN RAISE EXCEPTION 'G1 QA39 canonical task policy set incomplete: %',n; END IF;
 SELECT COUNT(*) INTO n FROM information_schema.columns
 WHERE table_schema='public' AND table_name='tasks';
 IF n<>8 THEN RAISE EXCEPTION 'G1 QA39 minimal task schema diverged from production: %',n; END IF;
 IF has_table_privilege('anon','public.tasks','SELECT')
    OR has_table_privilege('authenticated','public.tasks','INSERT') THEN
    RAISE EXCEPTION 'G1 QA39 premature table privileges exposed';
 END IF;
END $g1_task_policy_postconditions$;


-- QA replay step 39 supabase/migrations/20260822123546_v19_force_tasks_rls.sql GITHUB_BLOB 510d3339ea154dd45be8bb62b56e23b650e6efe1


-- Close the remaining live tenant-table drift: tasks already has canonical
-- tenant-scoped policies but production metadata still reports FORCE RLS=false.
do $guard$
begin
  if to_regclass('public.tasks') is null then
    raise exception 'public.tasks must exist before tasks RLS reconciliation';
  end if;
end
$guard$;

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

do $verify$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'tasks'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'tasks RLS/FORCE RLS boundary is not materialized';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname in ('rls_tasks_select_member', 'live_rls_tasks_select_member')
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'tasks tenant-scoped SELECT policy is missing';
  end if;
end
$verify$;


-- QA replay step 40 supabase/migrations/20260822123548_v19_reconcile_enterprise_break_glass_governance.sql GITHUB_BLOB 3c077cc29f56438e459adc04d61f0d513afb7d95


-- Forward-only reconciliation for the backend-only Enterprise Break-Glass
-- runtime contract. The historical 20260727160000 migration was never applied
-- in production and cannot replay cleanly because its composite foreign keys
-- reference column pairs that are not unique. This migration materializes the
-- intended tenant-safe schema under a unique execution identity without
-- rewriting historical migration records.

create extension if not exists pgcrypto;

do $membership_prerequisite$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null then
    raise exception 'organizations and organization_members must exist before break-glass reconciliation';
  end if;
end
$membership_prerequisite$;

-- Composite tenant FKs require an explicit unique parent key. `id` is already a
-- primary key, so this does not change row uniqueness; it only makes the tenant
-- pair a valid referenced key and prevents a request from targeting a membership
-- from another organization.
do $membership_tenant_key$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_organization_id_id_key'
      and contype = 'u'
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_id_key
      unique (organization_id, id);
  end if;
end
$membership_tenant_key$;

create table if not exists public.enterprise_break_glass_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null,
  target_membership_id uuid not null,
  requested_role text not null check (requested_role in ('admin','owner')),
  incident_reference text not null check (char_length(trim(incident_reference)) between 8 and 160),
  justification text not null check (char_length(trim(justification)) between 20 and 2000),
  status text not null default 'pending' check (
    status in ('pending','approved','active','revoked','expired','rejected','review_required','closed')
  ),
  requested_minutes integer not null check (requested_minutes between 15 and 240),
  approvals_required integer not null default 2 check (approvals_required between 2 and 3),
  approvals_received integer not null default 0 check (approvals_received >= 0),
  activated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  review_due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_break_glass_expiry_window
    check (
      expires_at is null
      or (
        activated_at is not null
        and expires_at > activated_at
        and expires_at <= activated_at + interval '4 hours'
      )
    )
);

-- Reconcile keys separately so partially-created non-production schemas converge.
do $request_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_requests_organization_id_id_key'
      and contype = 'u'
  ) then
    alter table public.enterprise_break_glass_requests
      add constraint enterprise_break_glass_requests_organization_id_id_key
      unique (organization_id, id);
  end if;

  alter table public.enterprise_break_glass_requests
    drop constraint if exists enterprise_break_glass_target_tenant_fk;
  alter table public.enterprise_break_glass_requests
    add constraint enterprise_break_glass_target_tenant_fk
      foreign key (organization_id, target_membership_id)
      references public.organization_members(organization_id, id)
      on delete restrict;
end
$request_constraints$;

create unique index if not exists enterprise_break_glass_one_open_target
  on public.enterprise_break_glass_requests (organization_id, target_membership_id)
  where status in ('pending','approved','active','review_required');

create table if not exists public.enterprise_break_glass_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  approver_user_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  rationale text not null check (char_length(trim(rationale)) between 8 and 1000),
  created_at timestamptz not null default now(),
  unique (request_id, approver_user_id)
);

create table if not exists public.enterprise_break_glass_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  request_id uuid not null,
  event_type text not null,
  actor_user_id uuid,
  evidence jsonb not null default '{}'::jsonb,
  previous_event_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists enterprise_break_glass_event_hash_unique
  on public.enterprise_break_glass_events(request_id, event_hash);

create table if not exists public.enterprise_break_glass_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null unique,
  reviewer_user_id uuid,
  outcome text check (outcome in ('appropriate','partially_appropriate','inappropriate')),
  findings text,
  remediation text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every child row is bound to the same tenant as its parent request.
-- Drop/recreate named constraints so partially applied non-production schemas
-- converge on the exact contract.
alter table public.enterprise_break_glass_approvals
  drop constraint if exists enterprise_break_glass_approvals_request_tenant_fk;
alter table public.enterprise_break_glass_approvals
  add constraint enterprise_break_glass_approvals_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_events
  drop constraint if exists enterprise_break_glass_events_request_tenant_fk;
alter table public.enterprise_break_glass_events
  add constraint enterprise_break_glass_events_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_reviews
  drop constraint if exists enterprise_break_glass_reviews_request_tenant_fk;
alter table public.enterprise_break_glass_reviews
  add constraint enterprise_break_glass_reviews_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_requests enable row level security;
alter table public.enterprise_break_glass_requests force row level security;
alter table public.enterprise_break_glass_approvals enable row level security;
alter table public.enterprise_break_glass_approvals force row level security;
alter table public.enterprise_break_glass_events enable row level security;
alter table public.enterprise_break_glass_events force row level security;
alter table public.enterprise_break_glass_reviews enable row level security;
alter table public.enterprise_break_glass_reviews force row level security;

-- Break-Glass persistence is backend-only. Browser access would bypass the
-- route-level RBAC, trusted mutation, rate-limit, Step-Up and audit boundaries.
revoke all on table public.enterprise_break_glass_requests from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_approvals from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_events from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_reviews from public, anon, authenticated;
grant all on table public.enterprise_break_glass_requests to service_role;
grant all on table public.enterprise_break_glass_approvals to service_role;
grant all on table public.enterprise_break_glass_events to service_role;
grant all on table public.enterprise_break_glass_reviews to service_role;

create or replace function public.expire_enterprise_break_glass_requests(p_limit integer default 100)
returns table(request_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'invalid_limit';
  end if;

  return query
  with candidates as (
    select request.id
    from public.enterprise_break_glass_requests as request
    where request.status = 'active'
      and request.expires_at <= now()
    order by request.expires_at
    for update skip locked
    limit p_limit
  ), updated as (
    update public.enterprise_break_glass_requests as request
    set status = 'review_required',
        updated_at = now(),
        review_due_at = coalesce(request.review_due_at, now() + interval '48 hours')
    from candidates
    where request.id = candidates.id
    returning request.id, request.organization_id
  )
  select updated.id, updated.organization_id
  from updated;
end;
$$;

revoke all on function public.expire_enterprise_break_glass_requests(integer) from public, anon, authenticated;
grant execute on function public.expire_enterprise_break_glass_requests(integer) to service_role;

do $verify$
declare
  expiry_function oid := to_regprocedure('public.expire_enterprise_break_glass_requests(integer)');
  rls_count integer;
  browser_table_privileges integer;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_organization_id_id_key'
      and contype = 'u'
  ) then
    raise exception 'organization_members tenant composite key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_requests_organization_id_id_key'
      and contype = 'u'
  ) then
    raise exception 'break-glass request tenant composite key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_target_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'break-glass target tenant foreign key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_approvals'::regclass
      and conname = 'enterprise_break_glass_approvals_request_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_events'::regclass
      and conname = 'enterprise_break_glass_events_request_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_reviews'::regclass
      and conname = 'enterprise_break_glass_reviews_request_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'break-glass child tenant foreign keys are incomplete';
  end if;

  select count(*)
  into rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'enterprise_break_glass_requests',
      'enterprise_break_glass_approvals',
      'enterprise_break_glass_events',
      'enterprise_break_glass_reviews'
    )
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if rls_count <> 4 then
    raise exception 'break-glass RLS/FORCE RLS boundary is incomplete';
  end if;

  select count(*)
  into browser_table_privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'enterprise_break_glass_requests',
      'enterprise_break_glass_approvals',
      'enterprise_break_glass_events',
      'enterprise_break_glass_reviews'
    )
    and grantee in ('anon','authenticated');

  if browser_table_privileges <> 0 then
    raise exception 'browser roles unexpectedly retain break-glass table privileges';
  end if;

  if expiry_function is null then
    raise exception 'break-glass expiry function is missing';
  end if;

  if has_function_privilege('anon', expiry_function, 'EXECUTE')
     or has_function_privilege('authenticated', expiry_function, 'EXECUTE')
     or not has_function_privilege('service_role', expiry_function, 'EXECUTE') then
    raise exception 'break-glass expiry function privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = expiry_function
      and p.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'break-glass expiry function security configuration is not fixed';
  end if;
end
$verify$;

notify pgrst, 'reload schema';


-- Required rollback; this file is NOT a migration and MUST NOT be added to production ledger.

-- G1 QA replay original source 41 blob b087248ae2db91317395cd4d22fa95587ca870b5


create extension if not exists pgcrypto;

do $prerequisites$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.invitations') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'enterprise licensing prerequisites are missing';
  end if;
end
$prerequisites$;

alter table public.organization_members
  add column if not exists seat_type text not null default 'full',
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.invitations
  add column if not exists seat_type text not null default 'full',
  add column if not exists revoked_at timestamptz;

do $member_constraints$
begin
  alter table public.organization_members drop constraint if exists organization_members_seat_type_check;
  alter table public.organization_members add constraint organization_members_seat_type_check
    check (seat_type in ('full','participant','viewer'));
  alter table public.organization_members drop constraint if exists organization_members_status_check;
  alter table public.organization_members add constraint organization_members_status_check
    check (status in ('active','suspended','deprovisioned'));
  alter table public.invitations drop constraint if exists invitations_seat_type_check;
  alter table public.invitations add constraint invitations_seat_type_check
    check (seat_type in ('full','participant','viewer'));
end
$member_constraints$;

create table if not exists public.platform_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admin_users drop constraint if exists platform_admin_users_role_check;
alter table public.platform_admin_users add constraint platform_admin_users_role_check
  check (role in (
    'owner','sales_admin','sales_rep','support_admin',
    'platform_owner','platform_admin','platform_billing',
    'platform_support','platform_security','platform_auditor'
  ));

create table if not exists public.enterprise_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_code text not null unique,
  plan text not null default 'enterprise',
  currency text not null default 'EUR',
  annual_value_minor bigint not null default 0,
  billing_cycle text not null default 'annual',
  starts_at timestamptz not null,
  ends_at timestamptz,
  renews_at timestamptz,
  payment_terms_days integer not null default 30,
  grace_period_days integer not null default 14,
  status text not null default 'draft',
  member_limit integer not null,
  full_user_limit integer not null,
  participant_limit integer not null,
  viewer_limit integer not null,
  admin_limit integer not null,
  legal_entity_limit integer not null default 1,
  ai_system_limit integer not null default 100,
  storage_limit_bytes bigint not null default 10737418240,
  audit_retention_days integer not null default 365,
  sso_enabled boolean not null default false,
  scim_enabled boolean not null default false,
  api_enabled boolean not null default false,
  webhooks_enabled boolean not null default false,
  custom_roles_enabled boolean not null default false,
  advanced_reports_enabled boolean not null default false,
  priority_support_enabled boolean not null default false,
  sla jsonb not null default '{}'::jsonb,
  custom_features jsonb not null default '{}'::jsonb,
  internal_notes text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  latest_stripe_invoice_id text,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_contracts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint enterprise_contracts_annual_value_check check (annual_value_minor >= 0),
  constraint enterprise_contracts_billing_cycle_check check (billing_cycle in ('annual','invoice','custom')),
  constraint enterprise_contracts_status_check check (
    status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended','expired','terminated')
  ),
  constraint enterprise_contracts_dates_check check (ends_at is null or ends_at > starts_at),
  constraint enterprise_contracts_payment_terms_check check (payment_terms_days between 0 and 365),
  constraint enterprise_contracts_grace_period_check check (grace_period_days between 0 and 365),
  constraint enterprise_contracts_limits_check check (
    member_limit >= 1
    and full_user_limit >= 0
    and participant_limit >= 0
    and viewer_limit >= 0
    and admin_limit >= 1
    and full_user_limit + participant_limit + viewer_limit >= member_limit
    and admin_limit <= member_limit
    and legal_entity_limit >= 0
    and ai_system_limit >= 0
    and storage_limit_bytes >= 0
    and audit_retention_days >= 0
  )
);

create unique index if not exists enterprise_contracts_one_current_per_org_idx
  on public.enterprise_contracts (organization_id)
  where status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended');

create table if not exists public.organization_entitlements (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.enterprise_contracts(id) on delete restrict,
  member_limit integer not null,
  full_user_limit integer not null,
  participant_limit integer not null,
  viewer_limit integer not null,
  admin_limit integer not null,
  legal_entity_limit integer not null default 1,
  ai_system_limit integer not null default 100,
  storage_limit_bytes bigint not null default 10737418240,
  audit_retention_days integer not null default 365,
  sso_enabled boolean not null default false,
  scim_enabled boolean not null default false,
  api_enabled boolean not null default false,
  webhooks_enabled boolean not null default false,
  custom_roles_enabled boolean not null default false,
  advanced_reports_enabled boolean not null default false,
  priority_support_enabled boolean not null default false,
  source text not null default 'contract',
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint organization_entitlements_limits_check check (
    member_limit >= 1
    and full_user_limit >= 0
    and participant_limit >= 0
    and viewer_limit >= 0
    and admin_limit >= 1
    and full_user_limit + participant_limit + viewer_limit >= member_limit
    and admin_limit <= member_limit
    and legal_entity_limit >= 0
    and ai_system_limit >= 0
    and storage_limit_bytes >= 0
    and audit_retention_days >= 0
  )
);

create unique index if not exists organization_entitlements_contract_org_idx
  on public.organization_entitlements (contract_id, organization_id);

create table if not exists public.organization_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  active_members integer not null default 0,
  full_users integer not null default 0,
  participants integer not null default 0,
  viewers integer not null default 0,
  active_admins integer not null default 0,
  pending_invitations integer not null default 0,
  ai_systems integer not null default 0,
  legal_entities integer not null default 0,
  storage_bytes bigint not null default 0,
  api_requests bigint not null default 0,
  scim_operations bigint not null default 0,
  csv_imports bigint not null default 0,
  last_reconciled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint organization_usage_non_negative_check check (
    active_members >= 0 and full_users >= 0 and participants >= 0 and viewers >= 0
    and active_admins >= 0 and pending_invitations >= 0 and ai_systems >= 0
    and legal_entities >= 0 and storage_bytes >= 0 and api_requests >= 0
    and scim_operations >= 0 and csv_imports >= 0
  ),
  constraint organization_usage_seat_sum_check check (active_members = full_users + participants + viewers)
);

create table if not exists public.enterprise_seat_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  source text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  membership_id uuid references public.organization_members(id) on delete set null,
  requested_seat_type text,
  outcome text not null default 'started',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint enterprise_seat_operations_key_check check (length(idempotency_key) between 8 and 200),
  constraint enterprise_seat_operations_operation_check check (operation in ('reserve','release','change')),
  constraint enterprise_seat_operations_source_check check (
    source in ('invitation','csv','scim','sso','api','platform','admin','reactivation')
  ),
  constraint enterprise_seat_operations_seat_type_check check (
    requested_seat_type is null or requested_seat_type in ('full','participant','viewer')
  ),
  unique (organization_id, idempotency_key)
);

create index if not exists enterprise_seat_operations_org_created_idx
  on public.enterprise_seat_operations (organization_id, created_at desc);

alter table public.platform_admin_users enable row level security;
alter table public.platform_admin_users force row level security;
alter table public.enterprise_contracts enable row level security;
alter table public.enterprise_contracts force row level security;
alter table public.organization_entitlements enable row level security;
alter table public.organization_entitlements force row level security;
alter table public.organization_usage enable row level security;
alter table public.organization_usage force row level security;
alter table public.enterprise_seat_operations enable row level security;
alter table public.enterprise_seat_operations force row level security;

revoke all on table public.platform_admin_users from public, anon, authenticated;
revoke all on table public.enterprise_contracts from public, anon, authenticated;
revoke all on table public.organization_entitlements from public, anon, authenticated;
revoke all on table public.organization_usage from public, anon, authenticated;
revoke all on table public.enterprise_seat_operations from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_admin_users to service_role;
grant select, insert, update on table public.enterprise_contracts to service_role;
grant select, insert, update on table public.organization_entitlements to service_role;
grant select, insert, update on table public.organization_usage to service_role;
grant select, insert, update on table public.enterprise_seat_operations to service_role;

-- Existing organizations get a deliberately permissive capacity envelope only so
-- current members are not locked out by schema activation. Enterprise feature flags
-- remain disabled and must be explicitly enabled by an operator-owned contract.
insert into public.enterprise_contracts (
  organization_id, contract_code, plan, starts_at, status,
  member_limit, full_user_limit, participant_limit, viewer_limit, admin_limit,
  custom_features, internal_notes
)
select
  organization.id,
  'legacy-' || organization.id::text,
  coalesce(nullif(lower(trim(subscription.plan)), ''), 'starter'),
  organization.created_at,
  'active',
  greatest(coalesce(member_counts.active_members, 0), 10000),
  greatest(coalesce(member_counts.full_users, 0), 10000),
  10000,
  10000,
  greatest(coalesce(member_counts.active_admins, 0), 1000),
  jsonb_build_object('legacy_compatibility', true),
  'Compatibility envelope; Enterprise SSO/SCIM/API/webhooks remain disabled until explicitly contracted.'
from public.organizations as organization
left join lateral (
  select subscription_row.plan
  from public.subscriptions as subscription_row
  where subscription_row.organization_id = organization.id
  order by subscription_row.updated_at desc nulls last, subscription_row.created_at desc
  limit 1
) as subscription on true
left join lateral (
  select
    count(*) filter (where member.status = 'active')::integer as active_members,
    count(*) filter (where member.status = 'active' and member.seat_type = 'full')::integer as full_users,
    count(*) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer as active_admins
  from public.organization_members as member
  where member.organization_id = organization.id
) as member_counts on true
where not exists (
  select 1 from public.enterprise_contracts as contract
  where contract.organization_id = organization.id
);

insert into public.organization_entitlements (
  organization_id, contract_id, member_limit, full_user_limit, participant_limit,
  viewer_limit, admin_limit, legal_entity_limit, ai_system_limit, storage_limit_bytes,
  audit_retention_days, sso_enabled, scim_enabled, api_enabled, webhooks_enabled,
  custom_roles_enabled, advanced_reports_enabled, priority_support_enabled, source
)
select
  contract.organization_id, contract.id, contract.member_limit, contract.full_user_limit,
  contract.participant_limit, contract.viewer_limit, contract.admin_limit,
  contract.legal_entity_limit, contract.ai_system_limit, contract.storage_limit_bytes,
  contract.audit_retention_days, contract.sso_enabled, contract.scim_enabled,
  contract.api_enabled, contract.webhooks_enabled, contract.custom_roles_enabled,
  contract.advanced_reports_enabled, contract.priority_support_enabled,
  case when coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean, false)
    then 'legacy_compatibility' else 'contract' end
from public.enterprise_contracts as contract
where contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
on conflict (organization_id) do nothing;

insert into public.organization_usage (
  organization_id, active_members, full_users, participants, viewers,
  active_admins, pending_invitations, last_reconciled_at
)
select
  organization.id,
  count(member.id) filter (where member.status = 'active')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'full')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'participant')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'viewer')::integer,
  count(member.id) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer,
  (
    select count(*)::integer from public.invitations as invitation
    where invitation.organization_id = organization.id
      and invitation.accepted_at is null
      and invitation.revoked_at is null
      and invitation.expires_at > now()
  ),
  now()
from public.organizations as organization
left join public.organization_members as member on member.organization_id = organization.id
group by organization.id
on conflict (organization_id) do update set
  active_members = excluded.active_members,
  full_users = excluded.full_users,
  participants = excluded.participants,
  viewers = excluded.viewers,
  active_admins = excluded.active_admins,
  pending_invitations = excluded.pending_invitations,
  last_reconciled_at = excluded.last_reconciled_at,
  updated_at = now();

create or replace function public.resolve_organization_entitlements_v2(p_organization_id uuid)
returns table (
  outcome text, contract_id uuid, contract_status text, contract_version integer,
  member_limit integer, full_user_limit integer, participant_limit integer, viewer_limit integer, admin_limit integer,
  active_members integer, full_users integer, participants integer, viewers integer, active_admins integer,
  pending_invitations integer, pending_full_users integer, pending_participants integer, pending_viewers integer, pending_admins integer,
  sso_enabled boolean, scim_enabled boolean, api_enabled boolean, webhooks_enabled boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_usage public.organization_usage%rowtype;
  v_pending_invitations integer := 0;
  v_pending_full_users integer := 0;
  v_pending_participants integer := 0;
  v_pending_viewers integer := 0;
  v_pending_admins integer := 0;
begin
  if p_organization_id is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended','expired')
  order by contract.version desc, contract.updated_at desc
  limit 1;

  if not found then
    return query select 'contract_missing'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = p_organization_id and entitlement.contract_id = v_contract.id;

  if not found then
    return query select 'entitlements_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select usage.* into v_usage from public.organization_usage as usage
  where usage.organization_id = p_organization_id;
  if not found then
    return query select 'usage_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      v_entitlement.member_limit, v_entitlement.full_user_limit, v_entitlement.participant_limit,
      v_entitlement.viewer_limit, v_entitlement.admin_limit,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      v_entitlement.sso_enabled, v_entitlement.scim_enabled, v_entitlement.api_enabled, v_entitlement.webhooks_enabled;
    return;
  end if;

  select count(*)::integer,
    count(*) filter (where invitation.seat_type = 'full')::integer,
    count(*) filter (where invitation.seat_type = 'participant')::integer,
    count(*) filter (where invitation.seat_type = 'viewer')::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner','admin'))::integer
  into v_pending_invitations, v_pending_full_users, v_pending_participants, v_pending_viewers, v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at > now();

  return query select
    case when v_contract.status = 'active' then 'resolved' else 'contract_not_active' end,
    v_contract.id, v_contract.status, v_contract.version,
    least(v_contract.member_limit, v_entitlement.member_limit),
    least(v_contract.full_user_limit, v_entitlement.full_user_limit),
    least(v_contract.participant_limit, v_entitlement.participant_limit),
    least(v_contract.viewer_limit, v_entitlement.viewer_limit),
    least(v_contract.admin_limit, v_entitlement.admin_limit),
    v_usage.active_members, v_usage.full_users, v_usage.participants, v_usage.viewers, v_usage.active_admins,
    v_pending_invitations, v_pending_full_users, v_pending_participants, v_pending_viewers, v_pending_admins,
    v_entitlement.sso_enabled, v_entitlement.scim_enabled, v_entitlement.api_enabled, v_entitlement.webhooks_enabled;
end;
$$;

create or replace function public.reserve_organization_seat_idempotent_atomic(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text,
  p_seat_type text,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'api'
)
returns table (
  outcome text, membership_id uuid, applied_role text, applied_seat_type text,
  active_members integer, seat_usage integer, seat_limit integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_membership public.organization_members%rowtype;
  v_existing_operation public.enterprise_seat_operations%rowtype;
  v_operation_id uuid;
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_source text := lower(trim(coalesce(p_source, '')));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_member_limit integer := 0;
  v_seat_limit integer := 0;
  v_admin_limit integer := 0;
  v_current_seat_usage integer := 0;
  v_previous_active boolean := false;
  v_previous_seat_type text;
  v_previous_role text;
begin
  if p_organization_id is null or p_user_id is null or p_actor_user_id is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    return query select 'invalid_idempotency_key'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_role not in ('owner','admin','editor','member','viewer') then
    return query select 'invalid_role'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_seat_type'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_source not in ('invitation','csv','scim','sso','api','platform','admin','reactivation') then
    return query select 'invalid_source'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));

  select operation.* into v_existing_operation from public.enterprise_seat_operations as operation
  where operation.organization_id = p_organization_id and operation.idempotency_key = p_idempotency_key;
  if found then
    return query select 'duplicate'::text, v_existing_operation.membership_id, null::text,
      v_existing_operation.requested_seat_type,
      coalesce((v_existing_operation.metadata ->> 'active_members')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_usage')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_limit')::integer, 0);
    return;
  end if;

  insert into public.enterprise_seat_operations (
    organization_id, idempotency_key, operation, source, actor_user_id, target_user_id, requested_seat_type
  ) values (p_organization_id, p_idempotency_key, 'reserve', v_source, p_actor_user_id, p_user_id, v_seat_type)
  returning id into v_operation_id;

  insert into public.organization_usage (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage
  where usage.organization_id = p_organization_id for update;

  select contract.* into v_contract from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by contract.version desc, contract.updated_at desc limit 1 for update;
  if not found then
    update public.enterprise_seat_operations set outcome='contract_missing', completed_at=now() where id=v_operation_id;
    return query select 'contract_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;
  if v_contract.status <> 'active' then
    update public.enterprise_seat_operations set outcome='contract_not_active', completed_at=now() where id=v_operation_id;
    return query select 'contract_not_active'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;

  select entitlement.* into v_entitlement from public.organization_entitlements as entitlement
  where entitlement.organization_id=p_organization_id and entitlement.contract_id=v_contract.id for update;
  if not found then
    update public.enterprise_seat_operations set outcome='entitlements_missing', completed_at=now() where id=v_operation_id;
    return query select 'entitlements_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;

  select member.* into v_membership from public.organization_members as member
  where member.organization_id=p_organization_id and member.user_id=p_user_id for update;
  if found then
    v_previous_active := v_membership.status='active';
    v_previous_seat_type := v_membership.seat_type;
    v_previous_role := lower(coalesce(v_membership.role,''));
  end if;

  select
    count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members, v_full_users, v_participants, v_viewers, v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  if v_previous_active and v_previous_seat_type=v_seat_type and v_previous_role=v_role then
    v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;
    v_seat_limit := case v_seat_type when 'full' then least(v_contract.full_user_limit,v_entitlement.full_user_limit)
      when 'participant' then least(v_contract.participant_limit,v_entitlement.participant_limit)
      else least(v_contract.viewer_limit,v_entitlement.viewer_limit) end;
    update public.enterprise_seat_operations set outcome='already_active', membership_id=v_membership.id, completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit)
      where id=v_operation_id;
    return query select 'already_active'::text,v_membership.id,v_membership.role,v_membership.seat_type,v_active_members,v_current_seat_usage,v_seat_limit;
    return;
  end if;

  select count(*)::integer,
    count(*) filter (where invitation.seat_type=v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role,'')) in ('owner','admin'))::integer
  into v_pending_members,v_pending_seats,v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id=p_organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at>now();

  v_member_limit := least(v_contract.member_limit,v_entitlement.member_limit);
  v_seat_limit := case v_seat_type when 'full' then least(v_contract.full_user_limit,v_entitlement.full_user_limit)
    when 'participant' then least(v_contract.participant_limit,v_entitlement.participant_limit)
    else least(v_contract.viewer_limit,v_entitlement.viewer_limit) end;
  v_admin_limit := least(v_contract.admin_limit,v_entitlement.admin_limit);
  v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;

  if not v_previous_active and v_active_members + v_pending_members >= v_member_limit then
    update public.enterprise_seat_operations set outcome='member_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit) where id=v_operation_id;
    return query select 'member_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_current_seat_usage,v_seat_limit; return;
  end if;

  if (not v_previous_active or v_previous_seat_type<>v_seat_type)
     and v_current_seat_usage + v_pending_seats >= v_seat_limit then
    update public.enterprise_seat_operations set outcome='seat_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit) where id=v_operation_id;
    return query select 'seat_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_current_seat_usage,v_seat_limit; return;
  end if;

  if v_role in ('owner','admin')
     and (not v_previous_active or v_previous_role not in ('owner','admin'))
     and v_active_admins + v_pending_admins >= v_admin_limit then
    update public.enterprise_seat_operations set outcome='admin_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_active_admins,'seat_limit',v_admin_limit) where id=v_operation_id;
    return query select 'admin_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_active_admins,v_admin_limit; return;
  end if;

  insert into public.organization_members (organization_id,user_id,role,seat_type,status,updated_at)
  values (p_organization_id,p_user_id,v_role,v_seat_type,'active',now())
  on conflict (organization_id,user_id) do update set
    role=excluded.role,seat_type=excluded.seat_type,status='active',updated_at=now()
  returning * into v_membership;

  select
    count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  update public.organization_usage set active_members=v_active_members,full_users=v_full_users,
    participants=v_participants,viewers=v_viewers,active_admins=v_active_admins,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,
    case when v_previous_active then 'enterprise.member_seat_type_changed' else 'enterprise.seat_reserved' end,
    'organization_member',v_membership.id::text,
    jsonb_build_object('source',v_source,'seat_type',v_seat_type,'role',v_role,'previous_seat_type',v_previous_seat_type));

  v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;
  update public.enterprise_seat_operations set outcome=case when v_previous_active then 'seat_changed' else 'reserved' end,
    membership_id=v_membership.id,completed_at=now(),
    metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit)
  where id=v_operation_id;

  return query select case when v_previous_active then 'seat_changed'::text else 'reserved'::text end,
    v_membership.id,v_membership.role,v_membership.seat_type,v_active_members,v_current_seat_usage,v_seat_limit;
end;
$$;

create or replace function public.release_organization_seat_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'admin'
)
returns table (outcome text,membership_id uuid,released_seat_type text,active_members integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_membership public.organization_members%rowtype;
  v_operation_id uuid;
  v_source text := lower(trim(coalesce(p_source,'')));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
begin
  if p_organization_id is null or p_member_id is null or p_actor_user_id is null
     or length(trim(coalesce(p_idempotency_key,''))) not between 8 and 200 then
    return query select 'invalid_input'::text,null::uuid,null::text,0; return;
  end if;
  if v_source not in ('invitation','csv','scim','sso','api','platform','admin','reactivation') then
    return query select 'invalid_source'::text,null::uuid,null::text,0; return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key,0));
  insert into public.enterprise_seat_operations (organization_id,idempotency_key,operation,source,actor_user_id)
  values (p_organization_id,p_idempotency_key,'release',v_source,p_actor_user_id)
  on conflict (organization_id,idempotency_key) do nothing returning id into v_operation_id;
  if v_operation_id is null then return query select 'duplicate'::text,null::uuid,null::text,0; return; end if;

  insert into public.organization_usage (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage where usage.organization_id=p_organization_id for update;

  select member.* into v_membership from public.organization_members as member
  where member.organization_id=p_organization_id and member.id=p_member_id for update;
  if not found then
    update public.enterprise_seat_operations set outcome='not_found',completed_at=now() where id=v_operation_id;
    return query select 'not_found'::text,p_member_id,null::text,0; return;
  end if;
  if v_membership.status<>'active' then
    select count(*)::integer into v_active_members from public.organization_members
    where organization_id=p_organization_id and status='active';
    update public.enterprise_seat_operations set outcome='already_released',membership_id=v_membership.id,completed_at=now() where id=v_operation_id;
    return query select 'already_released'::text,v_membership.id,v_membership.seat_type,v_active_members; return;
  end if;

  update public.organization_members set status=case when v_source='scim' then 'deprovisioned' else 'suspended' end,updated_at=now()
  where id=v_membership.id and organization_id=p_organization_id;

  select count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  update public.organization_usage set active_members=v_active_members,full_users=v_full_users,
    participants=v_participants,viewers=v_viewers,active_admins=v_active_admins,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.seat_released','organization_member',v_membership.id::text,
    jsonb_build_object('source',v_source,'seat_type',v_membership.seat_type));

  update public.enterprise_seat_operations set outcome='released',membership_id=v_membership.id,completed_at=now(),
    metadata=jsonb_build_object('active_members',v_active_members) where id=v_operation_id;
  return query select 'released'::text,v_membership.id,v_membership.seat_type,v_active_members;
end;
$$;

revoke all on function public.resolve_organization_entitlements_v2(uuid) from public,anon,authenticated;
revoke all on function public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_organization_entitlements_v2(uuid) to service_role;
grant execute on function public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text) to service_role;
grant execute on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) to service_role;

do $verify$
declare
  browser_grants integer;
  forced_rls integer;
  function_oid oid;
begin
  select count(*) into forced_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('platform_admin_users','enterprise_contracts','organization_entitlements','organization_usage','enterprise_seat_operations')
    and c.relrowsecurity and c.relforcerowsecurity;
  if forced_rls<>5 then raise exception 'enterprise licensing RLS/FORCE RLS incomplete'; end if;

  select count(*) into browser_grants from information_schema.role_table_grants
  where table_schema='public'
    and table_name in ('platform_admin_users','enterprise_contracts','organization_entitlements','organization_usage','enterprise_seat_operations')
    and grantee in ('anon','authenticated');
  if browser_grants<>0 then raise exception 'browser roles retain enterprise licensing table privileges'; end if;

  if to_regprocedure('public.resolve_organization_entitlements_v2(uuid)') is null
     or to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)') is null
     or to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)') is null then
    raise exception 'enterprise licensing RPCs incomplete';
  end if;

  for function_oid in
    select unnest(array[
      to_regprocedure('public.resolve_organization_entitlements_v2(uuid)'),
      to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)'),
      to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)')
    ]::oid[])
  loop
    if has_function_privilege('anon',function_oid,'EXECUTE')
       or has_function_privilege('authenticated',function_oid,'EXECUTE')
       or not has_function_privilege('service_role',function_oid,'EXECUTE') then
      raise exception 'enterprise licensing RPC privileges are not canonical';
    end if;
    if not exists (
      select 1 from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=function_oid and p.prosecdef and setting='search_path=pg_catalog'
    ) then
      raise exception 'enterprise licensing RPC security configuration is not fixed';
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';


-- G1 QA replay original source 42 blob a4de62e8f8d77825df8edda1c90bf5c173c49a53


create extension if not exists pgcrypto;

do $prerequisites$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.platform_admin_users') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regprocedure('public.resolve_organization_entitlements_v2(uuid)') is null then
    raise exception 'enterprise integrations prerequisites are missing';
  end if;
end
$prerequisites$;

create table if not exists public.enterprise_service_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  description text,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_by uuid not null references auth.users(id),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,name)
);

create table if not exists public.enterprise_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_account_id uuid not null references public.enterprise_service_accounts(id) on delete cascade,
  key_prefix text not null check (key_prefix ~ '^rc_live_[a-zA-Z0-9]{8}$'),
  secret_hash text not null check (char_length(secret_hash)=64),
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','rotating','revoked','expired')),
  expires_at timestamptz not null,
  rotated_from_id uuid references public.enterprise_api_keys(id),
  grace_period_ends_at timestamptz,
  last_used_at timestamptz,
  last_used_ip_hash text,
  created_by uuid not null references auth.users(id),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id,key_prefix),
  check (expires_at>created_at),
  check (cardinality(scopes) between 1 and 32)
);

create table if not exists public.enterprise_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_url text not null check (endpoint_url ~ '^https://'),
  event_types text[] not null,
  secret_ciphertext text not null,
  secret_version integer not null default 1 check (secret_version>0),
  status text not null default 'active' check (status in ('active','paused','revoked')),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  timeout_seconds integer not null default 10 check (timeout_seconds between 1 and 30),
  created_by uuid not null references auth.users(id),
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(event_types) between 1 and 64)
);

create table if not exists public.enterprise_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.enterprise_webhook_subscriptions(id) on delete cascade,
  event_id uuid not null,
  event_type text not null,
  idempotency_key text not null,
  payload_digest text not null check (char_length(payload_digest)=64),
  status text not null default 'pending' check (status in ('pending','leased','delivered','retryable','dead_letter','cancelled')),
  attempt_count integer not null default 0 check (attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  response_status integer,
  response_digest text,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id,event_id),
  unique (organization_id,idempotency_key)
);

create table if not exists public.enterprise_identity_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  protocol text not null check (protocol in ('oidc','saml')),
  status text not null default 'draft' check (status in ('draft','verified','active','suspended','revoked')),
  issuer text not null,
  metadata_url text,
  client_id text,
  encrypted_client_secret text,
  verified_domain text,
  domain_verification_token_hash text,
  group_role_mapping jsonb not null default '{}'::jsonb,
  enforce_sso boolean not null default false,
  created_by uuid not null references auth.users(id),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,protocol,issuer),
  check (not enforce_sso or status='active')
);

create table if not exists public.enterprise_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete cascade,
  token_prefix text not null check (token_prefix ~ '^scim_[a-zA-Z0-9]{8}$'),
  token_hash text not null check (char_length(token_hash)=64),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id,token_prefix),
  check (expires_at>created_at)
);

create table if not exists public.enterprise_integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_service_account_id uuid references public.enterprise_service_accounts(id),
  event_type text not null,
  target_type text not null,
  target_id uuid,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null check (char_length(event_hash)=64),
  created_at timestamptz not null default now(),
  check (actor_user_id is not null or actor_service_account_id is not null)
);

create table if not exists public.enterprise_scim_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete set null,
  external_id text check (external_id is null or char_length(external_id)<=255),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('admin','editor','viewer')),
  seat_type text not null check (seat_type in ('full','participant','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deprovisioned_at timestamptz,
  unique (organization_id,user_id),
  unique (organization_id,email)
);

create index if not exists enterprise_api_keys_lookup_idx on public.enterprise_api_keys(key_prefix,status,expires_at);
create index if not exists enterprise_webhook_due_idx on public.enterprise_webhook_deliveries(status,next_attempt_at) where status in ('pending','retryable');
create index if not exists enterprise_webhook_org_idx on public.enterprise_webhook_deliveries(organization_id,created_at desc);
create index if not exists enterprise_identity_org_idx on public.enterprise_identity_connections(organization_id,status);
create index if not exists enterprise_audit_chain_idx on public.enterprise_integration_audit_events(organization_id,created_at,id);
create unique index if not exists enterprise_scim_identity_external_id_unique
  on public.enterprise_scim_identities(organization_id,identity_connection_id,external_id) where external_id is not null;
create index if not exists enterprise_scim_identity_org_active_idx
  on public.enterprise_scim_identities(organization_id,active,created_at desc);

-- Tenant composite keys make every child relationship prove organization scope.
do $tenant_keys$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_service_accounts'::regclass and conname='enterprise_service_accounts_id_org_key') then
    alter table public.enterprise_service_accounts add constraint enterprise_service_accounts_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_webhook_subscriptions'::regclass and conname='enterprise_webhook_subscriptions_id_org_key') then
    alter table public.enterprise_webhook_subscriptions add constraint enterprise_webhook_subscriptions_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_identity_connections'::regclass and conname='enterprise_identity_connections_id_org_key') then
    alter table public.enterprise_identity_connections add constraint enterprise_identity_connections_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_id_org_key') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_service_account_tenant_fk') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_service_account_tenant_fk
      foreign key (service_account_id,organization_id) references public.enterprise_service_accounts(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_rotation_tenant_fk') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_rotation_tenant_fk
      foreign key (rotated_from_id,organization_id) references public.enterprise_api_keys(id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_webhook_deliveries'::regclass and conname='enterprise_webhook_deliveries_subscription_tenant_fk') then
    alter table public.enterprise_webhook_deliveries add constraint enterprise_webhook_deliveries_subscription_tenant_fk
      foreign key (subscription_id,organization_id) references public.enterprise_webhook_subscriptions(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_scim_tokens'::regclass and conname='enterprise_scim_tokens_connection_tenant_fk') then
    alter table public.enterprise_scim_tokens add constraint enterprise_scim_tokens_connection_tenant_fk
      foreign key (identity_connection_id,organization_id) references public.enterprise_identity_connections(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_integration_audit_events'::regclass and conname='enterprise_integration_audit_service_account_tenant_fk') then
    alter table public.enterprise_integration_audit_events add constraint enterprise_integration_audit_service_account_tenant_fk
      foreign key (actor_service_account_id,organization_id) references public.enterprise_service_accounts(id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_scim_identities'::regclass and conname='enterprise_scim_identities_connection_tenant_fk') then
    alter table public.enterprise_scim_identities add constraint enterprise_scim_identities_connection_tenant_fk
      foreign key (identity_connection_id,organization_id) references public.enterprise_identity_connections(id,organization_id) on delete set null;
  end if;
end
$tenant_keys$;

-- Sensitive integration material is backend-only. Existing historical browser
-- policies are removed as defense in depth; service routes use the admin client.
drop policy if exists enterprise_service_accounts_admin on public.enterprise_service_accounts;
drop policy if exists enterprise_api_keys_admin on public.enterprise_api_keys;
drop policy if exists enterprise_webhook_subscriptions_admin on public.enterprise_webhook_subscriptions;
drop policy if exists enterprise_webhook_deliveries_read on public.enterprise_webhook_deliveries;
drop policy if exists enterprise_identity_connections_admin on public.enterprise_identity_connections;
drop policy if exists enterprise_scim_tokens_admin on public.enterprise_scim_tokens;
drop policy if exists enterprise_integration_audit_read on public.enterprise_integration_audit_events;

alter table public.enterprise_service_accounts enable row level security; alter table public.enterprise_service_accounts force row level security;
alter table public.enterprise_api_keys enable row level security; alter table public.enterprise_api_keys force row level security;
alter table public.enterprise_webhook_subscriptions enable row level security; alter table public.enterprise_webhook_subscriptions force row level security;
alter table public.enterprise_webhook_deliveries enable row level security; alter table public.enterprise_webhook_deliveries force row level security;
alter table public.enterprise_identity_connections enable row level security; alter table public.enterprise_identity_connections force row level security;
alter table public.enterprise_scim_tokens enable row level security; alter table public.enterprise_scim_tokens force row level security;
alter table public.enterprise_integration_audit_events enable row level security; alter table public.enterprise_integration_audit_events force row level security;
alter table public.enterprise_scim_identities enable row level security; alter table public.enterprise_scim_identities force row level security;

revoke all on table public.enterprise_service_accounts from public,anon,authenticated;
revoke all on table public.enterprise_api_keys from public,anon,authenticated;
revoke all on table public.enterprise_webhook_subscriptions from public,anon,authenticated;
revoke all on table public.enterprise_webhook_deliveries from public,anon,authenticated;
revoke all on table public.enterprise_identity_connections from public,anon,authenticated;
revoke all on table public.enterprise_scim_tokens from public,anon,authenticated;
revoke all on table public.enterprise_integration_audit_events from public,anon,authenticated;
revoke all on table public.enterprise_scim_identities from public,anon,authenticated;
grant all on table public.enterprise_service_accounts to service_role;
grant all on table public.enterprise_api_keys to service_role;
grant all on table public.enterprise_webhook_subscriptions to service_role;
grant all on table public.enterprise_webhook_deliveries to service_role;
grant all on table public.enterprise_identity_connections to service_role;
grant all on table public.enterprise_scim_tokens to service_role;
grant all on table public.enterprise_integration_audit_events to service_role;
grant all on table public.enterprise_scim_identities to service_role;

create or replace function public.create_enterprise_scim_token_atomic(
  p_organization_id uuid,p_identity_connection_id uuid,p_token_prefix text,p_token_hash text,
  p_expires_at timestamptz,p_actor_user_id uuid
)
returns table (outcome text,token_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if p_organization_id is null or p_actor_user_id is null
     or coalesce(p_token_prefix,'') !~ '^scim_[a-zA-Z0-9]{8}$'
     or coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$'
     or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '370 days' then
    return query select 'invalid_input'::text,null::uuid,null::timestamptz; return;
  end if;

  if not exists (
    select 1 from public.platform_admin_users actor
    where actor.user_id=p_actor_user_id and actor.enabled=true
      and actor.role in ('owner','sales_admin','support_admin','platform_owner','platform_admin','platform_security')
  ) then
    return query select 'platform_role_required'::text,null::uuid,null::timestamptz; return;
  end if;

  if p_identity_connection_id is not null and not exists (
    select 1 from public.enterprise_identity_connections connection
    where connection.id=p_identity_connection_id and connection.organization_id=p_organization_id
      and connection.status in ('verified','active')
  ) then
    return query select 'identity_connection_not_found'::text,null::uuid,null::timestamptz; return;
  end if;

  select * into v_snapshot from public.resolve_organization_entitlements_v2(p_organization_id);
  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text,null::uuid,null::timestamptz; return;
  end if;

  insert into public.enterprise_scim_tokens(
    organization_id,identity_connection_id,token_prefix,token_hash,status,expires_at,created_by
  ) values (p_organization_id,p_identity_connection_id,p_token_prefix,p_token_hash,'active',p_expires_at,p_actor_user_id)
  returning * into v_token;

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.scim_token_created','enterprise_scim_token',v_token.id::text,
    jsonb_build_object('token_prefix',v_token.token_prefix,'expires_at',v_token.expires_at,'identity_connection_id',v_token.identity_connection_id));

  return query select 'created'::text,v_token.id,v_token.expires_at;
end;
$$;

create or replace function public.authenticate_enterprise_scim_token(p_token_prefix text,p_token_hash text)
returns table (outcome text,token_id uuid,organization_id uuid,identity_connection_id uuid)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if coalesce(p_token_prefix,'') !~ '^scim_[a-zA-Z0-9]{8}$' or coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$' then
    return query select 'invalid_token'::text,null::uuid,null::uuid,null::uuid; return;
  end if;
  select token.* into v_token from public.enterprise_scim_tokens token where token.token_prefix=p_token_prefix for update;
  if not found or v_token.status<>'active' or v_token.expires_at<=now() or v_token.token_hash<>p_token_hash then
    return query select 'invalid_token'::text,null::uuid,null::uuid,null::uuid; return;
  end if;
  select * into v_snapshot from public.resolve_organization_entitlements_v2(v_token.organization_id);
  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.contract_status is distinct from 'active'
     or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text,v_token.id,v_token.organization_id,v_token.identity_connection_id; return;
  end if;
  update public.enterprise_scim_tokens token set last_used_at=now() where token.id=v_token.id;
  return query select 'authenticated'::text,v_token.id,v_token.organization_id,v_token.identity_connection_id;
end;
$$;

create or replace function public.upsert_enterprise_scim_identity_atomic(
  p_organization_id uuid,p_identity_connection_id uuid,p_external_id text,p_user_id uuid,p_email text,p_role text,p_seat_type text
)
returns table (outcome text,identity_id uuid,user_id uuid,active boolean,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_identity public.enterprise_scim_identities%rowtype;
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_role text:=lower(trim(coalesce(p_role,'')));
  v_seat_type text:=lower(trim(coalesce(p_seat_type,'')));
begin
  if p_organization_id is null or p_user_id is null
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or v_role not in ('admin','editor','viewer') or v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_input'::text,null::uuid,null::uuid,false,null::timestamptz,null::timestamptz; return;
  end if;
  if p_identity_connection_id is not null and not exists (
    select 1 from public.enterprise_identity_connections connection
    where connection.id=p_identity_connection_id and connection.organization_id=p_organization_id
  ) then
    return query select 'identity_connection_not_found'::text,null::uuid,null::uuid,false,null::timestamptz,null::timestamptz; return;
  end if;
  insert into public.enterprise_scim_identities(
    organization_id,identity_connection_id,external_id,user_id,email,role,seat_type,active
  ) values (p_organization_id,p_identity_connection_id,nullif(trim(coalesce(p_external_id,'')),''),p_user_id,v_email,v_role,v_seat_type,true)
  on conflict (organization_id,user_id) do update set
    identity_connection_id=excluded.identity_connection_id,external_id=excluded.external_id,email=excluded.email,
    role=excluded.role,seat_type=excluded.seat_type,active=true,deprovisioned_at=null,updated_at=now()
  returning * into v_identity;
  return query select 'upserted'::text,v_identity.id,v_identity.user_id,v_identity.active,v_identity.created_at,v_identity.updated_at;
end;
$$;

create or replace function public.get_enterprise_scim_identity(p_organization_id uuid,p_identity_id uuid)
returns table (outcome text,identity_id uuid,external_id text,user_id uuid,membership_id uuid,email text,role text,seat_type text,active boolean,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=pg_catalog
as $$
  select 'resolved'::text,identity.id,identity.external_id,identity.user_id,member.id,identity.email,identity.role,
    identity.seat_type,identity.active,identity.created_at,identity.updated_at
  from public.enterprise_scim_identities identity
  left join public.organization_members member on member.organization_id=identity.organization_id and member.user_id=identity.user_id
  where identity.organization_id=p_organization_id and identity.id=p_identity_id;
$$;

create or replace function public.find_enterprise_scim_identity(p_organization_id uuid,p_external_id text,p_email text)
returns table (outcome text,identity_id uuid,external_id text,user_id uuid,membership_id uuid,email text,role text,seat_type text,active boolean,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=pg_catalog
as $$
  select 'resolved'::text,identity.id,identity.external_id,identity.user_id,member.id,identity.email,identity.role,
    identity.seat_type,identity.active,identity.created_at,identity.updated_at
  from public.enterprise_scim_identities identity
  left join public.organization_members member on member.organization_id=identity.organization_id and member.user_id=identity.user_id
  where identity.organization_id=p_organization_id
    and ((nullif(trim(coalesce(p_external_id,'')),'') is not null and identity.external_id=trim(p_external_id))
      or identity.email=lower(trim(coalesce(p_email,''))))
  order by case when identity.external_id=nullif(trim(coalesce(p_external_id,'')),'') then 0 else 1 end,identity.created_at
  limit 1;
$$;

create or replace function public.deactivate_enterprise_scim_identity_atomic(p_organization_id uuid,p_identity_id uuid)
returns table (outcome text,identity_id uuid,user_id uuid,active boolean,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare v_identity public.enterprise_scim_identities%rowtype;
begin
  select identity.* into v_identity from public.enterprise_scim_identities identity
  where identity.organization_id=p_organization_id and identity.id=p_identity_id for update;
  if not found then return query select 'not_found'::text,null::uuid,null::uuid,false,null::timestamptz; return; end if;
  if v_identity.active=false then return query select 'unchanged'::text,v_identity.id,v_identity.user_id,false,v_identity.updated_at; return; end if;
  update public.enterprise_scim_identities identity set active=false,deprovisioned_at=now(),updated_at=now()
  where identity.id=v_identity.id returning * into v_identity;
  return query select 'deactivated'::text,v_identity.id,v_identity.user_id,v_identity.active,v_identity.updated_at;
end;
$$;

revoke all on function public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.authenticate_enterprise_scim_token(text,text) from public,anon,authenticated;
revoke all on function public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.get_enterprise_scim_identity(uuid,uuid) from public,anon,authenticated;
revoke all on function public.find_enterprise_scim_identity(uuid,text,text) from public,anon,authenticated;
revoke all on function public.deactivate_enterprise_scim_identity_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid) to service_role;
grant execute on function public.authenticate_enterprise_scim_token(text,text) to service_role;
grant execute on function public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.get_enterprise_scim_identity(uuid,uuid) to service_role;
grant execute on function public.find_enterprise_scim_identity(uuid,text,text) to service_role;
grant execute on function public.deactivate_enterprise_scim_identity_atomic(uuid,uuid) to service_role;

do $verify$
declare
  forced_rls integer;
  browser_grants integer;
  tenant_fk_count integer;
  function_oid oid;
begin
  select count(*) into forced_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions','enterprise_webhook_deliveries',
    'enterprise_identity_connections','enterprise_scim_tokens','enterprise_integration_audit_events','enterprise_scim_identities'
  ) and c.relrowsecurity and c.relforcerowsecurity;
  if forced_rls<>8 then raise exception 'enterprise integrations RLS/FORCE RLS incomplete'; end if;

  select count(*) into browser_grants from information_schema.role_table_grants
  where table_schema='public' and table_name in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions','enterprise_webhook_deliveries',
    'enterprise_identity_connections','enterprise_scim_tokens','enterprise_integration_audit_events','enterprise_scim_identities'
  ) and grantee in ('anon','authenticated');
  if browser_grants<>0 then raise exception 'browser roles retain enterprise integration table privileges'; end if;

  select count(*) into tenant_fk_count from pg_constraint
  where conname in (
    'enterprise_api_keys_service_account_tenant_fk','enterprise_api_keys_rotation_tenant_fk',
    'enterprise_webhook_deliveries_subscription_tenant_fk','enterprise_scim_tokens_connection_tenant_fk',
    'enterprise_integration_audit_service_account_tenant_fk','enterprise_scim_identities_connection_tenant_fk'
  ) and contype='f' and convalidated;
  if tenant_fk_count<>6 then raise exception 'enterprise integration tenant foreign keys incomplete'; end if;

  for function_oid in
    select unnest(array[
      to_regprocedure('public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid)'),
      to_regprocedure('public.authenticate_enterprise_scim_token(text,text)'),
      to_regprocedure('public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text)'),
      to_regprocedure('public.get_enterprise_scim_identity(uuid,uuid)'),
      to_regprocedure('public.find_enterprise_scim_identity(uuid,text,text)'),
      to_regprocedure('public.deactivate_enterprise_scim_identity_atomic(uuid,uuid)')
    ]::oid[])
  loop
    if function_oid is null then raise exception 'enterprise SCIM RPC missing'; end if;
    if has_function_privilege('anon',function_oid,'EXECUTE') or has_function_privilege('authenticated',function_oid,'EXECUTE')
       or not has_function_privilege('service_role',function_oid,'EXECUTE') then
      raise exception 'enterprise SCIM RPC privileges are not canonical';
    end if;
    if not exists (
      select 1 from pg_proc p cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=function_oid and p.prosecdef and setting='search_path=pg_catalog'
    ) then raise exception 'enterprise SCIM RPC security configuration is not fixed'; end if;
  end loop;
end
$verify$;

notify pgrst,'reload schema';


-- Mandatory rollback-only QA replay.
ROLLBACK;
