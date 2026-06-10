create table if not exists public.ai_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  owner_team text,
  vendor_name text,
  use_case text not null,
  role text not null default 'deployer' check (role in ('provider', 'deployer', 'importer', 'distributor', 'other')),
  lifecycle_status text not null default 'planned' check (lifecycle_status in ('planned', 'pilot', 'production', 'retired')),
  risk_domain text not null default 'general_productivity',
  uses_personal_data boolean not null default false,
  interacts_with_people boolean not null default false,
  generates_content boolean not null default false,
  biometric_identification boolean not null default false,
  manipulative_or_exploitative boolean not null default false,
  risk_level text not null default 'minimal_or_low' check (risk_level in ('prohibited_review', 'high_risk_review', 'limited_transparency', 'minimal_or_low')),
  classification_summary text not null default '',
  obligations jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_systems_organization_id_idx on public.ai_systems(organization_id);
create index if not exists ai_systems_risk_level_idx on public.ai_systems(organization_id, risk_level);
create index if not exists ai_systems_lifecycle_status_idx on public.ai_systems(organization_id, lifecycle_status);
create index if not exists ai_systems_created_at_idx on public.ai_systems(organization_id, created_at desc);

alter table public.ai_systems enable row level security;

drop policy if exists "Organization members can read ai systems" on public.ai_systems;
create policy "Organization members can read ai systems"
  on public.ai_systems for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_systems.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can insert ai systems" on public.ai_systems;
create policy "Organization members can insert ai systems"
  on public.ai_systems for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_systems.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can update ai systems" on public.ai_systems;
create policy "Organization members can update ai systems"
  on public.ai_systems for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_systems.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_systems.organization_id
        and om.user_id = auth.uid()
    )
  );

create or replace function public.set_ai_systems_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_systems_updated_at on public.ai_systems;
create trigger set_ai_systems_updated_at
before update on public.ai_systems
for each row
execute function public.set_ai_systems_updated_at();
