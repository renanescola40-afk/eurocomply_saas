begin;

create or replace function public.enforce_enterprise_contract_write_barrier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_status text;
begin
  begin
    v_organization_id := nullif(
      case when tg_op = 'DELETE'
        then to_jsonb(old)->>'organization_id'
        else to_jsonb(new)->>'organization_id'
      end,
      ''
    )::uuid;
  exception
    when invalid_text_representation then
      raise exception using errcode = '22023', message = 'enterprise_contract_invalid_organization';
  end;

  if v_organization_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select contract.status into v_status
  from public.enterprise_contracts as contract
  where contract.organization_id = v_organization_id
    and contract.contract_mode = 'negotiated'
  order by
    case when contract.status not in ('expired','terminated') then 0 else 1 end,
    contract.updated_at desc,
    contract.id desc
  limit 1;

  if v_status in ('read_only','suspended','expired','terminated') then
    raise exception using
      errcode = '42501',
      message = 'enterprise_contract_write_blocked',
      detail = 'The negotiated Enterprise contract does not permit tenant data mutations.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.enforce_enterprise_contract_write_barrier() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
