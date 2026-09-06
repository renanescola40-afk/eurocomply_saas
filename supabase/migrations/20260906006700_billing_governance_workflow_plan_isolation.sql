begin;

-- Commercial isolation for tiered AI-system governance workflows.
--
-- Business includes procurement/review workflows; Enterprise adds the evidence
-- capability. These legacy enterprise_* tables historically authorized by
-- membership alone, so direct authenticated PostgREST access could survive a
-- downgrade even when the reviewed API rejected the workflow. Keep data durable
-- for re-upgrade while enforcing the same plan floors at RLS.
--
-- This is also the final forward-only data-plane postcondition in the bounded
-- 2026-09-06 reconciliation package. By this point the Gap Analysis, onboarding,
-- personal-task and commercial helpers are all materialized, so server-only
-- mutation boundaries can be reconciled without replaying historical migrations.
do $prerequisites$
declare
  required_table text;
begin
  if to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)') is null
     or to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'Governance workflow isolation requires commercial authority helpers';
  end if;

  foreach required_table in array array[
    'enterprise_evidence_packs',
    'enterprise_evidence_pack_items',
    'enterprise_vendor_due_diligence',
    'enterprise_risk_reviews',
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'compliance_tasks',
    'ai_assessments',
    'tasks',
    'onboarding_activation_runs',
    'email_notification_events',
    'intelligence_calendar_suggestions',
    'intelligence_items',
    'profiles',
    'vendor_review_history'
  ]
  loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'Governance/data-plane prerequisite table is missing: %', required_table;
    end if;
  end loop;
end
$prerequisites$;

alter table public.enterprise_vendor_due_diligence enable row level security;
alter table public.enterprise_vendor_due_diligence force row level security;
alter table public.enterprise_risk_reviews enable row level security;
alter table public.enterprise_risk_reviews force row level security;
alter table public.enterprise_evidence_packs enable row level security;
alter table public.enterprise_evidence_packs force row level security;
alter table public.enterprise_evidence_pack_items enable row level security;
alter table public.enterprise_evidence_pack_items force row level security;

-- Vendor due diligence and governed risk-review workflows are Business+.
drop policy if exists "restrict_enterprise_vendor_due_diligence_business_plan" on public.enterprise_vendor_due_diligence;
create policy "restrict_enterprise_vendor_due_diligence_business_plan"
  on public.enterprise_vendor_due_diligence
  as restrictive
  for all
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'business'))
  with check (app_private.has_minimum_commercial_plan(organization_id, 'business'));

drop policy if exists "restrict_enterprise_risk_reviews_business_plan" on public.enterprise_risk_reviews;
create policy "restrict_enterprise_risk_reviews_business_plan"
  on public.enterprise_risk_reviews
  as restrictive
  for all
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'business'))
  with check (app_private.has_minimum_commercial_plan(organization_id, 'business'));

-- Enterprise evidence-pack records and items remain Enterprise-only.
drop policy if exists "restrict_enterprise_evidence_packs_enterprise_plan" on public.enterprise_evidence_packs;
create policy "restrict_enterprise_evidence_packs_enterprise_plan"
  on public.enterprise_evidence_packs
  as restrictive
  for all
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'enterprise'))
  with check (app_private.has_minimum_commercial_plan(organization_id, 'enterprise'));

drop policy if exists "restrict_enterprise_evidence_pack_items_enterprise_plan" on public.enterprise_evidence_pack_items;
create policy "restrict_enterprise_evidence_pack_items_enterprise_plan"
  on public.enterprise_evidence_pack_items
  as restrictive
  for all
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'enterprise'))
  with check (app_private.has_minimum_commercial_plan(organization_id, 'enterprise'));

-- `compliance_tasks` intentionally has a dual data model. Organization tasks are
-- a Professional paid feature and are created/updated/deleted only through
-- reviewed server actions. Personal rows (`organization_id is null`) keep their
-- legacy user-bound browser INSERT/SELECT contract. The generic payment-first
-- RESTRICTIVE policy installed earlier treated NULL organization_id as unpaid and
-- therefore accidentally denied those personal policies. Reconcile the policy so
-- personal rows reach the existing user-bound policies while organization rows
-- still require durable commercial authority.
drop policy if exists payment_first_commercial_authority on public.compliance_tasks;
create policy payment_first_commercial_authority
  on public.compliance_tasks
  as restrictive
  for all
  to authenticated
  using (
    organization_id is null
    or app_private.has_commercial_authority(organization_id)
  )
  with check (
    organization_id is null
    or app_private.has_commercial_authority(organization_id)
  );

