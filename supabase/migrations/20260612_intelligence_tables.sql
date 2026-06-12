create extension if not exists pgcrypto;

create table if not exists public.intelligence_items (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  category text not null,
  jurisdiction text not null default 'European Union',
  source_name text not null,
  source_type text not null default 'official',
  author text,
  published_at timestamptz,
  reliability text not null default 'high',
  impact text not null default 'monitor',
  executive_summary text not null,
  internal_analysis text not null,
  affected_companies text[] not null default '{}'::text[],
  recommended_actions text[] not null default '{}'::text[],
  reference_label text,
  reference_url text,
  content_rights text not null default 'metadata_and_analysis_only',
  full_text_allowed boolean not null default false,
  full_text text,
  premium boolean not null default false,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_items_reliability_check check (reliability in ('high', 'medium', 'low')),
  constraint intelligence_items_impact_check check (impact in ('monitor', 'medium', 'high', 'critical')),
  constraint intelligence_items_status_check check (status in ('draft', 'published', 'archived')),
  constraint intelligence_items_full_text_rights_check check (full_text is null or full_text_allowed = true)
);

create table if not exists public.intelligence_calendar_suggestions (
  id uuid primary key default gen_random_uuid(),
  intelligence_item_id uuid not null references public.intelligence_items(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  priority text not null default 'medium',
  due_in_days integer not null default 30,
  suggested_action text not null,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_calendar_priority_check check (priority in ('low', 'medium', 'high', 'critical')),
  constraint intelligence_calendar_status_check check (status in ('suggested', 'accepted', 'ignored', 'created'))
);

create index if not exists intelligence_items_published_idx on public.intelligence_items (published_at desc nulls last, created_at desc);
create index if not exists intelligence_items_category_idx on public.intelligence_items (category);
create index if not exists intelligence_items_impact_idx on public.intelligence_items (impact);
create index if not exists intelligence_calendar_org_idx on public.intelligence_calendar_suggestions (organization_id, status);

create or replace function public.set_intelligence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_intelligence_items_updated_at on public.intelligence_items;
create trigger set_intelligence_items_updated_at before update on public.intelligence_items for each row execute function public.set_intelligence_updated_at();

drop trigger if exists set_intelligence_calendar_updated_at on public.intelligence_calendar_suggestions;
create trigger set_intelligence_calendar_updated_at before update on public.intelligence_calendar_suggestions for each row execute function public.set_intelligence_updated_at();

alter table public.intelligence_items enable row level security;
alter table public.intelligence_calendar_suggestions enable row level security;

drop policy if exists "Authenticated users can read published intelligence" on public.intelligence_items;
create policy "Authenticated users can read published intelligence" on public.intelligence_items for select using (auth.uid() is not null and status = 'published');

drop policy if exists "Organization members can read intelligence calendar suggestions" on public.intelligence_calendar_suggestions;
create policy "Organization members can read intelligence calendar suggestions" on public.intelligence_calendar_suggestions for select using (
  organization_id is null or exists (
    select 1 from public.organization_members om
    where om.organization_id = intelligence_calendar_suggestions.organization_id
      and om.user_id = auth.uid()
  )
);
