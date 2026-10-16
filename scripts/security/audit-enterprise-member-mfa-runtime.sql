-- Read-only, metadata-only audit. PASS does not replace authenticated A/B MFA tests.
-- Explicitly target existing private Enterprise RLS helpers and four affected tables.
with expected_functions(name) as (
  values ('enterprise_member_can_read'), ('enterprise_member_can_manage')
),
function_status as (
  select e.name,
    p.oid is not null as exists_private_helper,
    coalesce(p.prosecdef, false) as security_definer,
    coalesce('search_path=pg_catalog' = any(p.proconfig), false) as pinned_search_path,
    position('public.tenant_mfa_satisfied(p_organization_id)' in coalesce(pg_get_functiondef(p.oid), '')) > 0 as tenant_mfa_guard,
    case when p.oid is null then false
      else has_function_privilege('authenticated',p.oid,'EXECUTE')
    end as authenticated_execution,
    case when p.oid is null then true
      else has_function_privilege('anon',p.oid,'EXECUTE')
    end as anonymous_execution
  from expected_functions e
  left join pg_proc p on p.proname = e.name
    and pg_get_function_identity_arguments(p.oid) = 'p_organization_id uuid'
    and p.pronamespace = 'app_private'::regnamespace
),
expected_policies(tablename) as (
  values
    ('enterprise_evidence_pack_items'),
    ('enterprise_evidence_packs'),
    ('enterprise_risk_reviews'),
    ('enterprise_vendor_due_diligence')
),
policy_status as (
  select t.tablename,
    count(p.policyname) filter(
      where p.cmd='SELECT'
        and p.roles && array['authenticated','public']::name[]
        and p.qual like '%app_private.enterprise_member_can_read(organization_id)%'
    ) as membership_select_policy_count
  from expected_policies t
  left join pg_policies p on p.schemaname='public' and p.tablename=t.tablename
  group by t.tablename
)
select
  (select count(*) from function_status) as helpers_checked,
  (select count(*) from function_status
   where exists_private_helper and security_definer and pinned_search_path
     and tenant_mfa_guard and authenticated_execution and not anonymous_execution
  ) as helpers_guarded_by_mfa,
  (select count(*) from policy_status) as expected_tables_checked,
  (select count(*) from policy_status where membership_select_policy_count > 0) as tables_using_private_helper,
  case when
    (select count(*) from function_status
     where exists_private_helper and security_definer and pinned_search_path
       and tenant_mfa_guard and authenticated_execution and not anonymous_execution) = 2
    and (select count(*) from policy_status where membership_select_policy_count > 0) = 4
    then 'PASS_METADATA_ONLY'
    else 'NO_GO_RUNTIME_MFA'
  end as runtime_mfa_metadata_gate;
