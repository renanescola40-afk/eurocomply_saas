create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company_name text not null,
  role text not null,
  locale text not null default 'pt',
  source text not null default 'prelaunch_waitlist',
  status text not null default 'new',
  launch_target_at timestamptz not null default timestamptz '2026-07-01 07:00:00+01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waitlist_leads enable row level security;

revoke all on table public.waitlist_leads from anon, authenticated;
