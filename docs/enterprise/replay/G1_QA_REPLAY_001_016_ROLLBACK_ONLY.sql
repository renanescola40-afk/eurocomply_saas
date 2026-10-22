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
ROLLBACK;
