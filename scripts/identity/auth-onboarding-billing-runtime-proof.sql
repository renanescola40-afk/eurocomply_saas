\set ON_ERROR_STOP on

-- Read-only production proof for the authentication -> onboarding -> Stripe -> dashboard gate.
-- Inputs are supplied through psql variables and the output is a single JSON object.
-- Optional rollout columns are read through row JSON so missing columns make schemaReady false
-- instead of aborting the proof during SQL parsing.
with proof_input as (
  select
    :'organization_id'::uuid as organization_id,
    :'stripe_event_id'::text as stripe_event_id,
    lower(:'expected_plan'::text) as expected_plan,
    lower(:'target_environment'::text) as target_environment
),
schema_checks as (
  select
    to_regclass('public.organizations') is not null as organizations_table,
    to_regclass('public.organization_members') is not null as organization_members_table,
    to_regclass('public.onboarding_activation_runs') is not null as onboarding_activation_runs_table,
    to_regclass('public.subscriptions') is not null as subscriptions_table,
    to_regclass('public.stripe_events_processed') is not null as stripe_events_processed_table,
    to_regclass('public.audit_events') is not null as audit_events_table,
    to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)') is not null as activation_rpc,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'organizations' and column_name = 'onboarding_status'
    ) as organization_onboarding_status_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'organizations' and column_name = 'onboarding_completed_at'
    ) as organization_onboarding_completed_at_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'organizations' and column_name = 'selected_plan'
    ) as organization_selected_plan_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'tier'
    ) as subscription_tier_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'entitlements'
    ) as subscription_entitlements_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'stripe_customer_id'
    ) as subscription_customer_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'stripe_subscription_id'
    ) as subscription_id_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stripe_events_processed' and column_name = 'organization_id'
    ) as stripe_event_organization_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stripe_events_processed' and column_name = 'livemode'
    ) as stripe_event_livemode_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stripe_events_processed' and column_name = 'type'
    ) as stripe_event_type_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stripe_events_processed' and column_name = 'payload'
    ) as stripe_event_payload_column,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'audit_events' and column_name = 'event_hash'
    ) as audit_event_hash_column
),
organization_state as (
  select
    o.id,
    lower(coalesce(to_jsonb(o) ->> 'onboarding_status', '')) as onboarding_status,
    nullif(to_jsonb(o) ->> 'onboarding_completed_at', '') as onboarding_completed_at,
    lower(coalesce(to_jsonb(o) ->> 'selected_plan', '')) as selected_plan
  from public.organizations o
  join proof_input i on i.organization_id = o.id
),
activation_state as (
  select
    count(*) filter (where r.status = 'completed') as completed_runs,
    count(*) filter (
      where r.status = 'completed'
        and lower(coalesce(r.selected_plan, '')) = i.expected_plan
    ) as matching_plan_runs
  from proof_input i
  left join public.onboarding_activation_runs r on r.organization_id = i.organization_id
  group by i.organization_id, i.expected_plan
),
stripe_event_state as (
  select
    e.id,
    lower(coalesce(to_jsonb(e) ->> 'type', '')) as event_type,
    lower(coalesce(to_jsonb(e) ->> 'livemode', 'false')) = 'true' as livemode,
    e.status,
    e.error,
    e.processed_at,
    lower(coalesce(to_jsonb(e) ->> 'organization_id', '')) as organization_id,
    coalesce(to_jsonb(e) #>> '{payload,data,object,id}', '') as payload_subscription_id,
    coalesce(
      nullif(to_jsonb(e) #>> '{payload,data,object,customer,id}', ''),
      nullif(to_jsonb(e) #>> '{payload,data,object,customer}', ''),
      ''
    ) as payload_customer_id
  from public.stripe_events_processed e
  join proof_input i on i.stripe_event_id = e.id
),
subscription_state as (
  select
    s.organization_id,
    lower(coalesce(s.plan, '')) as plan,
    lower(coalesce(to_jsonb(s) ->> 'tier', s.plan, '')) as tier,
    lower(coalesce(s.status, '')) as status,
    nullif(trim(coalesce(s.stripe_customer_id, '')), '') as stripe_customer_id,
    nullif(trim(coalesce(s.stripe_subscription_id, '')), '') as stripe_subscription_id,
    jsonb_typeof(to_jsonb(s) -> 'entitlements') = 'object'
      and coalesce(to_jsonb(s) -> 'entitlements', '{}'::jsonb) <> '{}'::jsonb as has_entitlements
  from public.subscriptions s
  join proof_input i on i.organization_id = s.organization_id
  join stripe_event_state e on e.payload_subscription_id = s.stripe_subscription_id
),
target_audit_events as (
  select a.*
  from public.audit_events a
  join proof_input i on i.organization_id = a.organization_id
  left join subscription_state s on true
  where
    (a.action = 'webhook_received' and a.entity_type = 'stripe_webhook_event' and a.entity_id = i.stripe_event_id)
    or
    (a.action in ('billing.subscription_updated', 'subscription_synced')
      and a.entity_type = 'stripe_subscription'
      and a.entity_id = s.stripe_subscription_id)
),
audit_summary as (
  select
    count(*) filter (where action = 'webhook_received') as webhook_received_count,
    count(*) filter (where action = 'billing.subscription_updated') as subscription_updated_count,
    count(*) filter (where action = 'subscription_synced') as subscription_synced_count,
    bool_and(
      nullif(to_jsonb(target_audit_events) ->> 'event_hash', '') is not null
      and lower(coalesce(to_jsonb(target_audit_events) ->> 'hash_algorithm', '')) = 'sha256'
    ) as hashes_present,
    bool_and(
      nullif(to_jsonb(target_audit_events) ->> 'previous_hash', '') is null
      or exists (
        select 1
        from public.audit_events predecessor
        where predecessor.organization_id = target_audit_events.organization_id
          and to_jsonb(predecessor) ->> 'event_hash' = to_jsonb(target_audit_events) ->> 'previous_hash'
          and predecessor.created_at <= target_audit_events.created_at
      )
    ) as predecessor_links_resolve
  from target_audit_events
)
select jsonb_build_object(
  'schemaReady', (
    select
      organizations_table
      and organization_members_table
      and onboarding_activation_runs_table
      and subscriptions_table
      and stripe_events_processed_table
      and audit_events_table
      and activation_rpc
      and organization_onboarding_status_column
      and organization_onboarding_completed_at_column
      and organization_selected_plan_column
      and subscription_tier_column
      and subscription_entitlements_column
      and subscription_customer_column
      and subscription_id_column
      and stripe_event_organization_column
      and stripe_event_livemode_column
      and stripe_event_type_column
      and stripe_event_payload_column
      and audit_event_hash_column
    from schema_checks
  ),
  'organizationObserved', exists(select 1 from organization_state),
  'organizationOnboardingCompleted', coalesce((
    select onboarding_status = 'completed' and onboarding_completed_at is not null
    from organization_state
    limit 1
  ), false),
  'organizationPlanMatches', coalesce((
    select selected_plan = i.expected_plan
    from organization_state o
    cross join proof_input i
    limit 1
  ), false),
  'activationRunObserved', coalesce((select completed_runs > 0 from activation_state), false),
  'activationPlanMatches', coalesce((select matching_plan_runs > 0 from activation_state), false),
  'subscriptionObserved', exists(select 1 from subscription_state),
  'subscriptionActive', coalesce((
    select status in ('active', 'trialing') from subscription_state limit 1
  ), false),
  'subscriptionPlanMatches', coalesce((
    select s.plan = i.expected_plan and s.tier = i.expected_plan
    from subscription_state s cross join proof_input i limit 1
  ), false),
  'stripeBindingPresent', coalesce((
    select stripe_customer_id is not null and stripe_subscription_id is not null
    from subscription_state limit 1
  ), false),
  'entitlementsPresent', coalesce((select has_entitlements from subscription_state limit 1), false),
  'stripeEventProcessed', coalesce((
    select
      e.status = 'processed'
      and e.error is null
      and e.processed_at is not null
      and e.organization_id = i.organization_id::text
    from stripe_event_state e cross join proof_input i limit 1
  ), false),
  'stripeEventLiveMode', coalesce((select livemode from stripe_event_state limit 1), false),
  'stripeEventAuthoritativeType', coalesce((
    select event_type in ('customer.subscription.created', 'customer.subscription.updated')
    from stripe_event_state limit 1
  ), false),
  'stripeEventBindingMatches', coalesce((
    select
      e.payload_subscription_id = s.stripe_subscription_id
      and e.payload_customer_id = s.stripe_customer_id
    from stripe_event_state e
    join subscription_state s on s.stripe_subscription_id = e.payload_subscription_id
    limit 1
  ), false),
  'productionLiveAuthorityRequired', coalesce((
    select target_environment = 'production' from proof_input limit 1
  ), false),
  'webhookAuditObserved', coalesce((select webhook_received_count > 0 from audit_summary), false),
  'subscriptionUpdatedAuditObserved', coalesce((select subscription_updated_count > 0 from audit_summary), false),
  'subscriptionSyncedAuditObserved', coalesce((select subscription_synced_count > 0 from audit_summary), false),
  'auditHashesPresent', coalesce((select hashes_present from audit_summary), false),
  'auditPredecessorLinksResolve', coalesce((select predecessor_links_resolve from audit_summary), false)
)::text;
