begin;

alter table public.enterprise_contracts
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists enterprise_contracts_updated_by_idx
  on public.enterprise_contracts (updated_by, updated_at desc)
  where updated_by is not null;

notify pgrst, 'reload schema';

commit;
