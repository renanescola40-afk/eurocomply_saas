-- A-01/A-08: prevent pre-MFA privacy-request reads by active tenant members.
-- Keep nonmember data subjects able to read their own requests under the
-- original PERMISSIVE SELECT policy. No new client writes or RLS bypass.
-- QA transaction-only preflight on 2026-11-11:
-- member own AAL1=0, AAL2=1; unrelated data subject own AAL1=1;
-- owner AAL1=0, AAL2=2. Simulated JWT claims, not a real login.
--
-- Governed rollback:
-- drop policy dsar_require_mfa_for_active_members on public.data_subject_requests;
-- drop function app_private.dsar_active_member_mfa_satisfied(uuid);

begin;

-- SECURITY DEFINER avoids circular reliance on organization_members RLS,
-- which may itself hide active membership until AAL2. Returns only a boolean.
-- Schema is private, no API endpoint and no raw member information emitted.
create or replace function app_private.dsar_active_member_mfa_satisfied(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select target_organization_id is not null
    and (select auth.uid()) is not null
    and (
      not exists (
        select 1
        from public.organization_members om
        where om.organization_id = target_organization_id
          and om.user_id = (select auth.uid())
          and lower(coalesce(om.status, '')) = 'active'
      )
      or public.tenant_mfa_satisfied(target_organization_id)
    );
$function$;

revoke all on function app_private.dsar_active_member_mfa_satisfied(uuid) from public, anon;
grant execute on function app_private.dsar_active_member_mfa_satisfied(uuid) to authenticated, service_role;

-- Compose a RESTRICTIVE SELECT policy with existing row ownership/admin
-- rules. Never replace or broaden the original self-read policy.
drop policy if exists dsar_require_mfa_for_active_members on public.data_subject_requests;
create policy dsar_require_mfa_for_active_members
  on public.data_subject_requests
  as restrictive
  for select
  to authenticated
  using (app_private.dsar_active_member_mfa_satisfied(organization_id));

do $verify$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'data_subject_requests'
      and policyname = 'dsar_require_mfa_for_active_members'
      and permissive = 'RESTRICTIVE'
      and cmd = 'SELECT'
  ) then
    raise exception 'dsar_member_mfa_select_policy_missing';
  end if;

  if has_function_privilege('anon',
      'app_private.dsar_active_member_mfa_satisfied(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated',
      'app_private.dsar_active_member_mfa_satisfied(uuid)', 'EXECUTE')
  then
    raise exception 'dsar_member_mfa_function_acl_invalid';
  end if;

  if not (
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'data_subject_requests'
  ) then
    raise exception 'dsar_rls_force_rls_required';
  end if;
end
$verify$;

commit;
