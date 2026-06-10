-- EuroComply public launch readiness
-- Apply this migration in Supabase SQL editor before production launch.

create extension if not exists pgcrypto;

alter table if exists public.documents
  add column if not exists storage_path text,
  add column if not exists checksum_sha256 text;

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint organization_invites_role_check check (role in ('owner', 'admin', 'manager', 'member', 'viewer'))
);

create index if not exists organization_invites_org_idx on public.organization_invites (organization_id);
create index if not exists organization_invites_email_idx on public.organization_invites (lower(email));
create unique index if not exists organization_invites_pending_unique_idx
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_created_idx on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_action_idx on public.audit_events (action);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('info', 'success', 'warning', 'error'))
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_org_created_idx on public.notifications (organization_id, created_at desc);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  window_start timestamptz not null default now(),
  count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(scope, identifier)
);

create index if not exists rate_limits_scope_identifier_idx on public.rate_limits (scope, identifier);

alter table public.organization_invites enable row level security;
alter table public.audit_events enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists "Members can read organization invites" on public.organization_invites;
create policy "Members can read organization invites" on public.organization_invites
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invites.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Members can read audit events" on public.audit_events;
create policy "Members can read audit events" on public.audit_events
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = audit_events.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = notifications.organization_id
        and om.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'controlled-documents',
  'controlled-documents',
  false,
  10485760,
  array['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read controlled documents" on storage.objects;
create policy "Members can read controlled documents" on storage.objects
  for select using (
    bucket_id = 'controlled-documents'
    and exists (
      select 1 from public.organization_members om
      where om.organization_id::text = split_part(storage.objects.name, '/', 1)
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "Members can upload controlled documents" on storage.objects;
create policy "Members can upload controlled documents" on storage.objects
  for insert with check (
    bucket_id = 'controlled-documents'
    and exists (
      select 1 from public.organization_members om
      where om.organization_id::text = split_part(storage.objects.name, '/', 1)
        and om.user_id = auth.uid()
    )
  );
