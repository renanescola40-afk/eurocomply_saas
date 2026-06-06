create table if not exists public.email_notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, event_type, entity_type, entity_id, recipient_email)
);

create index if not exists email_notification_events_org_type_idx
  on public.email_notification_events (organization_id, event_type, sent_at desc);

alter table public.email_notification_events enable row level security;

drop policy if exists "Members can read email notification events" on public.email_notification_events;
create policy "Members can read email notification events"
  on public.email_notification_events
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = email_notification_events.organization_id
        and om.user_id = auth.uid()
    )
  );
