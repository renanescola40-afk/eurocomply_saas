begin;

-- Forward-only repair after the governed V23/33 package was promoted.
-- Equal signed-contract priorities are permitted by the existing source table.
-- Use the immutable source UUID as the stable secondary order so PostgreSQL and
-- the canonical server select the same source on every evaluation.

do $prerequisites$
begin
  if to_regclass('public.enterprise_entitlement_sources') is null
     or to_regclass('public.enterprise_entitlement_snapshots') is null
     or to_regclass('public.subscriptions') is null
     or to_regclass('public.stripe_events_processed') is null
     or to_regnamespace('app_private') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null
     or to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'deterministic commercial authority prerequisites are missing';
  end if;
end
$prerequisites$;

create or replace function app_private.resolve_commercial_plan(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with selected_contract_source as (
    select source.id
    from public.enterprise_entitlement_sources source
    where source.organization_id = target_organization_id
      and source.source_kind = 'signed_contract'
      and source.active = true
      and source.effective_from <= now()
      and (source.effective_until is null or source.effective_until > now())
    order by source.priority desc, source.id asc
    limit 1
  ),
  contract_candidate as (
    select snapshot.plan_code
    from public.enterprise_entitlement_snapshots snapshot
    join selected_contract_source source
      on source.id = snapshot.source_id
    where snapshot.organization_id = target_organization_id
      and snapshot.status = 'applied'
      and snapshot.valid_from <= now()
      and (snapshot.valid_until is null or snapshot.valid_until > now())
    order by snapshot.created_at desc
    limit 1
  ),
  primary_subscription as (
    select
      subscription.plan,
      subscription.tier,
      subscription.stripe_customer_id,
      subscription.stripe_subscription_id
    from public.subscriptions subscription
    where subscription.organization_id = target_organization_id
      and lower(coalesce(subscription.status, '')) = 'active'
    order by subscription.created_at desc
    limit 1
  ),
  primary_live_authority as (
    select
      subscription.plan,
      subscription.tier,
      exists (
        select 1
        from public.stripe_events_processed event
        where event.organization_id = target_organization_id
          and event.livemode = true
          and event.status = 'processed'
          and event.type in ('customer.subscription.created', 'customer.subscription.updated')
          and event.payload #>> '{data,object,id}' = subscription.stripe_subscription_id
          and case jsonb_typeof(event.payload #> '{data,object,customer}')
            when 'string' then event.payload #>> '{data,object,customer}'
            when 'object' then event.payload #>> '{data,object,customer,id}'
            else null
          end = subscription.stripe_customer_id
      ) as live_authority
    from primary_subscription subscription
    where nullif(trim(coalesce(subscription.stripe_customer_id, '')), '') is not null
      and nullif(trim(coalesce(subscription.stripe_subscription_id, '')), '') is not null
  ),
  raw_authority as (
    select case
      when target_organization_id is null then null::text
      when exists (select 1 from contract_candidate) then
        (select plan_code from contract_candidate limit 1)
      when exists (
        select 1
        from primary_live_authority authority
        where authority.live_authority = true
          and nullif(trim(coalesce(authority.plan, '')), '') is not null
      ) then
        (select plan from primary_live_authority where live_authority = true limit 1)
      else
        (select tier
         from primary_live_authority
         where live_authority = true
           and nullif(trim(coalesce(plan, '')), '') is null
         limit 1)
    end as plan_code
  )
  select case lower(trim(coalesce(plan_code, '')))
    when 'starter' then 'starter'
    when 'essential' then 'starter'
    when 'basic' then 'starter'
    when 'professional' then 'professional'
    when 'pro' then 'professional'
    when 'growth' then 'professional'
    when 'business' then 'business'
    when 'enterprise' then 'enterprise'
    else null
  end
  from raw_authority;
$$;

revoke all on function app_private.resolve_commercial_plan(uuid) from public, anon, authenticated;
grant execute on function app_private.resolve_commercial_plan(uuid) to service_role;

comment on function app_private.resolve_commercial_plan(uuid) is
  'Deterministic fail-closed commercial plan resolver: highest priority then immutable source UUID, with exact processed Stripe LIVE fallback.';

do $verify$
declare
  resolver_definition text;
begin
  select pg_get_functiondef('app_private.resolve_commercial_plan(uuid)'::regprocedure)
    into resolver_definition;

  if coalesce(resolver_definition, '') not like '%order by source.priority desc, source.id asc%' then
    raise exception 'commercial authority ordering is not deterministic';
  end if;

  if has_function_privilege('public', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE') then
    raise exception 'commercial plan resolver privilege boundary is invalid';
  end if;
end
$verify$;

commit;
