\set ON_ERROR_STOP on

-- Read-only exact-tenant observation of the Stripe billing lifecycle evidence chain.
-- The workflow enforces default_transaction_read_only=on through PGOPTIONS.
-- Inputs are supplied through psql variables and the output is one JSON object.
with proof_input as (
  select
    :'organization_id'::uuid as organization_id,
    :'stripe_subscription_id'::text as stripe_subscription_id,
    :'stripe_event_id'::text as stripe_event_id,
    lower(:'target_environment'::text) as target_environment
),
schema_checks as (
  select
    to_regclass('public.subscriptions') is not null as subscriptions_table,
    to_regclass('public.billing_lifecycle_requests') is not null as lifecycle_table,
    to_regclass('public.stripe_events_processed') is not null as stripe_events_table,
    to_regclass('public.audit_events') is not null as audit_events_table,
    exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='billing_lifecycle_requests' and column_name='request_fingerprint'
    ) as request_fingerprint_column,
    exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='billing_lifecycle_requests' and column_name='result_snapshot'
    ) as result_snapshot_column,
    exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='stripe_events_processed' and column_name='livemode'
    ) as stripe_livemode_column,
    exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='stripe_events_processed' and column_name='payload'
    ) as stripe_payload_column
),
subscription_state as (
  select
    s.organization_id,
    lower(coalesce(s.status,'')) as status,
    nullif(trim(coalesce(s.stripe_customer_id,'')), '') as stripe_customer_id,
    nullif(trim(coalesce(s.stripe_subscription_id,'')), '') as stripe_subscription_id
  from public.subscriptions s
  join proof_input i
    on i.organization_id=s.organization_id
   and i.stripe_subscription_id=s.stripe_subscription_id
  order by s.updated_at desc
  limit 1
),
stripe_event_state as (
  select
    e.id,
    lower(coalesce(to_jsonb(e)->>'type','')) as event_type,
    lower(coalesce(to_jsonb(e)->>'livemode','false'))='true' as livemode,
    e.status,
    e.error,
    e.processed_at,
    lower(coalesce(to_jsonb(e)->>'organization_id','')) as organization_id,
    coalesce(to_jsonb(e)#>>'{payload,data,object,id}','') as payload_subscription_id,
    coalesce(
      nullif(to_jsonb(e)#>>'{payload,data,object,customer,id}',''),
      nullif(to_jsonb(e)#>>'{payload,data,object,customer}',''),
      ''
    ) as payload_customer_id
  from public.stripe_events_processed e
  join proof_input i on i.stripe_event_id=e.id
),
completed_requests as (
  select r.*
  from public.billing_lifecycle_requests r
  join proof_input i
    on i.organization_id=r.organization_id
   and i.stripe_subscription_id=r.stripe_subscription_id
  where r.status='completed'
    and r.action in ('upgrade','downgrade','cancel','reactivate')
),
latest_completed as (
  select distinct on (action)
    id,
    action,
    source_plan,
    target_plan,
    completed_at,
    request_fingerprint,
    result_snapshot
  from completed_requests
  order by action, completed_at desc nulls last, requested_at desc
),
request_summary as (
  select
    count(*)=4 as all_actions_present,
    bool_and(completed_at is not null) as all_completed_at_present,
    bool_and(request_fingerprint ~ '^[0-9a-f]{64}$') as fingerprints_valid,
    bool_and(
      jsonb_typeof(result_snapshot)='object'
      and result_snapshot->>'subscriptionId'=(select stripe_subscription_id from proof_input)
    ) as snapshots_bound,
    bool_or(action='upgrade' and source_plan is distinct from target_plan and result_snapshot->>'plan'=target_plan) as upgrade_observed,
    bool_or(action='downgrade' and source_plan is distinct from target_plan and result_snapshot->>'plan'=target_plan) as downgrade_observed,
    bool_or(action='cancel' and coalesce((result_snapshot->>'cancelAtPeriodEnd')::boolean,false)=true) as cancel_observed,
    bool_or(action='reactivate' and coalesce((result_snapshot->>'cancelAtPeriodEnd')::boolean,true)=false) as reactivate_observed
  from latest_completed
),
reactivation_sequence as (
  select exists(
    select 1
    from completed_requests c
    join completed_requests r on r.action='reactivate'
    where c.action='cancel'
      and c.completed_at is not null
      and r.completed_at is not null
      and c.completed_at <= r.completed_at
  ) as cancel_precedes_reactivate
),
matched_audits as (
  select
    r.action as lifecycle_action,
    r.id as lifecycle_request_id,
    a.id as audit_id,
    a.created_at,
    a.previous_hash,
    a.event_hash,
    a.hash_algorithm,
    a.metadata
  from latest_completed r
  join proof_input i on true
  join public.audit_events a
    on a.organization_id=i.organization_id
   and a.action='billing.subscription_' || r.action
   and a.entity_type='stripe_subscription'
   and a.entity_id=i.stripe_subscription_id
   and coalesce(a.metadata->>'lifecycleRequestId','')=r.id::text
),
audit_summary as (
  select
    count(distinct lifecycle_action)=4 as all_action_audits_present,
    bool_and(nullif(event_hash,'') is not null and lower(coalesce(hash_algorithm,''))='sha256') as hashes_present,
    bool_and(
      nullif(previous_hash,'') is null
      or exists (
        select 1 from public.audit_events predecessor
        join proof_input i on predecessor.organization_id=i.organization_id
        where predecessor.event_hash=matched_audits.previous_hash
          and predecessor.created_at<=matched_audits.created_at
      )
    ) as predecessor_links_resolve,
    bool_or(
      lifecycle_action='downgrade'
      and coalesce(metadata->>'scheduledForPeriodEnd','false')='true'
      and nullif(metadata->>'scheduledEffectiveAt','') is not null
    ) as downgrade_scheduled_for_period_end,
    bool_or(lifecycle_action='cancel' and coalesce(metadata->>'cancelAtPeriodEnd','false')='true') as cancel_audit_matches,
    bool_or(lifecycle_action='reactivate' and coalesce(metadata->>'cancelAtPeriodEnd','true')='false') as reactivate_audit_matches
  from matched_audits
)
select jsonb_build_object(
  'schemaReady', (
    select subscriptions_table and lifecycle_table and stripe_events_table and audit_events_table
      and request_fingerprint_column and result_snapshot_column and stripe_livemode_column and stripe_payload_column
    from schema_checks
  ),
  'subscriptionObserved', exists(select 1 from subscription_state),
  'subscriptionActive', coalesce((select status in ('active','trialing') from subscription_state),false),
  'subscriptionCustomerBound', coalesce((select stripe_customer_id is not null from subscription_state),false),
  'stripeEventProcessed', coalesce((
    select e.status='processed' and e.error is null and e.processed_at is not null
      and e.organization_id=i.organization_id::text
    from stripe_event_state e cross join proof_input i
  ),false),
  'stripeEventAuthoritativeType', coalesce((
    select event_type in ('customer.subscription.created','customer.subscription.updated') from stripe_event_state
  ),false),
  'stripeEventBindingMatches', coalesce((
    select e.payload_subscription_id=s.stripe_subscription_id
      and e.payload_customer_id=s.stripe_customer_id
    from stripe_event_state e cross join subscription_state s
  ),false),
  'stripeEventLiveMode', coalesce((select livemode from stripe_event_state),false),
  'productionLiveAuthorityRequired', coalesce((select target_environment='production' from proof_input),false),
  'allLifecycleActionsPresent', coalesce((select all_actions_present from request_summary),false),
  'allLifecycleRequestsCompleted', coalesce((select all_completed_at_present from request_summary),false),
  'requestFingerprintsValid', coalesce((select fingerprints_valid from request_summary),false),
  'resultSnapshotsBound', coalesce((select snapshots_bound from request_summary),false),
  'upgradeObserved', coalesce((select upgrade_observed from request_summary),false),
  'downgradeObserved', coalesce((select downgrade_observed from request_summary),false),
  'cancelObserved', coalesce((select cancel_observed from request_summary),false),
  'reactivateObserved', coalesce((select reactivate_observed from request_summary),false),
  'cancelPrecedesReactivate', coalesce((select cancel_precedes_reactivate from reactivation_sequence),false),
  'allLifecycleAuditsPresent', coalesce((select all_action_audits_present from audit_summary),false),
  'downgradeScheduledForPeriodEnd', coalesce((select downgrade_scheduled_for_period_end from audit_summary),false),
  'cancelAuditMatches', coalesce((select cancel_audit_matches from audit_summary),false),
  'reactivateAuditMatches', coalesce((select reactivate_audit_matches from audit_summary),false),
  'auditHashesPresent', coalesce((select hashes_present from audit_summary),false),
  'auditPredecessorLinksResolve', coalesce((select predecessor_links_resolve from audit_summary),false)
)::text;
