\set ON_ERROR_STOP on

-- Read-only post-promotion proof for the V39 same-tenant reference guards.
-- The caller wraps this file in BEGIN TRANSACTION READ ONLY / ROLLBACK.
do $verify$
declare
  guard_oid oid := to_regprocedure('app_private.enforce_same_tenant_reference_integrity()');
  guarded_tables constant text[] := array[
    'ai_assessments',
    'ai_incidents',
    'ai_system_history',
    'compliance_findings',
    'compliance_tasks',
    'enterprise_access_export_download_events',
    'enterprise_access_operation_events',
    'enterprise_access_operation_items',
    'enterprise_contract_billing_events',
    'enterprise_seat_contention_events',
    'enterprise_seat_events',
    'enterprise_seat_operations',
    'evidence_item_audit_events',
    'evidence_items',
    'organization_entitlements'
  ];
  guarded_table text;
  trigger_count integer;
  public_execute boolean;
begin
  if guard_oid is null then
    raise exception 'same-tenant reference integrity guard is missing';
  end if;

  select exists (
    select 1
    from pg_proc function_record
    cross join lateral aclexplode(
      coalesce(function_record.proacl, acldefault('f', function_record.proowner))
    ) privilege
    where function_record.oid = guard_oid
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ) into public_execute;

  if public_execute
     or has_function_privilege('anon', guard_oid, 'EXECUTE')
     or has_function_privilege('authenticated', guard_oid, 'EXECUTE')
     or not has_function_privilege('service_role', guard_oid, 'EXECUTE') then
    raise exception 'same-tenant reference integrity guard privileges are not canonical';
  end if;

  foreach guarded_table in array guarded_tables loop
    select count(*) into trigger_count
    from pg_trigger t
    join pg_class r on r.oid = t.tgrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = guarded_table
      and not t.tgisinternal
      and t.tgfoid = guard_oid;

    if trigger_count <> 1 then
      raise exception 'same-tenant reference integrity trigger is missing or duplicated on public.%', guarded_table;
    end if;
  end loop;

  if exists (
    select 1 from public.ai_assessments c join public.ai_systems p on p.id=c.ai_system_id
    where c.ai_system_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.ai_incidents c join public.ai_systems p on p.id=c.ai_system_id
    where c.ai_system_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.ai_system_history c join public.ai_systems p on p.id=c.ai_system_id
    where c.ai_system_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.compliance_findings c join public.gap_assessments p on p.id=c.assessment_id
    where c.assessment_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.compliance_tasks c join public.compliance_findings p on p.id=c.finding_id
    where c.finding_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_access_export_download_events c join public.enterprise_access_export_jobs p on p.id=c.export_job_id
    where c.export_job_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_access_operation_events c join public.enterprise_access_operations p on p.id=c.operation_id
    where c.operation_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_access_operation_items c join public.enterprise_scim_identities p on p.id=c.identity_id
    where c.identity_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_access_operation_items c join public.organization_members p on p.id=c.membership_id
    where c.membership_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_access_operation_items c join public.enterprise_access_operations p on p.id=c.operation_id
    where c.operation_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_contract_billing_events c join public.enterprise_contracts p on p.id=c.contract_id
    where c.contract_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_seat_contention_events c join public.organization_members p on p.id=c.membership_id
    where c.membership_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_seat_events c join public.enterprise_seat_reservations p on p.id=c.reservation_id
    where c.reservation_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.enterprise_seat_operations c join public.organization_members p on p.id=c.membership_id
    where c.membership_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.evidence_item_audit_events c join public.evidence_items p on p.id=c.evidence_item_id
    where c.evidence_item_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.evidence_items c join public.compliance_findings p on p.id=c.finding_id
    where c.finding_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.evidence_items c join public.compliance_tasks p on p.id=c.task_id
    where c.task_id is not null and c.organization_id is distinct from p.organization_id
  ) or exists (
    select 1 from public.organization_entitlements c join public.enterprise_contracts p on p.id=c.contract_id
    where c.contract_id is not null and c.organization_id is distinct from p.organization_id
  ) then
    raise exception 'cross-tenant reference integrity violation exists after promotion';
  end if;
end
$verify$;
