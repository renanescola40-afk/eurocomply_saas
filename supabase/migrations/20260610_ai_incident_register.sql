create table if not exists public.ai_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  title text not null,
  summary text not null,
  category text not null default 'other' check (category in ('malfunction', 'data_or_security', 'serious_harm', 'fundamental_rights', 'transparency_failure', 'prohibited_use_signal', 'other')),
  severity text not null default 'monitor' check (severity in ('monitor', 'serious', 'critical')),
  detected_at timestamptz not null default now(),
  report_status text not null default 'draft' check (report_status in ('draft', 'assessing', 'reportable', 'reported', 'closed')),
  authority text,
  internal_owner text,
  deadline_plan jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_incidents_organization_id_idx on public.ai_incidents(organization_id);
create index if not exists ai_incidents_system_idx on public.ai_incidents(organization_id, ai_system_id);
create index if not exists ai_incidents_status_idx on public.ai_incidents(organization_id, report_status);
create index if not exists ai_incidents_severity_idx on public.ai_incidents(organization_id, severity);
create index if not exists ai_incidents_detected_at_idx on public.ai_incidents(organization_id, detected_at desc);

alter table public.ai_incidents enable row level security;

drop policy if exists "Organization members can read ai incidents" on public.ai_incidents;
create policy "Organization members can read ai incidents"
  on public.ai_incidents for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_incidents.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can insert ai incidents" on public.ai_incidents;
create policy "Organization members can insert ai incidents"
  on public.ai_incidents for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_incidents.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can update ai incidents" on public.ai_incidents;
create policy "Organization members can update ai incidents"
  on public.ai_incidents for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_incidents.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_incidents.organization_id
        and om.user_id = auth.uid()
    )
  );

create or replace function public.set_ai_incidents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_incidents_updated_at on public.ai_incidents;
create trigger set_ai_incidents_updated_at
before update on public.ai_incidents
for each row
execute function public.set_ai_incidents_updated_at();
