-- B2B SaaS onboarding activation flow
-- Stores real setup data under organization_id and lets users continue later.

create extension if not exists pgcrypto;

alter table if exists public.organizations
  add column if not exists company_type text,
  add column if not exists sector text,
  add column if not exists ai_usage_summary text,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_step text,
  add column if not exists selected_plan text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Some older environments already have country/readiness_score, so keep this additive.
alter table if exists public.organizations
  add column if not exists country text,
  add column if not exists readiness_score integer;

create index if not exists organizations_onboarding_status_idx
  on public.organizations(onboarding_status, updated_at desc);

create index if not exists organizations_country_sector_idx
  on public.organizations(country, sector);

alter table if exists public.documents
  add column if not exists title text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.documents
set title = coalesce(title, name)
where title is null;

alter table if exists public.compliance_tasks
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists category text not null default 'general',
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'compliance_tasks' and column_name = 'workspace_id'
  ) then
    alter table public.compliance_tasks alter column workspace_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'compliance_tasks' and column_name = 'user_id'
  ) then
    alter table public.compliance_tasks alter column user_id drop not null;
  end if;
end $$;

create index if not exists compliance_tasks_organization_status_idx
  on public.compliance_tasks(organization_id, status, priority, due_date);

create table if not exists public.onboarding_activation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_by_clerk_user_id text,
  country text not null,
  company_type text not null,
  sector text not null,
  ai_usage_level text not null,
  ai_usage_summary text,
  first_ai_system_id uuid references public.ai_systems(id) on delete set null,
  initial_risk_level text not null,
  readiness_score integer not null default 0,
  recommended_documents jsonb not null default '[]'::jsonb,
  suggested_tasks jsonb not null default '[]'::jsonb,
  invited_emails jsonb not null default '[]'::jsonb,
  selected_plan text not null default 'trial',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists onboarding_activation_runs_org_created_idx
  on public.onboarding_activation_runs(organization_id, created_at desc);

alter table public.onboarding_activation_runs enable row level security;

drop policy if exists "Members can read onboarding activation runs" on public.onboarding_activation_runs;
create policy "Members can read onboarding activation runs"
on public.onboarding_activation_runs for select
using (public.is_org_member(organization_id));

drop policy if exists "Managers can create onboarding activation runs" on public.onboarding_activation_runs;
create policy "Managers can create onboarding activation runs"
on public.onboarding_activation_runs for insert
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

-- Org-scoped task access for activation tasks in environments that started from the workspace-scoped task table.
drop policy if exists "Org members can read activation tasks" on public.compliance_tasks;
create policy "Org members can read activation tasks"
on public.compliance_tasks for select
using (organization_id is not null and public.is_org_member(organization_id));

drop policy if exists "Org managers can create activation tasks" on public.compliance_tasks;
create policy "Org managers can create activation tasks"
on public.compliance_tasks for insert
with check (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

drop policy if exists "Org managers can update activation tasks" on public.compliance_tasks;
create policy "Org managers can update activation tasks"
on public.compliance_tasks for update
using (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','compliance_manager']));
