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
    'tasks',
    'onboarding_activation_runs'
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
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'onboarding_activation_runs',
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
end
$verify$;

notify pgrst, 'reload schema';
commit;
