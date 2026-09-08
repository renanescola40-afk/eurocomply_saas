begin;

-- Business-plan data-plane isolation.
--
-- AI Literacy and QMS are Business-or-higher catalog features. Their reviewed
-- server APIs enforce tenant RBAC and plan authority, but authenticated
-- PostgREST reads must enforce the same commercial floor after downgrade.
-- Preserve customer rows for re-upgrade while making every authenticated direct
-- path fail closed below Business. service_role remains the reviewed backend path.
do $prerequisites$
declare
  required_table text;
begin
  if to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)') is null then
    raise exception 'Business commercial isolation requires the minimum-plan helper';
  end if;

  foreach required_table in array array[
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'ai_qms_systems',
    'ai_qms_controls',
    'ai_qms_nonconformities',
    'ai_qms_audits',
    'ai_qms_management_reviews',
    'ai_qms_decisions'
  ]
  loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'Business commercial isolation prerequisite table is missing: %', required_table;
    end if;
  end loop;
end
$prerequisites$;

do $apply_business_plan_floor$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'ai_qms_systems',
    'ai_qms_controls',
    'ai_qms_nonconformities',
    'ai_qms_audits',
    'ai_qms_management_reviews',
    'ai_qms_decisions'
  ]
  loop
    policy_name := format('restrict_%s_business_plan', target_table);

    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
    execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (app_private.has_minimum_commercial_plan(organization_id, ''business'')) with check (app_private.has_minimum_commercial_plan(organization_id, ''business''))',
      policy_name,
      target_table
    );
  end loop;
end
$apply_business_plan_floor$;

do $verify$
declare
  target_table text;
  policy_name text;
  helper_oid oid := to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)');
begin
  if helper_oid is null
     or has_function_privilege('anon', helper_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', helper_oid, 'EXECUTE') then
    raise exception 'minimum commercial plan helper privilege posture is invalid';
  end if;

  foreach target_table in array array[
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'ai_qms_systems',
    'ai_qms_controls',
    'ai_qms_nonconformities',
    'ai_qms_audits',
    'ai_qms_management_reviews',
    'ai_qms_decisions'
  ]
  loop
    policy_name := format('restrict_%s_business_plan', target_table);

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_name
        and permissive = 'RESTRICTIVE'
        and cmd = 'ALL'
        and roles = array['authenticated']::name[]
        and qual ilike '%has_minimum_commercial_plan%business%'
        and with_check ilike '%has_minimum_commercial_plan%business%'
    ) then
      raise exception 'Business restrictive plan policy missing for %.%', target_table, policy_name;
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
      raise exception 'RLS/FORCE RLS missing for Business resource %', target_table;
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';
commit;
