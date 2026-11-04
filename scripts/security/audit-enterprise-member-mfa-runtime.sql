-- Read-only, metadata-only audit. Does NOT prove signed JWT, runtime A/B
-- authorization, browser/API/Storage E2E, or formal Enterprise gate PASS.
--
-- Historical October helper bodies invoke tenant_mfa_satisfied directly.
-- Later forward migration safely delegates to the existing canonical
-- Clerk/UUID-aware is_org_member/has_org_role functions, which enforce MFA.
-- Accept EITHER guarded implementation without requiring unsafe direct
-- auth.uid() casts or relaxing any private helper/role boundary.

with expected_functions(name, delegated_helper, signature) as (
 values
 ('enterprise_member_can_read','is_org_member',
  'app_private.is_org_member(uuid)'),
 ('enterprise_member_can_manage','has_org_role',
  'app_private.has_org_role(uuid,text[])')
),
canonical_status as (
 select e.name,
        h.oid is not null as canonical_exists,
        coalesce(h.prosecdef,false) as canonical_security_definer,
        coalesce('search_path=pg_catalog'=any(h.proconfig),false)
          as canonical_pinned_search_path,
        coalesce(position('tenant_mfa_satisfied' in pg_get_functiondef(h.oid)),0)>0
          as canonical_mfa,
        coalesce(position('current_clerk_user_id' in pg_get_functiondef(h.oid)),0)>0
          as canonical_clerk,
        coalesce(position('current_legacy_user_id' in pg_get_functiondef(h.oid)),0)>0
          as canonical_uuid,
        coalesce(position('active' in pg_get_functiondef(h.oid)),0)>0
          as canonical_active_member,
        case when h.oid is null then false
          else has_function_privilege('authenticated',h.oid,'EXECUTE') end
          as canonical_authenticated_execution,
        case when h.oid is null then true
          else has_function_privilege('anon',h.oid,'EXECUTE') end
          as canonical_anonymous_execution
 from expected_functions e
 left join pg_proc h on h.oid=to_regprocedure(e.signature)
),
function_status as (
 select e.name,
    p.oid is not null as exists_private_helper,
    coalesce(p.prosecdef,false) as security_definer,
    coalesce('search_path=pg_catalog'=any(p.proconfig),false)
      as pinned_search_path,
    (
      -- Direct, historical MFA enforcement.
      coalesce(position('public.tenant_mfa_satisfied(p_organization_id)'
         in pg_get_functiondef(p.oid)),0)>0
      or
      -- Forward delegation is acceptable only if the canonical private
      -- helper is itself audited for MFA, Clerk/UUID, active status and ACL.
      (
        case when e.name='enterprise_member_can_read' then
          coalesce(position('app_private.is_org_member(p_organization_id)'
            in pg_get_functiondef(p.oid)),0)>0
        else
          coalesce(position('app_private.has_org_role('
            in pg_get_functiondef(p.oid)),0)>0
          and coalesce(position('owner' in pg_get_functiondef(p.oid)),0)>0
          and coalesce(position('admin' in pg_get_functiondef(p.oid)),0)>0
          and coalesce(position('editor' in pg_get_functiondef(p.oid)),0)>0
          and coalesce(position('compliance_manager'
            in pg_get_functiondef(p.oid)),0)>0
        end
        and coalesce(position('auth.uid()'
          in pg_get_functiondef(p.oid)),0)=0
        and c.canonical_exists and c.canonical_security_definer
        and c.canonical_pinned_search_path and c.canonical_mfa
        and c.canonical_clerk and c.canonical_uuid
        and c.canonical_active_member
        and c.canonical_authenticated_execution
        and not c.canonical_anonymous_execution
      )
    ) as tenant_mfa_guard,
    case when p.oid is null then false
      else has_function_privilege('authenticated',p.oid,'EXECUTE')
    end as authenticated_execution,
    case when p.oid is null then true
      else has_function_privilege('anon',p.oid,'EXECUTE')
    end as anonymous_execution
 from expected_functions e
 join canonical_status c on c.name=e.name
 left join pg_proc p on p.proname=e.name
  and pg_get_function_identity_arguments(p.oid)='p_organization_id uuid'
  and p.pronamespace='app_private'::regnamespace
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
    and tenant_mfa_guard and authenticated_execution
    and not anonymous_execution) as helpers_guarded_by_mfa,
 (select count(*) from policy_status) as expected_tables_checked,
 (select count(*) from policy_status
  where membership_select_policy_count>0) as tables_using_private_helper,
 case when
   (select count(*) from function_status
    where exists_private_helper and security_definer and pinned_search_path
      and tenant_mfa_guard and authenticated_execution
      and not anonymous_execution)=2
   and (select count(*) from policy_status
        where membership_select_policy_count>0)=4
 then 'PASS_METADATA_ONLY'
 else 'NO_GO_RUNTIME_MFA' end as runtime_mfa_metadata_gate;
