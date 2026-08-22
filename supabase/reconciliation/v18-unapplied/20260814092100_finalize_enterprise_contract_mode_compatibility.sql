begin;

alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_mode_bridge_check;
alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_contract_mode_check;
alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_mode_check;

update public.enterprise_contracts
set contract_mode='compatibility'
where contract_mode='legacy_compatibility';

alter table public.enterprise_contracts
  add constraint enterprise_contracts_mode_check
  check (contract_mode in ('compatibility','negotiated'));

do $verify$
begin
  if exists (
    select 1 from public.enterprise_contracts
    where contract_mode not in ('compatibility','negotiated')
  ) then
    raise exception 'Enterprise contract mode reconciliation is incomplete';
  end if;

  if exists (
    select 1 from public.enterprise_contracts
    where coalesce((custom_features ->> 'legacy_compatibility')::boolean,false)
      and contract_mode<>'compatibility'
  ) then
    raise exception 'Legacy compatibility contracts are not canonicalized';
  end if;
end
$verify$;

commit;
