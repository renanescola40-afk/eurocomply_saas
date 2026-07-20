-- Enterprise AI incident lifecycle: serialize incident transitions and persist
-- the incident update, immutable history snapshot, and chained audit event in
-- one PostgreSQL transaction.

create table if not exists public.ai_incident_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.ai_incidents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_status text,
  next_status text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_incident_history_incident_idx
  on public.ai_incident_history(organization_id, incident_id, created_at desc);

alter table public.ai_incident_history enable row level security;
alter table public.ai_incident_history force row level security;

create policy "Organization members can read ai incident history"
  on public.ai_incident_history for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = ai_incident_history.organization_id
        and om.user_id = auth.uid()
    )
  );

-- History is append-only and server-owned. Explicit deny policies make every
-- client mutation operation fail closed and keep static RLS coverage complete.
create policy "Authenticated users cannot insert ai incident history"
  on public.ai_incident_history for insert
  to authenticated
  with check (false);

create policy "Authenticated users cannot update ai incident history"
  on public.ai_incident_history for update
  to authenticated
  using (false)
  with check (false);

create policy "Authenticated users cannot delete ai incident history"
  on public.ai_incident_history for delete
  to authenticated
  using (false);

revoke insert, update, delete on table public.ai_incident_history from anon, authenticated;
grant select on table public.ai_incident_history to authenticated;
grant select, insert, update, delete on table public.ai_incident_history to service_role;

create or replace function public.transition_ai_incident_atomic(
  p_incident_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_patch jsonb,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, incident jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.ai_incidents%rowtype;
  v_updated public.ai_incidents%rowtype;
  v_previous_hash text;
  v_next_status text;
  v_allowed boolean := false;
begin
  if p_incident_id is null
    or p_organization_id is null
    or p_expected_updated_at is null
    or p_actor_user_id is null
    or p_patch is null
    or jsonb_typeof(p_patch) <> 'object'
    or p_audit_id is null
    or p_audit_created_at is null
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or (p_hash_signature is not null and p_hash_signature !~ '^[0-9a-f]{64}$') then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select i.* into v_current
  from public.ai_incidents i
  where i.id = p_incident_id
    and i.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::jsonb;
    return;
  end if;

  if v_current.updated_at is distinct from p_expected_updated_at then
    return query select 'state_changed'::text, null::jsonb;
    return;
  end if;

  v_next_status := lower(trim(coalesce(p_patch ->> 'report_status', v_current.report_status)));

  v_allowed :=
    v_next_status = v_current.report_status
    or (v_current.report_status = 'draft' and v_next_status in ('assessing', 'closed'))
    or (v_current.report_status = 'assessing' and v_next_status in ('reportable', 'closed'))
    or (v_current.report_status = 'reportable' and v_next_status in ('assessing', 'reported', 'closed'))
    or (v_current.report_status = 'reported' and v_next_status = 'closed');

  if not v_allowed then
    return query select 'invalid_transition'::text, null::jsonb;
    return;
  end if;

  if v_next_status = 'reported'
    and nullif(trim(coalesce(p_patch ->> 'authority', v_current.authority, '')), '') is null then
    return query select 'authority_required'::text, null::jsonb;
    return;
  end if;

  if (p_patch ? 'ai_system_id') and p_patch ->> 'ai_system_id' is not null
    and not exists (
      select 1 from public.ai_systems s
      where s.id = (p_patch ->> 'ai_system_id')::uuid
        and s.organization_id = p_organization_id
    ) then
    return query select 'invalid_ai_system'::text, null::jsonb;
    return;
  end if;

  update public.ai_incidents i
  set
    ai_system_id = case when p_patch ? 'ai_system_id' then nullif(p_patch ->> 'ai_system_id', '')::uuid else i.ai_system_id end,
    title = case when p_patch ? 'title' then trim(p_patch ->> 'title') else i.title end,
    summary = case when p_patch ? 'summary' then trim(p_patch ->> 'summary') else i.summary end,
    category = case when p_patch ? 'category' then lower(trim(p_patch ->> 'category')) else i.category end,
    severity = case when p_patch ? 'severity' then lower(trim(p_patch ->> 'severity')) else i.severity end,
    report_status = v_next_status,
    authority = case when p_patch ? 'authority' then nullif(trim(p_patch ->> 'authority'), '') else i.authority end,
    internal_owner = case when p_patch ? 'internal_owner' then nullif(trim(p_patch ->> 'internal_owner'), '') else i.internal_owner end,
    deadline_plan = case when p_patch ? 'deadline_plan' then p_patch -> 'deadline_plan' else i.deadline_plan end,
    next_actions = case when p_patch ? 'next_actions' then p_patch -> 'next_actions' else i.next_actions end
  where i.id = p_incident_id
    and i.organization_id = p_organization_id
    and i.updated_at is not distinct from p_expected_updated_at
  returning i.* into v_updated;

  if not found then
    return query select 'state_changed'::text, null::jsonb;
    return;
  end if;

  insert into public.ai_incident_history (
    incident_id, organization_id, actor_user_id, action,
    previous_status, next_status, snapshot
  ) values (
    v_updated.id,
    v_updated.organization_id,
    p_actor_user_id,
    'incident_updated',
    v_current.report_status,
    v_updated.report_status,
    jsonb_build_object(
      'title', v_updated.title,
      'severity', v_updated.severity,
      'category', v_updated.category,
      'reportStatus', v_updated.report_status,
      'authority', v_updated.authority,
      'internalOwner', v_updated.internal_owner,
      'updatedAt', v_updated.updated_at
    )
  );

  select ae.event_hash into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  if coalesce(v_previous_hash, '') <> coalesce(p_previous_hash, '') then
    raise exception 'audit chain previous hash mismatch' using errcode = '40001';
  end if;

  insert into public.audit_events (
    id, organization_id, actor_user_id, action, entity_type, entity_id,
    metadata, created_at, previous_hash, event_hash, hash_algorithm, hash_signature
  ) values (
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'ai_incident_updated',
    'ai_incident',
    p_incident_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at,
    v_previous_hash,
    p_event_hash,
    'sha256',
    p_hash_signature
  );

  return query select 'updated'::text, to_jsonb(v_updated);
end;
$$;

revoke all on function public.transition_ai_incident_atomic(uuid, uuid, timestamptz, uuid, jsonb, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.transition_ai_incident_atomic(uuid, uuid, timestamptz, uuid, jsonb, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.transition_ai_incident_atomic(uuid, uuid, timestamptz, uuid, jsonb, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.transition_ai_incident_atomic(uuid, uuid, timestamptz, uuid, jsonb, uuid, jsonb, timestamptz, text, text, text) to service_role;

notify pgrst, 'reload schema';