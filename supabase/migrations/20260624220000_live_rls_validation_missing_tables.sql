-- Live RLS validation table bootstrap.
-- The target live project used by the proof may not have these optional runtime
-- tables yet. Create a minimal compatible shape so the live RLS proof can seed
-- rows and verify policies without replaying all historical app migrations.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  actor_id uuid,
  actor_user_id uuid,
  action text,
  entity_type text,
  entity_id text,
  created_at timestamptz not null default now()
);

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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  title text,
  message text,
  type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

notify pgrst, 'reload schema';
