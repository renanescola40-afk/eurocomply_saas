begin;

alter table public.enterprise_scim_group_access_policies
  add column if not exists change_reason text,
  add column if not exists last_previewed_at timestamptz;

create table if not exists public.enterprise_group_access_policy_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid references public.enterprise_scim_group_access_policies(id) on delete set null,
  group_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('previewed','created','updated','disabled')),
  reason text not null check (char_length(reason) between 3 and 500),
  before_state jsonb,
  after_state jsonb,
  affected_members integer not null default 0 check (affected_members >= 0),
  created_at timestamptz not null default now()
);

create index if not exists enterprise_group_access_policy_events_org_created_idx
  on public.enterprise_group_access_policy_events (organization_id, created_at desc);

alter table public.enterprise_group_access_policy_events enable row level security;
alter table public.enterprise_group_access_policy_events force row level security;
revoke all on public.enterprise_group_access_policy_events from public, anon, authenticated;
grant all on public.enterprise_group_access_policy_events to service_role;

create or replace function public.preview_enterprise_group_access_policy_change(
  p_organization_id uuid,
  p_group_id uuid,
  p_role text,
  p_seat_type text,
  p_department_key text,
  p_priority integer
)
returns table (
  outcome text,
  affected_members integer,
  admin_promotions integer,
  admin_demotions integer,
  seat_changes integer,
  conflict_count integer,
  would_remove_last_admin boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_affected integer := 0;
  v_promotions integer := 0;
  v_demotions integer := 0;
  v_seat_changes integer := 0;
  v_conflicts integer := 0;
  v_active_admins integer := 0;
begin
  if p_organization_id is null
    or p_group_id is null
    or p_role not in ('admin','editor','viewer')
    or p_seat_type not in ('full','participant','viewer')
    or coalesce(p_priority, -1) not between 0 and 10000
    or char_length(coalesce(p_department_key, '')) > 160 then
    return query select 'invalid_input'::text, 0, 0, 0, 0, 0, false;
    return;
  end if;

  if not exists (
    select 1 from public.enterprise_scim_groups g
    where g.organization_id = p_organization_id and g.id = p_group_id
  ) then
    return query select 'group_not_found'::text, 0, 0, 0, 0, 0, false;
    return;
  end if;

  select count(*) into v_affected
  from public.enterprise_scim_group_members gm
  join public.enterprise_scim_identities i
    on i.organization_id = gm.organization_id and i.id = gm.identity_id and i.active = true
  where gm.organization_id = p_organization_id and gm.group_id = p_group_id;

  select
    count(*) filter (where coalesce(m.role, 'viewer') <> 'admin' and p_role = 'admin'),
    count(*) filter (where coalesce(m.role, 'viewer') = 'admin' and p_role <> 'admin'),
    count(*) filter (where coalesce(m.seat_type, 'full') <> p_seat_type)
  into v_promotions, v_demotions, v_seat_changes
  from public.enterprise_scim_group_members gm
  join public.enterprise_scim_identities i
    on i.organization_id = gm.organization_id and i.id = gm.identity_id and i.active = true
  join public.organization_members m
    on m.organization_id = i.organization_id and m.user_id = i.user_id and m.status = 'active'
  where gm.organization_id = p_organization_id and gm.group_id = p_group_id;

  select count(*) into v_conflicts
  from public.enterprise_scim_group_members gm
  join public.enterprise_scim_group_access_policies p
    on p.organization_id = gm.organization_id and p.group_id = gm.group_id
  where gm.organization_id = p_organization_id
    and gm.group_id <> p_group_id
    and p.enabled = true
    and p.priority = p_priority
    and (p.role, p.seat_type, coalesce(p.department_key, ''))
      is distinct from (p_role, p_seat_type, coalesce(nullif(trim(p_department_key), ''), ''));

  select count(*) into v_active_admins
  from public.organization_members m
  where m.organization_id = p_organization_id and m.status = 'active' and m.role = 'admin';

  return query select
    'previewed'::text,
    v_affected,
    v_promotions,
    v_demotions,
    v_seat_changes,
    v_conflicts,
    (p_role <> 'admin' and v_demotions >= v_active_admins and v_active_admins > 0);
end;
$$;

create or replace function public.apply_enterprise_group_access_policy_change_atomic(
  p_organization_id uuid,
  p_group_id uuid,
  p_role text,
  p_seat_type text,
  p_department_key text,
  p_priority integer,
  p_enabled boolean,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_reason text
)
returns table (outcome text, policy_id uuid, applied_version integer, affected_members integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preview record;
  v_before jsonb;
  v_result record;
begin
  if p_actor_user_id is null or char_length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    return query select 'invalid_input'::text, null::uuid, null::integer, 0;
    return;
  end if;

  select * into v_preview
  from public.preview_enterprise_group_access_policy_change(
    p_organization_id, p_group_id, p_role, p_seat_type, p_department_key, p_priority
  );

  if v_preview.outcome <> 'previewed' then
    return query select v_preview.outcome::text, null::uuid, null::integer, 0;
    return;
  end if;
  if v_preview.conflict_count > 0 then
    return query select 'mapping_conflict'::text, null::uuid, null::integer, v_preview.affected_members;
    return;
  end if;
  if v_preview.would_remove_last_admin then
    return query select 'last_admin_protection'::text, null::uuid, null::integer, v_preview.affected_members;
    return;
  end if;

  select to_jsonb(p) into v_before
  from public.enterprise_scim_group_access_policies p
  where p.organization_id = p_organization_id and p.group_id = p_group_id;

  select * into v_result
  from public.set_enterprise_scim_group_access_policy_atomic(
    p_organization_id, p_group_id, p_role, p_seat_type, p_department_key,
    p_priority, p_enabled, p_expected_version, p_actor_user_id
  );

  if v_result.outcome not in ('created','updated') then
    return query select v_result.outcome::text, v_result.policy_id, v_result.applied_version, v_preview.affected_members;
    return;
  end if;

  update public.enterprise_scim_group_access_policies p
  set change_reason = trim(p_reason), last_previewed_at = now()
  where p.id = v_result.policy_id;

  insert into public.enterprise_group_access_policy_events (
    organization_id, policy_id, group_id, actor_user_id, action, reason,
    before_state, after_state, affected_members
  )
  select p_organization_id, v_result.policy_id, p_group_id, p_actor_user_id,
    case when v_result.outcome = 'created' then 'created' else 'updated' end,
    trim(p_reason), v_before, to_jsonb(p), v_preview.affected_members
  from public.enterprise_scim_group_access_policies p
  where p.id = v_result.policy_id;

  return query select v_result.outcome::text, v_result.policy_id, v_result.applied_version, v_preview.affected_members;
end;
$$;

revoke all on function public.preview_enterprise_group_access_policy_change(uuid, uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.apply_enterprise_group_access_policy_change_atomic(uuid, uuid, text, text, text, integer, boolean, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.preview_enterprise_group_access_policy_change(uuid, uuid, text, text, text, integer) to service_role;
grant execute on function public.apply_enterprise_group_access_policy_change_atomic(uuid, uuid, text, text, text, integer, boolean, integer, uuid, text) to service_role;

commit;