begin;

alter table public.enterprise_scim_groups
  add constraint enterprise_scim_groups_org_id_id_unique
  unique (organization_id, id);

create table if not exists public.enterprise_scim_group_access_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  seat_type text not null check (seat_type in ('full', 'participant', 'viewer')),
  department_key text,
  priority integer not null default 100 check (priority between 0 and 10000),
  enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_scim_group_access_policy_group_fk
    foreign key (organization_id, group_id)
    references public.enterprise_scim_groups(organization_id, id)
    on delete cascade,
  unique (organization_id, group_id)
);

create index if not exists enterprise_scim_group_access_policy_resolution_idx
  on public.enterprise_scim_group_access_policies (
    organization_id,
    enabled,
    priority,
    group_id
  );

alter table public.enterprise_scim_group_access_policies enable row level security;
alter table public.enterprise_scim_group_access_policies force row level security;
revoke all on public.enterprise_scim_group_access_policies from public, anon, authenticated;
grant all on public.enterprise_scim_group_access_policies to service_role;

create or replace function public.set_enterprise_scim_group_access_policy_atomic(
  p_organization_id uuid,
  p_group_id uuid,
  p_role text,
  p_seat_type text,
  p_department_key text,
  p_priority integer,
  p_enabled boolean,
  p_expected_version integer,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  policy_id uuid,
  applied_version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.enterprise_scim_group_access_policies%rowtype;
begin
  if p_organization_id is null
    or p_group_id is null
    or p_role not in ('admin', 'editor', 'viewer')
    or p_seat_type not in ('full', 'participant', 'viewer')
    or coalesce(p_priority, -1) not between 0 and 10000
    or p_actor_user_id is null
    or p_expected_version is null
    or p_expected_version < 0
    or char_length(coalesce(p_department_key, '')) > 160 then
    return query select 'invalid_input'::text, null::uuid, null::integer;
    return;
  end if;

  if not exists (
    select 1
    from public.enterprise_scim_groups g
    where g.organization_id = p_organization_id
      and g.id = p_group_id
  ) then
    return query select 'group_not_found'::text, null::uuid, null::integer;
    return;
  end if;

  select * into v_policy
  from public.enterprise_scim_group_access_policies p
  where p.organization_id = p_organization_id
    and p.group_id = p_group_id
  for update;

  if found then
    if v_policy.version <> p_expected_version then
      return query select 'version_conflict'::text, v_policy.id, v_policy.version;
      return;
    end if;

    update public.enterprise_scim_group_access_policies p
    set role = p_role,
        seat_type = p_seat_type,
        department_key = nullif(trim(p_department_key), ''),
        priority = p_priority,
        enabled = coalesce(p_enabled, true),
        version = p.version + 1,
        updated_by = p_actor_user_id,
        updated_at = now()
    where p.id = v_policy.id
    returning * into v_policy;

    return query select 'updated'::text, v_policy.id, v_policy.version;
    return;
  end if;

  if p_expected_version <> 0 then
    return query select 'version_conflict'::text, null::uuid, 0;
    return;
  end if;

  insert into public.enterprise_scim_group_access_policies (
    organization_id,
    group_id,
    role,
    seat_type,
    department_key,
    priority,
    enabled,
    created_by,
    updated_by
  ) values (
    p_organization_id,
    p_group_id,
    p_role,
    p_seat_type,
    nullif(trim(p_department_key), ''),
    p_priority,
    coalesce(p_enabled, true),
    p_actor_user_id,
    p_actor_user_id
  )
  returning * into v_policy;

  return query select 'created'::text, v_policy.id, v_policy.version;
end;
$$;

create or replace function public.resolve_enterprise_scim_group_access(
  p_organization_id uuid,
  p_identity_id uuid
)
returns table (
  outcome text,
  role text,
  seat_type text,
  department_key text,
  source_group_id uuid,
  source_priority integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_top record;
  v_conflicts integer;
begin
  if p_organization_id is null or p_identity_id is null then
    return query select 'invalid_input'::text, null::text, null::text, null::text, null::uuid, null::integer;
    return;
  end if;

  if not exists (
    select 1
    from public.enterprise_scim_identities i
    where i.organization_id = p_organization_id
      and i.id = p_identity_id
      and i.active = true
  ) then
    return query select 'identity_not_found'::text, null::text, null::text, null::text, null::uuid, null::integer;
    return;
  end if;

  select p.role, p.seat_type, p.department_key, p.group_id, p.priority
  into v_top
  from public.enterprise_scim_group_members gm
  join public.enterprise_scim_group_access_policies p
    on p.organization_id = gm.organization_id
   and p.group_id = gm.group_id
  where gm.organization_id = p_organization_id
    and gm.identity_id = p_identity_id
    and p.enabled = true
  order by p.priority asc, p.group_id asc
  limit 1;

  if not found then
    return query select 'no_mapping'::text, null::text, null::text, null::text, null::uuid, null::integer;
    return;
  end if;

  select count(*) into v_conflicts
  from public.enterprise_scim_group_members gm
  join public.enterprise_scim_group_access_policies p
    on p.organization_id = gm.organization_id
   and p.group_id = gm.group_id
  where gm.organization_id = p_organization_id
    and gm.identity_id = p_identity_id
    and p.enabled = true
    and p.priority = v_top.priority
    and (p.role, p.seat_type, coalesce(p.department_key, ''))
      is distinct from (v_top.role, v_top.seat_type, coalesce(v_top.department_key, ''));

  if v_conflicts > 0 then
    return query select 'mapping_conflict'::text, null::text, null::text, null::text, null::uuid, v_top.priority;
    return;
  end if;

  return query select
    'resolved'::text,
    v_top.role::text,
    v_top.seat_type::text,
    v_top.department_key::text,
    v_top.group_id::uuid,
    v_top.priority::integer;
end;
$$;

revoke all on function public.set_enterprise_scim_group_access_policy_atomic(uuid, uuid, text, text, text, integer, boolean, integer, uuid) from public, anon, authenticated;
revoke all on function public.resolve_enterprise_scim_group_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_enterprise_scim_group_access_policy_atomic(uuid, uuid, text, text, text, integer, boolean, integer, uuid) to service_role;
grant execute on function public.resolve_enterprise_scim_group_access(uuid, uuid) to service_role;

commit;
