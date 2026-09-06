begin;

-- Commercial isolation for tiered AI-system governance workflows.
--
-- Business includes procurement/review workflows; Enterprise adds the evidence
-- capability. These legacy enterprise_* tables historically authorized by
-- membership alone, so direct authenticated PostgREST access could survive a
-- downgrade even when the reviewed API rejected the workflow. Keep data durable
-- for re-upgrade while enforcing the same plan floors at RLS.
do $prerequisites$
declare
  required_table text;
begin
  if to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)') is null then
    raise exception 'Governance workflow isolation requires the minimum-plan helper';
  end if;

  foreach required_table in array array[
    'enterprise_evidence_packs',
    'enterprise_evidence_pack_items',
    'enterprise_vendor_due_diligence',
    'enterprise_risk_reviews'
  ]
  loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'Governance workflow prerequisite table is missing: %', required_table;
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

do $verify$
declare
  target_table text;
  required_policy text;
  required_plan text;
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
end
$verify$;

notify pgrst, 'reload schema';
commit;
