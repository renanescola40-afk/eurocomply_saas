begin;

-- A Stripe subscription is a globally unique provider identity and must bind to
-- at most one Enterprise contract. The v3 webhook selector intentionally uses
-- an existing subscription binding as an authoritative lookup key, so allowing
-- duplicate bindings would make dispatch depend on row ordering.
do $duplicate_guard$
begin
  if exists (
    select contract.stripe_subscription_id
    from public.enterprise_contracts contract
    where contract.stripe_subscription_id is not null
    group by contract.stripe_subscription_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_enterprise_stripe_subscription_binding';
  end if;
end
$duplicate_guard$;

create unique index if not exists enterprise_contracts_stripe_subscription_uidx
  on public.enterprise_contracts(stripe_subscription_id)
  where stripe_subscription_id is not null;

do $verify$
declare
  binding_index record;
begin
  select
    idx.indisunique as is_unique,
    pg_get_expr(idx.indpred, idx.indrelid) as predicate
  into binding_index
  from pg_class index_relation
  join pg_index idx on idx.indexrelid=index_relation.oid
  join pg_class table_relation on table_relation.oid=idx.indrelid
  join pg_namespace namespace on namespace.oid=table_relation.relnamespace
  where namespace.nspname='public'
    and table_relation.relname='enterprise_contracts'
    and index_relation.relname='enterprise_contracts_stripe_subscription_uidx';

  if not found
     or binding_index.is_unique is not true
     or binding_index.predicate is null
     or binding_index.predicate not like '%stripe_subscription_id IS NOT NULL%' then
    raise exception 'enterprise_stripe_subscription_binding_uniqueness_not_enforced';
  end if;
end
$verify$;

commit;
