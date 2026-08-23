begin;

-- P0 revenue-protection invariant:
-- authenticated identity and tenant membership are necessary but never sufficient
-- for direct access to paid product data. Mirror the canonical server billing
-- authority in one private RLS helper so PostgREST/browser calls cannot bypass
-- page, API or Server Action commercial authorization.

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

do $prerequisites$
begin
  if to_regclass('public.subscriptions') is null
     or to_regclass('public.stripe_events_processed') is null
     or to_regclass('public.enterprise_entitlement_sources') is null
     or to_regclass('public.enterprise_entitlement_snapshots') is null then
    raise exception 'payment-first commercial authority prerequisites are missing';
  end if;
end
$prerequisites$;

create or replace function app_private.has_commercial_authority(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
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
      and lower(coalesce(subscription.status, '')) in ('active','trialing')
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
  )
  select case
    when target_organization_id is null then false
    -- Signed-contract authority has precedence in the server resolver. If a
    -- current applied contract snapshot exists but carries an invalid plan, do
    -- not fall through to Stripe and accidentally broaden server behavior.
    when exists (select 1 from contract_candidate) then
      coalesce((
        select lower(trim(plan_code)) in (
          'starter','essential','basic','professional','pro','growth','business','enterprise'
        )
        from contract_candidate
        limit 1
      ), false)
    when exists (
      select 1
      from primary_live_authority authority
      where authority.live_authority = true
        and nullif(trim(coalesce(authority.plan, '')), '') is not null
    ) then
      coalesce((
        select lower(trim(plan)) in (
          'starter','essential','basic','professional','pro','growth','business','enterprise'
        )
        from primary_live_authority
        where live_authority = true
          and nullif(trim(coalesce(plan, '')), '') is not null
        limit 1
      ), false)
    else
      exists (
        select 1
        from primary_live_authority authority
        where authority.live_authority = true
          and nullif(trim(coalesce(authority.plan, '')), '') is null
          and lower(trim(coalesce(authority.tier, ''))) in (
            'starter','essential','basic','professional','pro','growth','business','enterprise'
          )
      )
  end;
$$;

revoke all on function app_private.has_commercial_authority(uuid) from public, anon;
grant execute on function app_private.has_commercial_authority(uuid) to authenticated, service_role;

comment on function app_private.has_commercial_authority(uuid) is
  'Fail-closed paid-product RLS authority: valid signed-contract entitlement or exact processed Stripe LIVE subscription authority only.';

-- Existing tenant/role policies remain responsible for horizontal authorization.
-- This RESTRICTIVE policy is an additional AND-condition: even an owner/admin of
-- the correct tenant gets no direct paid-product table access while unlicensed.
do $commercial_tables$
declare
  v_table_name text;
  v_commercial_tables constant text[] := array[
    'ai_systems',
    'ai_assessments',
    'ai_incidents',
    'documents',
    'risks',
    'vendors',
    'tasks',
    'compliance_tasks',
    'evidence_items',
    'onboarding_activation_runs',
    'monitoring_preferences',
    'notifications',
    'audit_events',
    'audit_logs',
    'invitations'
  ];
begin
  foreach v_table_name in array v_commercial_tables
  loop
    if to_regclass(format('public.%I', v_table_name)) is null then
      continue;
    end if;

    if not exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = v_table_name
        and column_info.column_name = 'organization_id'
    ) then
      raise exception 'commercial table public.% is missing organization_id', v_table_name;
    end if;

    execute format('alter table public.%I enable row level security', v_table_name);
    execute format('alter table public.%I force row level security', v_table_name);
    execute format('drop policy if exists payment_first_commercial_authority on public.%I', v_table_name);
    execute format(
      'create policy payment_first_commercial_authority on public.%I as restrictive for all to authenticated using (app_private.has_commercial_authority(organization_id)) with check (app_private.has_commercial_authority(organization_id))',
      v_table_name
    );
  end loop;
end
$commercial_tables$;

-- Retire the old workspace-era AI inventory data plane. Active localized routes
-- now converge on the canonical organization-scoped AI Systems surface/API.
-- Leaving these grants alive would preserve a second billing-unaware product API.
do $legacy_workspace_tables$
declare
  v_table_name text;
begin
  foreach v_table_name in array array['ai_tools', 'compliance_documents']
  loop
    if to_regclass(format('public.%I', v_table_name)) is not null then
      execute format('revoke all on table public.%I from public, anon, authenticated', v_table_name);
      execute format('grant select, insert, update, delete on table public.%I to service_role', v_table_name);
    end if;
  end loop;
end
$legacy_workspace_tables$;

-- Regulatory updates are a paid in-product feed. Direct authenticated table
-- reads have no tenant context on which to evaluate commercial authority, so
-- keep this global product dataset backend-owned.
do $global_product_tables$
begin
  if to_regclass('public.regulatory_updates') is not null then
    revoke all on table public.regulatory_updates from public, anon, authenticated;
    grant select, insert, update, delete on table public.regulatory_updates to service_role;
  end if;
end
$global_product_tables$;

-- Migration-level fail-closed verification.
do $verify$
declare
  missing_policy_count integer;
  forbidden_grant_count integer;
begin
  with targets(table_name) as (
    values
      ('ai_systems'),('ai_assessments'),('ai_incidents'),('documents'),('risks'),
      ('vendors'),('tasks'),('compliance_tasks'),('evidence_items'),
      ('onboarding_activation_runs'),('monitoring_preferences'),('notifications'),
      ('audit_events'),('audit_logs'),('invitations')
  )
  select count(*) into missing_policy_count
  from targets target
  where to_regclass(format('public.%I', target.table_name)) is not null
    and not exists (
      select 1
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = target.table_name
        and policy.policyname = 'payment_first_commercial_authority'
        and policy.permissive = 'RESTRICTIVE'
    );

  if missing_policy_count <> 0 then
    raise exception 'payment-first restrictive policies missing: %', missing_policy_count;
  end if;

  select count(*) into forbidden_grant_count
  from information_schema.table_privileges privilege
  where privilege.table_schema = 'public'
    and privilege.table_name in ('ai_tools','compliance_documents','regulatory_updates')
    and privilege.grantee in ('PUBLIC','anon','authenticated');

  if forbidden_grant_count <> 0 then
    raise exception 'legacy/global paid-product client grants survived: %', forbidden_grant_count;
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
