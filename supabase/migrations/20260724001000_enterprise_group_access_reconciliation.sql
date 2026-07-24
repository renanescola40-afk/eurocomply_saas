begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_organization_id_id_key'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_id_key
      unique (organization_id, id);
  end if;
end;
$$;

create table if not exists public.enterprise_member_department_assignments (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  department_key text not null check (char_length(department_key) between 1 and 160),
  source_group_id uuid,
  source_priority integer,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, membership_id),
  constraint enterprise_member_department_membership_fk
    foreign key (organization_id, membership_id)
    references public.organization_members(organization_id, id)
    on delete cascade,
  constraint enterprise_member_department_group_fk
    foreign key (organization_id, source_group_id)
    references public.enterprise_scim_groups(organization_id, id)
    on delete set null
);

alter table public.enterprise_member_department_assignments enable row level security;
alter table public.enterprise_member_department_assignments force row level security;
revoke all on public.enterprise_member_department_assignments from public, anon, authenticated;
grant all on public.enterprise_member_department_assignments to service_role;

create or replace function public.list_enterprise_group_access_reconciliation_candidates(
  p_organization_id uuid,
  p_limit integer default 100
)
returns table (
  identity_id uuid,
  user_id uuid,
  membership_id uuid,
  current_role text,
  current_seat_type text,
  resolved_role text,
  resolved_seat_type text,
  department_key text,
  source_group_id uuid,
  source_priority integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    i.user_id,
    i.membership_id,
    i.role,
    i.seat_type,
    resolved.role,
    resolved.seat_type,
    resolved.department_key,
    resolved.source_group_id,
    resolved.source_priority
  from public.enterprise_scim_identities i
  join public.organization_members m
    on m.organization_id = i.organization_id
   and m.id = i.membership_id
   and m.user_id = i.user_id
  cross join lateral public.resolve_enterprise_scim_group_access(
    p_organization_id,
    i.id
  ) resolved
  where i.organization_id = p_organization_id
    and i.active = true
    and i.membership_id is not null
    and resolved.outcome = 'resolved'
    and (
      i.role is distinct from resolved.role
      or i.seat_type is distinct from resolved.seat_type
      or coalesce((
        select d.department_key
        from public.enterprise_member_department_assignments d
        where d.organization_id = p_organization_id
          and d.membership_id = i.membership_id
      ), '') is distinct from coalesce(resolved.department_key, '')
    )
  order by resolved.source_priority asc, i.id asc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

create or replace function public.persist_enterprise_group_access_reconciliation(
  p_organization_id uuid,
  p_identity_id uuid,
  p_membership_id uuid,
  p_role text,
  p_seat_type text,
  p_department_key text,
  p_source_group_id uuid,
  p_source_priority integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_organization_id is null
    or p_identity_id is null
    or p_membership_id is null
    or p_role not in ('admin', 'editor', 'viewer')
    or p_seat_type not in ('full', 'participant', 'viewer') then
    return 'invalid_input';
  end if;

  if not exists (
    select 1
    from public.enterprise_scim_identities i
    join public.organization_members m
      on m.organization_id = i.organization_id
     and m.id = p_membership_id
     and m.user_id = i.user_id
    where i.organization_id = p_organization_id
      and i.id = p_identity_id
      and i.active = true
  ) then
    return 'membership_tenant_mismatch';
  end if;

  update public.enterprise_scim_identities i
  set role = p_role,
      seat_type = p_seat_type,
      membership_id = p_membership_id,
      updated_at = now()
  where i.organization_id = p_organization_id
    and i.id = p_identity_id
    and i.active = true;

  if not found then return 'identity_not_found'; end if;

  if nullif(trim(p_department_key), '') is null then
    delete from public.enterprise_member_department_assignments d
    where d.organization_id = p_organization_id
      and d.membership_id = p_membership_id;
  else
    insert into public.enterprise_member_department_assignments (
      organization_id,
      membership_id,
      department_key,
      source_group_id,
      source_priority
    ) values (
      p_organization_id,
      p_membership_id,
      trim(p_department_key),
      p_source_group_id,
      p_source_priority
    )
    on conflict (organization_id, membership_id) do update
    set department_key = excluded.department_key,
        source_group_id = excluded.source_group_id,
        source_priority = excluded.source_priority,
        version = public.enterprise_member_department_assignments.version + 1,
        updated_at = now();
  end if;

  return 'persisted';
end;
$$;

revoke all on function public.list_enterprise_group_access_reconciliation_candidates(uuid, integer) from public, anon, authenticated;
revoke all on function public.persist_enterprise_group_access_reconciliation(uuid, uuid, uuid, text, text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.list_enterprise_group_access_reconciliation_candidates(uuid, integer) to service_role;
grant execute on function public.persist_enterprise_group_access_reconciliation(uuid, uuid, uuid, text, text, text, uuid, integer) to service_role;

commit;
