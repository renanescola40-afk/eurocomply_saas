-- Internal Sales Console MVP for Early Access lead operations.
-- This is an internal/admin surface only. It is not customer-facing CRM functionality.

alter table public.sales_leads
  add column if not exists status text not null default 'new',
  add column if not exists priority text not null default 'normal',
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists estimated_value_cents integer,
  add column if not exists currency text not null default 'EUR',
  add column if not exists plan_interest text,
  add column if not exists lost_reason text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists disqualified_reason text,
  add column if not exists gdpr_deleted_at timestamptz;

alter table public.sales_leads enable row level security;

create index if not exists sales_leads_status_idx on public.sales_leads (status);
create index if not exists sales_leads_source_idx on public.sales_leads (source);
create index if not exists sales_leads_timeline_idx on public.sales_leads (timeline);
create index if not exists sales_leads_company_size_idx on public.sales_leads (company_size);
create index if not exists sales_leads_next_follow_up_idx on public.sales_leads (next_follow_up_at asc nulls last);
create index if not exists sales_leads_priority_idx on public.sales_leads (priority);
create index if not exists sales_leads_last_activity_idx on public.sales_leads (last_activity_at desc nulls last);

create table if not exists public.platform_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'sales_admin', 'sales_rep', 'support_admin')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admin_users enable row level security;

create table if not exists public.sales_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('note', 'status_change', 'follow_up', 'email', 'call', 'demo', 'proposal')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.sales_lead_activities enable row level security;
create index if not exists sales_lead_activities_lead_id_created_at_idx on public.sales_lead_activities (lead_id, created_at desc);
create index if not exists sales_lead_activities_type_idx on public.sales_lead_activities (type);

-- Keep legacy internal tables for compatibility with earlier admin-console migrations.
-- New MVP code writes to sales_lead_activities.
create table if not exists public.sales_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_lead_notes enable row level security;
create index if not exists sales_lead_notes_lead_created_idx on public.sales_lead_notes (lead_id, created_at desc);

create table if not exists public.sales_lead_activity_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.sales_lead_activity_events enable row level security;
create index if not exists sales_lead_activity_events_lead_created_idx on public.sales_lead_activity_events (lead_id, created_at desc);
create index if not exists sales_lead_activity_events_action_idx on public.sales_lead_activity_events (action);

-- Normalize legacy rows before adding update-time constraints. NOT VALID skips the
-- initial scan, but PostgreSQL still enforces these checks on future row updates.
update public.sales_leads
set
  message = left(message, 1000),
  current_process = left(current_process, 700),
  notes = left(notes, 2000),
  user_agent = left(user_agent, 300),
  ip_hint = left(ip_hint, 120)
where
  char_length(coalesce(message, '')) > 1000
  or char_length(coalesce(current_process, '')) > 700
  or char_length(coalesce(notes, '')) > 2000
  or char_length(coalesce(user_agent, '')) > 300
  or char_length(coalesce(ip_hint, '')) > 120;

update public.sales_lead_notes
set body = left(body, 2000)
where char_length(body) > 2000;

-- Defensive database constraints for app-layer validation drift. NOT VALID keeps the
-- migration safe for any existing legacy rows while enforcing the checks on new writes.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_leads_status_allowed') then
    alter table public.sales_leads add constraint sales_leads_status_allowed
      check (status in ('new', 'qualified', 'demo_scheduled', 'proposal_sent', 'won', 'lost', 'nurture')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_priority_allowed') then
    alter table public.sales_leads add constraint sales_leads_priority_allowed
      check (priority in ('low', 'normal', 'high', 'urgent')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_estimated_value_non_negative') then
    alter table public.sales_leads add constraint sales_leads_estimated_value_non_negative
      check (estimated_value_cents is null or estimated_value_cents >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_message_length') then
    alter table public.sales_leads add constraint sales_leads_message_length
      check (message is null or char_length(message) <= 1000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_current_process_length') then
    alter table public.sales_leads add constraint sales_leads_current_process_length
      check (current_process is null or char_length(current_process) <= 700) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_notes_length') then
    alter table public.sales_leads add constraint sales_leads_notes_length
      check (notes is null or char_length(notes) <= 2000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_user_agent_length') then
    alter table public.sales_leads add constraint sales_leads_user_agent_length
      check (user_agent is null or char_length(user_agent) <= 300) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_leads_ip_hint_length') then
    alter table public.sales_leads add constraint sales_leads_ip_hint_length
      check (ip_hint is null or char_length(ip_hint) <= 120) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_lead_activities_body_length') then
    alter table public.sales_lead_activities add constraint sales_lead_activities_body_length
      check (char_length(body) <= 2000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_lead_activities_metadata_length') then
    alter table public.sales_lead_activities add constraint sales_lead_activities_metadata_length
      check (char_length(metadata::text) <= 4096) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_lead_notes_body_length') then
    alter table public.sales_lead_notes add constraint sales_lead_notes_body_length
      check (char_length(body) <= 2000) not valid;
  end if;
end $$;

-- Keep these internal tables inaccessible to direct anon/authenticated clients.
-- Next.js server code uses the service role only after app-layer platform-admin checks.
revoke all on public.sales_leads from anon, authenticated;
revoke all on public.platform_admin_users from anon, authenticated;
revoke all on public.sales_lead_activities from anon, authenticated;
revoke all on public.sales_lead_notes from anon, authenticated;
revoke all on public.sales_lead_activity_events from anon, authenticated;
