begin;

-- Historical lineage used `compatibility`; the new billing reconciler briefly
-- used an internal `legacy_compatibility` label while binding live rows. Remove
-- the historical CHECK before that reconciliation so exact-SHA replay does not
-- fail, and mark historical compatibility rows explicitly for the forward step.
alter table public.enterprise_contracts
  add column if not exists contract_mode text not null default 'negotiated';

alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_mode_check;
alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_contract_mode_check;

update public.enterprise_contracts
set custom_features = coalesce(custom_features,'{}'::jsonb)
  || jsonb_build_object('legacy_compatibility',true)
where contract_mode='compatibility';

alter table public.enterprise_contracts
  add constraint enterprise_contracts_mode_bridge_check
  check (contract_mode in ('compatibility','legacy_compatibility','negotiated'));

commit;
