alter table public.ai_systems
  add column if not exists category text,
  add column if not exists country_market text,
  add column if not exists processed_data text,
  add column if not exists model_name text,
  add column if not exists last_reassessed_at timestamptz;

create index if not exists ai_systems_country_market_idx on public.ai_systems(organization_id, country_market);
create index if not exists ai_systems_category_idx on public.ai_systems(organization_id, category);
create index if not exists ai_systems_last_reassessed_idx on public.ai_systems(organization_id, last_reassessed_at desc);

create table if not exists public.ai_system_history (
  id uuid primary key default gen_random_uuid(),
  ai_system_id uuid not null references public.ai_systems(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'reassessed')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_system_history_system_idx on public.ai_system_history(ai_system_id, created_at desc);
create index if not exists ai_system_history_org_idx on public.ai_system_history(organization_id, created_at desc);

alter table public.ai_system_history enable row level security;

drop policy if exists "Organization members can read ai system history" on public.ai_system_history;
create policy "Organization members can read ai system history"
  on public.ai_system_history for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_system_history.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can insert ai system history" on public.ai_system_history;
create policy "Organization members can insert ai system history"
  on public.ai_system_history for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_system_history.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Organization members can delete ai system history" on public.ai_system_history;
create policy "Organization members can delete ai system history"
  on public.ai_system_history for delete
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_system_history.organization_id
        and om.user_id = auth.uid()
    )
  );

update public.ai_systems
set last_reassessed_at = coalesce(last_reassessed_at, updated_at, created_at)
where last_reassessed_at is null;
