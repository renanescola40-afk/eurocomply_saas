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
  if current_setting('app.enterprise_contract_bypass', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

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
    return case when tg_op = 'DELETE' then old else new end;
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

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.enforce_enterprise_contract_write_barrier() from public, anon, authenticated;

do $$
declare
  v_table text;
  v_targets text[] := array[
    'ai_systems',
    'ai_tools',
    'ai_assessments',
    'ai_incidents',
    'ai_literacy_records',
    'compliance_documents',
    'documents',
    'evidence_items',
    'tasks',
    'vendors',
    'risks',
    'risk_register',
    'policies',
    'controls',
    'reports',
    'monitoring_preferences'
  ];
begin
  foreach v_table in array v_targets
  loop
    if exists (
      select 1
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_table
        and relation.relkind in ('r','p')
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = v_table
        and column_name = 'organization_id'
    ) then
      execute format('drop trigger if exists enterprise_contract_write_barrier on public.%I', v_table);
      execute format(
        'create trigger enterprise_contract_write_barrier before insert or update or delete on public.%I for each row execute function public.enforce_enterprise_contract_write_barrier()',
        v_table
      );
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
