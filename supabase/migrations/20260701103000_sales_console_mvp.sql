-- Internal Sales Console MVP for Early Access lead operations.
-- This is an internal/admin surface only. It is not customer-facing CRM functionality.

alter table public.sales_leads
  add column if not exists priority text not null default 'normal',
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists lost_reason text,
  add column if not exists disqualified_reason text,
  add column if not exists gdpr_deleted_at timestamptz;

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

-- Keep these internal tables inaccessible to direct anon/authenticated clients.
-- Next.js server code uses the service role only after app-layer platform-admin checks.
revoke all on public.platform_admin_users from anon, authenticated;
revoke all on public.sales_lead_notes from anon, authenticated;
revoke all on public.sales_lead_activity_events from anon, authenticated;
