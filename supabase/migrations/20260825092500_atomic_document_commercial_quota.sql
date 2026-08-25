begin;

-- P0 business-logic / revenue-protection invariants.
--
-- 1. The canonical server chooses the highest-priority active signed-contract
--    source first and only then resolves its latest valid applied snapshot. A
--    lower-priority contract must never become authority merely because the
--    selected higher-priority source has no valid snapshot.
-- 2. The application performs a fail-closed document quota preflight, but a
--    count-then-insert sequence is not a concurrency authority. PostgreSQL must
--    serialize the final commercial document capacity decision.
--
-- This forward identity is ordered after the existing payment-first data plane.
-- It tightens that already-governed authority without modifying its historical
-- migration bytes, then adds the final serialized document INSERT invariant.

do $prerequisites$
begin
  if to_regclass('public.documents') is null
     or to_regclass('public.subscriptions') is null
     or to_regclass('public.stripe_events_processed') is null
     or to_regclass('public.enterprise_entitlement_sources') is null
     or to_regclass('public.enterprise_entitlement_snapshots') is null
     or to_regnamespace('app_private') is null
     or to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'commercial authority/document quota prerequisites are missing';
  end if;
end
$prerequisites$;

-- Exact database mirror of src/server/billing/subscription-authority.ts plus
-- src/server/queries/subscription.ts plan normalization. The selected contract
-- source is resolved BEFORE its snapshot. If that selected source has no valid
-- applied snapshot, no lower-priority contract is consulted and the canonical
-- server flow may fall back to exact processed Stripe LIVE authority.
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
    order by source.priority desc
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
      -- Server parity: only a valid applied snapshot on the selected highest-
      -- priority contract source becomes contract authority. A selected source
      -- without such a snapshot returns no contract candidate, so the server's
      -- exact processed Stripe LIVE fallback remains available.
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
  'Exact fail-closed commercial plan resolver: highest-priority signed-contract source with a valid applied snapshot first; otherwise exact processed Stripe LIVE active authority.';

-- Tighten the existing payment-first RLS authority to the exact same resolver.
-- Authenticated needs EXECUTE because restrictive RLS policies call this helper;
-- anon and PUBLIC remain unable to invoke it directly.
create or replace function app_private.has_commercial_authority(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.resolve_commercial_plan(target_organization_id) is not null;
$$;

revoke all on function app_private.has_commercial_authority(uuid) from public, anon;
grant execute on function app_private.has_commercial_authority(uuid) to authenticated, service_role;

comment on function app_private.has_commercial_authority(uuid) is
  'Fail-closed payment-first authority with exact server precedence; usable by authenticated restrictive RLS and trusted service-role backend only.';

create or replace function app_private.enforce_document_commercial_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limit bigint;
  v_count bigint;
begin
  if new.organization_id is null then
    raise exception using
      errcode = '23514',
      message = 'document organization is required';
  end if;

  -- Service-role application writes bypass RLS. Reassert the canonical boolean
  -- payment-first authority inside the database write boundary, then resolve the
  -- exact authoritative plan for the capacity decision.
  if not app_private.has_commercial_authority(new.organization_id) then
    raise exception using
      errcode = '42501',
      message = 'document_subscription_required';
  end if;

  v_plan := app_private.resolve_commercial_plan(new.organization_id);

  if v_plan is null then
    raise exception using
      errcode = '42501',
      message = 'document_commercial_plan_unavailable';
  end if;

  -- Exact canonical catalog document limits in src/lib/billing/plans.ts.
  v_limit := case v_plan
    when 'starter' then 100
    when 'professional' then 1000
    when 'business' then 10000
    when 'enterprise' then null
    else 0
  end;

  if v_limit is null then
    return new;
  end if;

  -- Use the same organization-scoped advisory key as the existing atomic
  -- vendor/risk mutation and audit-chain authorities. All quota-changing writes
  -- for a tenant serialize on one transaction-level lock.
  perform pg_advisory_xact_lock(hashtext(new.organization_id::text));

  select count(*)::bigint
    into v_count
  from public.documents document
  where document.organization_id = new.organization_id;

  if v_count >= v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'document_quota_exceeded',
      detail = format('organization=%s plan=%s current=%s limit=%s', new.organization_id, v_plan, v_count, v_limit);
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated;
grant execute on function app_private.enforce_document_commercial_quota() to service_role;

drop trigger if exists enforce_document_commercial_quota on public.documents;
create trigger enforce_document_commercial_quota
before insert on public.documents
for each row
execute function app_private.enforce_document_commercial_quota();

comment on function app_private.enforce_document_commercial_quota() is
  'Fail-closed serialized document INSERT authority: durable commercial license plus canonical per-plan quota.';

-- Migration-level fail-closed proof.
do $verify$
declare
  authority_oid oid := to_regprocedure('app_private.has_commercial_authority(uuid)');
  resolver_oid oid := to_regprocedure('app_private.resolve_commercial_plan(uuid)');
  quota_oid oid := to_regprocedure('app_private.enforce_document_commercial_quota()');
begin
  if authority_oid is null or resolver_oid is null or quota_oid is null then
    raise exception 'commercial authority/document quota functions are missing';
  end if;

  if has_function_privilege('anon', authority_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', authority_oid, 'EXECUTE')
     or not has_function_privilege('service_role', authority_oid, 'EXECUTE') then
    raise exception 'payment-first authority execution privileges are not canonical';
  end if;

  if has_function_privilege('anon', resolver_oid, 'EXECUTE')
     or has_function_privilege('authenticated', resolver_oid, 'EXECUTE')
     or has_function_privilege('anon', quota_oid, 'EXECUTE')
     or has_function_privilege('authenticated', quota_oid, 'EXECUTE') then
    raise exception 'private commercial resolver/quota functions expose browser execution';
  end if;

  if not has_function_privilege('service_role', resolver_oid, 'EXECUTE')
     or not has_function_privilege('service_role', quota_oid, 'EXECUTE') then
    raise exception 'commercial resolver/quota service-role execution is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.documents'::regclass
      and tgname = 'enforce_document_commercial_quota'
      and not tgisinternal
  ) then
    raise exception 'document commercial quota trigger is missing';
  end if;
end
$verify$;

commit;