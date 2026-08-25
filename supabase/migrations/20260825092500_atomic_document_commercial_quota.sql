begin;

-- P0 business-logic / revenue-protection invariant.
--
-- The application performs a fail-closed preflight document count for UX, but a
-- count-then-insert sequence is not a concurrency authority: two requests can
-- both observe N-1 and race past the plan limit. This trigger makes the database
-- the final serialized quota authority for every prospective document INSERT,
-- including service-role application writes and any future write path.
--
-- This migration is intentionally ordered after the payment-first data plane and
-- controlled-document reconciliation in the governed forward package. It does
-- not grant browser write access and it does not weaken existing RLS.

do $prerequisites$
begin
  if to_regclass('public.documents') is null
     or to_regclass('public.subscriptions') is null
     or to_regclass('public.stripe_events_processed') is null
     or to_regclass('public.enterprise_entitlement_sources') is null
     or to_regclass('public.enterprise_entitlement_snapshots') is null
     or to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'atomic document quota prerequisites are missing';
  end if;
end
$prerequisites$;

-- Resolve the same durable commercial plan precedence used by the server:
-- signed contract first; otherwise the latest active subscription only when an
-- exact processed Stripe LIVE subscription event proves customer/subscription
-- correlation. Invalid authoritative contract plans fail closed and never fall
-- through to Stripe.
create or replace function app_private.resolve_commercial_plan(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with contract_candidate as (
    select snapshot.plan_code
    from public.enterprise_entitlement_sources source
    join lateral (
      select candidate.plan_code
      from public.enterprise_entitlement_snapshots candidate
      where candidate.organization_id = source.organization_id
        and candidate.source_id = source.id
        and candidate.status = 'applied'
        and candidate.valid_from <= now()
        and (candidate.valid_until is null or candidate.valid_until > now())
      order by candidate.created_at desc
      limit 1
    ) snapshot on true
    where source.organization_id = target_organization_id
      and source.source_kind = 'signed_contract'
      and source.active = true
      and source.effective_from <= now()
      and (source.effective_until is null or source.effective_until > now())
    order by source.priority desc
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
  'Canonical fail-closed commercial plan resolver for database-enforced quota invariants; signed contract precedes exact processed Stripe LIVE authority.';

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

  -- Service-role application writes bypass RLS, so the trigger independently
  -- preserves the payment-first invariant instead of trusting the caller.
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
  -- commercial mutation/audit authority. All quota-changing writes for a tenant
  -- therefore serialize on one transaction-level lock.
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
  resolver_oid oid := to_regprocedure('app_private.resolve_commercial_plan(uuid)');
  quota_oid oid := to_regprocedure('app_private.enforce_document_commercial_quota()');
begin
  if resolver_oid is null or quota_oid is null then
    raise exception 'document commercial quota functions are missing';
  end if;

  if has_function_privilege('anon', resolver_oid, 'EXECUTE')
     or has_function_privilege('authenticated', resolver_oid, 'EXECUTE')
     or has_function_privilege('anon', quota_oid, 'EXECUTE')
     or has_function_privilege('authenticated', quota_oid, 'EXECUTE') then
    raise exception 'document commercial quota functions expose browser execution';
  end if;

  if not has_function_privilege('service_role', resolver_oid, 'EXECUTE')
     or not has_function_privilege('service_role', quota_oid, 'EXECUTE') then
    raise exception 'document commercial quota service-role execution is missing';
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