-- Close the final client-facing FORCE RLS gaps observed in Production. These
-- tables already have effective RLS policies; FORCE RLS strengthens owner-path
-- behavior without changing the authenticated policy contract. `profiles` has
-- self-only SELECT/UPDATE policies and no INSERT/DELETE policy, so remove the
-- redundant table grants for operations that are already denied by RLS.
do $client_rls_hardening$
declare
  target_table text;
begin
  foreach target_table in array array[
    'email_notification_events',
    'intelligence_calendar_suggestions',
    'intelligence_items',
    'profiles',
    'vendor_review_history'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
  end loop;

  revoke insert, update, delete on table public.profiles from anon;
  revoke insert, delete on table public.profiles from authenticated;
  grant select, update on table public.profiles to authenticated;
end
$client_rls_hardening$;

-- Clean historical replay creates a small set of relations that do not exist in
-- the current Production schema. Do not create them here. When they are present
-- during a full-history reconstruction, reconcile them to the authority already
-- documented by their original migrations: tenant/user-scoped governance tables
-- keep their client policies under FORCE RLS. Email delivery logs, rate-limit
-- state and the persistent billing catalog are backend-only and lose every client
-- table privilege because current runtime has no direct Data API consumer for
-- `plans`, `plan_features` or `add_ons`.
do $historical_replay_rls_hardening$
declare
  target_table text;
begin
  foreach target_table in array array[
    'data_retention_policies',
    'data_subject_requests',
    'audit_integrity_checkpoints'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('alter table public.%I force row level security', target_table);
    end if;
  end loop;

  foreach target_table in array array[
    'email_delivery_logs',
    'rate_limits',
    'plans',
    'plan_features',
    'add_ons'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('alter table public.%I force row level security', target_table);
      execute format('revoke all privileges on table public.%I from anon, authenticated', target_table);
    end if;
  end loop;
end
$historical_replay_rls_hardening$;

-- Gap Analysis writes are exclusively served by `/api/gap-analysis`, which adds
-- trusted-origin, authenticated organization resolution, RBAC, Zod validation,
-- fail-closed rate limiting, paid-plan checks for remediation and durable audit
-- compensation. Direct table DML would bypass those reviewed controls. Preserve
-- tenant-scoped authenticated reads but make writes backend-only.
--
-- Onboarding activation is likewise materialized by the hardened server-side
-- atomic activation RPC. Direct browser writes can bypass its idempotency and
-- atomic organization/AI-system/task/invitation transition.
--
-- `public.ai_assessments` already has a reviewed historical backend-only decision,
-- but that historical migration is outside the bounded Production-forward set.
-- Reassert it here: reads remain tenant-scoped, while browser mutations are
-- denied by both ACL and restrictive policies even if an old permissive writer
-- policy survives in the historical schema.
--
-- `public.tasks` is the preserved legacy task table. The current application
-- uses `public.compliance_tasks`; no reviewed application path mutates
-- `public.tasks`. Keep its four historical rows readable under the existing
-- tenant/paid RLS contract, but remove unused direct browser mutation authority.
do $server_only_browser_mutations$
declare
  target_table text;
begin
  foreach target_table in array array[
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'onboarding_activation_runs',
    'ai_assessments',
    'tasks'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
    execute format('revoke insert, update, delete on table public.%I from anon, authenticated', target_table);
    execute format('grant select on table public.%I to authenticated', target_table);
  end loop;
end
$server_only_browser_mutations$;

-- Defense in depth for the assessment workflow. Old permissive writer policies
-- may remain in historical Production, so explicit RESTRICTIVE deny policies make
-- a future accidental table grant insufficient to reopen direct PostgREST writes.
drop policy if exists "restrict_authenticated_ai_assessments_insert_backend_only" on public.ai_assessments;
create policy "restrict_authenticated_ai_assessments_insert_backend_only"
  on public.ai_assessments
  as restrictive
  for insert
  to authenticated
  with check (false);

drop policy if exists "restrict_authenticated_ai_assessments_update_backend_only" on public.ai_assessments;
create policy "restrict_authenticated_ai_assessments_update_backend_only"
  on public.ai_assessments
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "restrict_authenticated_ai_assessments_delete_backend_only" on public.ai_assessments;
create policy "restrict_authenticated_ai_assessments_delete_backend_only"
  on public.ai_assessments
  as restrictive
  for delete
  to authenticated
  using (false);

do $verify$
declare
  target_table text;
  required_policy text;
  required_plan text;
  payment_policy_qual text;
  payment_policy_check text;
begin
  for target_table, required_policy, required_plan in
    values
      ('enterprise_vendor_due_diligence', 'restrict_enterprise_vendor_due_diligence_business_plan', 'business'),
      ('enterprise_risk_reviews', 'restrict_enterprise_risk_reviews_business_plan', 'business'),
      ('enterprise_evidence_packs', 'restrict_enterprise_evidence_packs_enterprise_plan', 'enterprise'),
      ('enterprise_evidence_pack_items', 'restrict_enterprise_evidence_pack_items_enterprise_plan', 'enterprise')
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = required_policy
        and permissive = 'RESTRICTIVE'
        and cmd = 'ALL'
        and roles = array['authenticated']::name[]
        and qual ilike format('%%has_minimum_commercial_plan%%%s%%', required_plan)
        and with_check ilike format('%%has_minimum_commercial_plan%%%s%%', required_plan)
    ) then
      raise exception 'Tiered governance plan policy missing for %.%', target_table, required_policy;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'RLS/FORCE RLS missing for tiered governance resource %', target_table;
    end if;
  end loop;

  select qual, with_check
    into payment_policy_qual, payment_policy_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_tasks'
    and policyname = 'payment_first_commercial_authority'
    and permissive = 'RESTRICTIVE'
    and cmd = 'ALL'
    and roles = array['authenticated']::name[];

  if payment_policy_qual is null
     or payment_policy_check is null
     or payment_policy_qual not ilike '%organization_id is null%'
     or payment_policy_qual not ilike '%has_commercial_authority%'
     or payment_policy_check not ilike '%organization_id is null%'
     or payment_policy_check not ilike '%has_commercial_authority%' then
    raise exception 'compliance_tasks personal/payment-first compatibility policy is malformed';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='compliance_tasks'
      and policyname='restrict_authenticated_compliance_task_insert_to_personal'
      and permissive='RESTRICTIVE'
      and cmd='INSERT'
      and roles=array['authenticated']::name[]
      and coalesce(with_check,'') ilike '%organization_id is null%'
      and coalesce(with_check,'') ilike '%user_id = auth.uid()%'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='compliance_tasks'
      and policyname='rls_compliance_tasks_insert_personal'
      and permissive='PERMISSIVE'
      and cmd='INSERT'
      and roles=array['authenticated']::name[]
      and coalesce(with_check,'') ilike '%organization_id is null%'
      and coalesce(with_check,'') ilike '%user_id = auth.uid()%'
  ) then
    raise exception 'compliance_tasks personal browser insert boundary is missing';
  end if;

  foreach target_table in array array[
    'email_notification_events',
    'intelligence_calendar_suggestions',
    'intelligence_items',
    'profiles',
    'vendor_review_history'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'client-facing RLS/FORCE RLS missing on public.%', target_table;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.profiles', 'INSERT')
     or has_table_privilege('anon', 'public.profiles', 'UPDATE')
     or has_table_privilege('anon', 'public.profiles', 'DELETE')
     or has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     or not has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     or not has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'profiles client privileges are not least-privilege canonical';
  end if;

  foreach target_table in array array[
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'onboarding_activation_runs',
    'ai_assessments',
    'tasks'
  ]
  loop
    if has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', target_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'direct browser mutation privilege survived on public.%', target_table;
    end if;

    if not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('service_role', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('service_role', format('public.%I', target_table), 'INSERT')
       or not has_table_privilege('service_role', format('public.%I', target_table), 'UPDATE')
       or not has_table_privilege('service_role', format('public.%I', target_table), 'DELETE') then
      raise exception 'server-only table privileges are not canonical on public.%', target_table;
    end if;
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='ai_assessments'
      and policyname='restrict_authenticated_ai_assessments_insert_backend_only'
      and permissive='RESTRICTIVE'
      and cmd='INSERT'
      and roles=array['authenticated']::name[]
      and coalesce(with_check,'')='false'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='ai_assessments'
      and policyname='restrict_authenticated_ai_assessments_update_backend_only'
      and permissive='RESTRICTIVE'
      and cmd='UPDATE'
      and roles=array['authenticated']::name[]
      and coalesce(qual,'')='false'
      and coalesce(with_check,'')='false'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='ai_assessments'
      and policyname='restrict_authenticated_ai_assessments_delete_backend_only'
      and permissive='RESTRICTIVE'
      and cmd='DELETE'
      and roles=array['authenticated']::name[]
      and coalesce(qual,'')='false'
  ) then
    raise exception 'AI assessment backend-only restrictive policy boundary is missing';
  end if;
end
$verify$;

-- Global release invariants: no client-visible public table may escape RLS/FORCE
-- RLS or lack a policy, and no SECURITY DEFINER function in the application
-- schemas may be callable by the anonymous API role. These checks intentionally
-- make future privilege regressions fail the migration instead of becoming drift.
-- Use relation OIDs directly because replay/upgrade transactions can expose
-- catalog entries whose names are not safely resolvable again by regclass text.
-- Offender names are emitted as bounded exception DETAIL so protected replay
-- evidence identifies the exact fail-closed object without exposing credentials.
do $global_client_security_postconditions$
declare
  v_rls_gap text;
  v_policy_gap text;
  v_anon_definer_gap text;
begin
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ' order by c.relname)
    into v_rls_gap
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      has_table_privilege('anon', c.oid, 'SELECT')
      or has_table_privilege('anon', c.oid, 'INSERT')
      or has_table_privilege('anon', c.oid, 'UPDATE')
      or has_table_privilege('anon', c.oid, 'DELETE')
      or has_table_privilege('authenticated', c.oid, 'SELECT')
      or has_table_privilege('authenticated', c.oid, 'INSERT')
      or has_table_privilege('authenticated', c.oid, 'UPDATE')
      or has_table_privilege('authenticated', c.oid, 'DELETE')
    )
    and (not c.relrowsecurity or not c.relforcerowsecurity);

  if v_rls_gap is not null then
    raise exception using
      message = 'client-granted public table escaped RLS/FORCE RLS',
      detail = 'relations=' || left(v_rls_gap, 4000);
  end if;

  select string_agg(format('%I.%I', n.nspname, c.relname), ', ' order by c.relname)
    into v_policy_gap
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      has_table_privilege('anon', c.oid, 'SELECT')
      or has_table_privilege('anon', c.oid, 'INSERT')
      or has_table_privilege('anon', c.oid, 'UPDATE')
      or has_table_privilege('anon', c.oid, 'DELETE')
      or has_table_privilege('authenticated', c.oid, 'SELECT')
      or has_table_privilege('authenticated', c.oid, 'INSERT')
      or has_table_privilege('authenticated', c.oid, 'UPDATE')
      or has_table_privilege('authenticated', c.oid, 'DELETE')
    )
    and not exists (
      select 1
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = c.relname
    );

  if v_policy_gap is not null then
    raise exception using
      message = 'client-granted public table has no RLS policy',
      detail = 'relations=' || left(v_policy_gap, 4000);
  end if;

  select string_agg(
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    ', ' order by n.nspname, p.proname, p.oid
  ) into v_anon_definer_gap
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in ('public', 'app_private')
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_anon_definer_gap is not null then
    raise exception using
      message = 'anonymous role can execute an application SECURITY DEFINER function',
      detail = 'functions=' || left(v_anon_definer_gap, 4000);
  end if;
end
$global_client_security_postconditions$;

notify pgrst, 'reload schema';
commit;