begin;

alter table public.enterprise_access_export_jobs
  add column if not exists download_count integer not null default 0 check (download_count >= 0),
  add column if not exists last_downloaded_at timestamptz;

create table if not exists public.enterprise_access_export_download_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  export_job_id uuid not null references public.enterprise_access_export_jobs(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('issued','denied','expired','integrity_failed','provider_failed')),
  reason_code text not null check (char_length(reason_code) between 3 and 120),
  expires_in_seconds integer check (expires_in_seconds between 30 and 900),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists enterprise_access_export_download_events_org_created_idx
  on public.enterprise_access_export_download_events (organization_id, created_at desc);
create index if not exists enterprise_access_export_download_events_job_idx
  on public.enterprise_access_export_download_events (export_job_id, created_at desc);

alter table public.enterprise_access_export_download_events enable row level security;
alter table public.enterprise_access_export_download_events force row level security;
revoke all on public.enterprise_access_export_download_events from public, anon, authenticated;
grant all on public.enterprise_access_export_download_events to service_role;
create policy enterprise_access_export_download_events_deny_delete
  on public.enterprise_access_export_download_events for delete to authenticated using (false);

create or replace function public.register_enterprise_access_export_download(
  p_organization_id uuid,
  p_export_job_id uuid,
  p_actor_user_id uuid,
  p_outcome text,
  p_reason_code text,
  p_expires_in_seconds integer default null,
  p_correlation_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if p_outcome not in ('issued','denied','expired','integrity_failed','provider_failed') then
    raise exception 'invalid_download_outcome';
  end if;

  if not exists (
    select 1 from public.enterprise_access_export_jobs
    where id = p_export_job_id and organization_id = p_organization_id
  ) then
    raise exception 'export_job_not_found';
  end if;

  insert into public.enterprise_access_export_download_events (
    organization_id, export_job_id, actor_user_id, outcome, reason_code,
    expires_in_seconds, correlation_id
  ) values (
    p_organization_id, p_export_job_id, p_actor_user_id, p_outcome,
    left(p_reason_code, 120), p_expires_in_seconds, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_event_id;

  if p_outcome = 'issued' then
    update public.enterprise_access_export_jobs
      set download_count = download_count + 1,
          last_downloaded_at = now(),
          updated_at = now()
    where id = p_export_job_id and organization_id = p_organization_id;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.register_enterprise_access_export_download(uuid,uuid,uuid,text,text,integer,uuid) from public, anon, authenticated;
grant execute on function public.register_enterprise_access_export_download(uuid,uuid,uuid,text,text,integer,uuid) to service_role;

commit;
