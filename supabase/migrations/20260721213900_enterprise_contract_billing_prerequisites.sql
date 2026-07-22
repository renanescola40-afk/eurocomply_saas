begin;

alter table public.enterprise_contracts
  add column if not exists contract_mode text not null default 'negotiated',
  add column if not exists latest_stripe_invoice_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_contracts_mode_check'
  ) then
    alter table public.enterprise_contracts
      add constraint enterprise_contracts_mode_check
      check (contract_mode in ('compatibility','negotiated'));
  end if;
end;
$$;

update public.enterprise_contracts
set contract_mode = 'compatibility', updated_at = now()
where contract_code like 'LEGACY-%'
  and contract_mode <> 'compatibility';

create index if not exists enterprise_contracts_negotiated_current_idx
  on public.enterprise_contracts (organization_id, status, updated_at desc)
  where contract_mode = 'negotiated';

notify pgrst, 'reload schema';

commit;
