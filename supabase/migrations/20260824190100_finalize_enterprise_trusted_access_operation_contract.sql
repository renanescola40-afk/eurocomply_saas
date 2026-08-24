begin;

-- Final compatibility layer for the current server worker. The historical
-- group-access persistence RPC depended on group tables that are not part of
-- the governed V20 SCIM plane. The current queue reconciles the SCIM identity's
-- role/seat desired state into organization_members, so persistence only needs
-- to prove the identity/member tenant binding after the atomic licensing write.

create or replace function public.seed_enterprise_access_operation_items(
  p_operation_id uuid,
  p_limit integer default 10000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_inserted integer := 0;
begin
  select * into v_operation
  from public.enterprise_access_operations
  where id=p_operation_id
  for update;

  if not found then raise exception 'access_operation_not_found'; end if;
  if v_operation.status not in ('pending','paused','retry') then return 0; end if;

  insert into public.enterprise_access_operation_items (
    operation_id,organization_id,identity_id,membership_id,user_id,
    previous_role,requested_role,previous_seat_type,requested_seat_type,
    idempotency_key,before_snapshot
  )
  select
    v_operation.id,
    i.organization_id,
    i.id,
    m.id,
    i.user_id,
    lower(coalesce(m.role,'')),
    lower(i.role),
    lower(coalesce(m.seat_type,'full')),
    lower(i.seat_type),
    'access-op:' || encode(public.digest(
      v_operation.id::text || ':' || i.id::text || ':' || i.role || ':' || i.seat_type,
      'sha256'
    ),'hex'),
    jsonb_build_object('role',m.role,'seatType',m.seat_type,'status',m.status)
  from public.enterprise_scim_identities i
  join public.organization_members m
    on m.organization_id=i.organization_id and m.user_id=i.user_id
  where i.organization_id=v_operation.organization_id
    and i.active=true
    and m.status='active'
    and lower(coalesce(m.role,'')) <> 'owner'
    and (
      lower(coalesce(m.role,'')) is distinct from lower(i.role)
      or lower(coalesce(m.seat_type,'full')) is distinct from lower(i.seat_type)
    )
  order by i.id
  limit least(greatest(coalesce(p_limit,10000),1),10000)
  on conflict (operation_id,identity_id) do nothing;

  get diagnostics v_inserted=row_count;
  update public.enterprise_access_operations
  set total_candidates=(
        select count(*)
        from public.enterprise_access_operation_items
        where operation_id=v_operation.id
      ),
      updated_at=now()
  where id=v_operation.id;

  return v_inserted;
end;
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
set search_path = pg_catalog
as $$
begin
  if p_organization_id is null
     or p_identity_id is null
     or p_membership_id is null
     or lower(coalesce(p_role,'')) not in ('admin','editor','viewer')
     or lower(coalesce(p_seat_type,'')) not in ('full','participant','viewer') then
    return 'invalid_input';
  end if;

  if not exists (
    select 1
    from public.enterprise_scim_identities i
    join public.organization_members m
      on m.organization_id=i.organization_id
     and m.user_id=i.user_id
     and m.id=p_membership_id
    where i.organization_id=p_organization_id
      and i.id=p_identity_id
      and i.active=true
      and lower(i.role)=lower(p_role)
      and lower(i.seat_type)=lower(p_seat_type)
      and m.status='active'
      and lower(m.role)=lower(p_role)
      and lower(m.seat_type)=lower(p_seat_type)
  ) then
    return 'membership_tenant_mismatch';
  end if;

  -- Department/group arguments remain in the stable RPC signature for worker
  -- compatibility. They are deliberately non-authoritative until a governed
  -- group-policy plane is reconciled into Production.
  perform p_department_key, p_source_group_id, p_source_priority;
  return 'persisted';
end;
$$;

revoke all on function public.seed_enterprise_access_operation_items(uuid,integer) from public,anon,authenticated;
revoke all on function public.persist_enterprise_group_access_reconciliation(uuid,uuid,uuid,text,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.seed_enterprise_access_operation_items(uuid,integer) to service_role;
grant execute on function public.persist_enterprise_group_access_reconciliation(uuid,uuid,uuid,text,text,text,uuid,integer) to service_role;

commit;
