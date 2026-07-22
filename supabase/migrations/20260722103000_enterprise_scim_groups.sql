begin;

create table if not exists public.enterprise_scim_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete set null,
  external_id text,
  display_name text not null check (char_length(display_name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, display_name)
);

create unique index if not exists enterprise_scim_groups_external_id_unique
  on public.enterprise_scim_groups (organization_id, identity_connection_id, external_id)
  where external_id is not null;

create table if not exists public.enterprise_scim_group_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.enterprise_scim_groups(id) on delete cascade,
  identity_id uuid not null references public.enterprise_scim_identities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, identity_id)
);

create index if not exists enterprise_scim_group_members_org_group_idx
  on public.enterprise_scim_group_members (organization_id, group_id);

alter table public.enterprise_scim_groups enable row level security;
alter table public.enterprise_scim_groups force row level security;
alter table public.enterprise_scim_group_members enable row level security;
alter table public.enterprise_scim_group_members force row level security;
revoke all on public.enterprise_scim_groups from public, anon, authenticated;
revoke all on public.enterprise_scim_group_members from public, anon, authenticated;
grant all on public.enterprise_scim_groups to service_role;
grant all on public.enterprise_scim_group_members to service_role;

create or replace function public.upsert_enterprise_scim_group_atomic(
  p_organization_id uuid,
  p_identity_connection_id uuid,
  p_group_id uuid,
  p_external_id text,
  p_display_name text,
  p_member_identity_ids uuid[]
)
returns table (
  outcome text,
  group_id uuid,
  external_id text,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.enterprise_scim_groups%rowtype;
  v_member_id uuid;
begin
  if p_organization_id is null
    or coalesce(trim(p_display_name), '') = ''
    or char_length(trim(p_display_name)) > 160
    or coalesce(array_length(p_member_identity_ids, 1), 0) > 10000 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if p_identity_connection_id is not null and not exists (
    select 1 from public.enterprise_identity_connections c
    where c.id = p_identity_connection_id
      and c.organization_id = p_organization_id
      and c.status in ('verified', 'active')
  ) then
    return query select 'identity_connection_not_found'::text, null::uuid, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if p_group_id is null then
    insert into public.enterprise_scim_groups (
      organization_id, identity_connection_id, external_id, display_name
    ) values (
      p_organization_id, p_identity_connection_id, nullif(trim(p_external_id), ''), trim(p_display_name)
    )
    returning * into v_group;
  else
    update public.enterprise_scim_groups g
    set external_id = nullif(trim(p_external_id), ''),
        display_name = trim(p_display_name),
        updated_at = now()
    where g.id = p_group_id
      and g.organization_id = p_organization_id
    returning * into v_group;

    if not found then
      return query select 'not_found'::text, null::uuid, null::text, null::text, null::timestamptz, null::timestamptz;
      return;
    end if;
  end if;

  delete from public.enterprise_scim_group_members gm
  where gm.organization_id = p_organization_id and gm.group_id = v_group.id;

  foreach v_member_id in array coalesce(p_member_identity_ids, array[]::uuid[]) loop
    if not exists (
      select 1 from public.enterprise_scim_identities i
      where i.id = v_member_id and i.organization_id = p_organization_id and i.active = true
    ) then
      raise exception 'scim_group_member_out_of_scope';
    end if;

    insert into public.enterprise_scim_group_members (organization_id, group_id, identity_id)
    values (p_organization_id, v_group.id, v_member_id)
    on conflict do nothing;
  end loop;

  return query select 'upserted'::text, v_group.id, v_group.external_id, v_group.display_name, v_group.created_at, v_group.updated_at;
end;
$$;

create or replace function public.delete_enterprise_scim_group_atomic(
  p_organization_id uuid,
  p_group_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.enterprise_scim_groups g
  where g.id = p_group_id and g.organization_id = p_organization_id;
  if not found then return 'not_found'; end if;
  return 'deleted';
end;
$$;

revoke all on function public.upsert_enterprise_scim_group_atomic(uuid, uuid, uuid, text, text, uuid[]) from public, anon, authenticated;
revoke all on function public.delete_enterprise_scim_group_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.upsert_enterprise_scim_group_atomic(uuid, uuid, uuid, text, text, uuid[]) to service_role;
grant execute on function public.delete_enterprise_scim_group_atomic(uuid, uuid) to service_role;

commit;
