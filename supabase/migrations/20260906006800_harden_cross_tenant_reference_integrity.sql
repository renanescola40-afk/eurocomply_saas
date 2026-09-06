begin;

-- Final cross-tenant reference integrity hardening.
--
-- Several legacy and Enterprise tables already carry organization_id and are
-- protected by RLS, but some foreign keys reference only the parent's id. RLS
-- does not protect service-role writes, so a backend bug or attacker-controlled
-- referenced id could persist a cross-tenant relation even when the row itself
-- remains tenant-scoped. Keep the existing FK delete semantics and add one
-- fail-closed trigger guard that verifies every referenced parent belongs to the
-- same organization as the child row.

do $preconditions$
declare
  required_table text;
  required_tables constant text[] := array[
    'ai_assessments',
    'ai_incidents',
    'ai_system_history',
    'ai_systems',
    'compliance_findings',
    'compliance_tasks',
    'gap_assessments',
    'enterprise_access_export_download_events',
    'enterprise_access_export_jobs',
    'enterprise_access_operation_events',
    'enterprise_access_operation_items',
    'enterprise_access_operations',
    'enterprise_scim_identities',
    'enterprise_contract_billing_events',
    'enterprise_contracts',
    'enterprise_seat_contention_events',
    'enterprise_seat_events',
    'enterprise_seat_operations',
    'enterprise_seat_reservations',
    'evidence_item_audit_events',
    'evidence_items',
    'organization_entitlements',
    'organization_members'
  ];
begin
  foreach required_table in array required_tables loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'required tenant-integrity table public.% is missing', required_table;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = required_table
        and column_name = 'organization_id'
    ) then
      raise exception 'required tenant-integrity table public.% has no organization_id', required_table;
    end if;
  end loop;
end
$preconditions$;

-- Refuse promotion if Production already contains an inconsistent relation.
do $existing_data_preflight$
begin
  if exists (
    select 1 from public.ai_assessments c
    join public.ai_systems p on p.id = c.ai_system_id
    where c.ai_system_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: ai_assessments.ai_system_id'; end if;

  if exists (
    select 1 from public.ai_incidents c
    join public.ai_systems p on p.id = c.ai_system_id
    where c.ai_system_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: ai_incidents.ai_system_id'; end if;

  if exists (
    select 1 from public.ai_system_history c
    join public.ai_systems p on p.id = c.ai_system_id
    where c.ai_system_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: ai_system_history.ai_system_id'; end if;

  if exists (
    select 1 from public.compliance_findings c
    join public.gap_assessments p on p.id = c.assessment_id
    where c.assessment_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: compliance_findings.assessment_id'; end if;

  if exists (
    select 1 from public.compliance_tasks c
    join public.compliance_findings p on p.id = c.finding_id
    where c.finding_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: compliance_tasks.finding_id'; end if;

  if exists (
    select 1 from public.enterprise_access_export_download_events c
    join public.enterprise_access_export_jobs p on p.id = c.export_job_id
    where c.export_job_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_access_export_download_events.export_job_id'; end if;

  if exists (
    select 1 from public.enterprise_access_operation_events c
    join public.enterprise_access_operations p on p.id = c.operation_id
    where c.operation_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_access_operation_events.operation_id'; end if;

  if exists (
    select 1 from public.enterprise_access_operation_items c
    join public.enterprise_scim_identities p on p.id = c.identity_id
    where c.identity_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_access_operation_items.identity_id'; end if;

  if exists (
    select 1 from public.enterprise_access_operation_items c
    join public.organization_members p on p.id = c.membership_id
    where c.membership_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_access_operation_items.membership_id'; end if;

  if exists (
    select 1 from public.enterprise_access_operation_items c
    join public.enterprise_access_operations p on p.id = c.operation_id
    where c.operation_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_access_operation_items.operation_id'; end if;

  if exists (
    select 1 from public.enterprise_contract_billing_events c
    join public.enterprise_contracts p on p.id = c.contract_id
    where c.contract_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_contract_billing_events.contract_id'; end if;

  if exists (
    select 1 from public.enterprise_seat_contention_events c
    join public.organization_members p on p.id = c.membership_id
    where c.membership_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_seat_contention_events.membership_id'; end if;

  if exists (
    select 1 from public.enterprise_seat_events c
    join public.enterprise_seat_reservations p on p.id = c.reservation_id
    where c.reservation_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_seat_events.reservation_id'; end if;

  if exists (
    select 1 from public.enterprise_seat_operations c
    join public.organization_members p on p.id = c.membership_id
    where c.membership_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: enterprise_seat_operations.membership_id'; end if;

  if exists (
    select 1 from public.evidence_item_audit_events c
    join public.evidence_items p on p.id = c.evidence_item_id
    where c.evidence_item_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: evidence_item_audit_events.evidence_item_id'; end if;

  if exists (
    select 1 from public.evidence_items c
    join public.compliance_findings p on p.id = c.finding_id
    where c.finding_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: evidence_items.finding_id'; end if;

  if exists (
    select 1 from public.evidence_items c
    join public.compliance_tasks p on p.id = c.task_id
    where c.task_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: evidence_items.task_id'; end if;

  if exists (
    select 1 from public.organization_entitlements c
    join public.enterprise_contracts p on p.id = c.contract_id
    where c.contract_id is not null
      and c.organization_id is distinct from p.organization_id
  ) then raise exception 'existing cross-tenant reference: organization_entitlements.contract_id'; end if;
end
$existing_data_preflight$;

create or replace function app_private.enforce_same_tenant_reference_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'ai_assessments' then
      if new.ai_system_id is not null and not exists (
        select 1 from public.ai_systems p
        where p.id = new.ai_system_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: ai_assessments.ai_system_id' using errcode = '23514'; end if;

    when 'ai_incidents' then
      if new.ai_system_id is not null and not exists (
        select 1 from public.ai_systems p
        where p.id = new.ai_system_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: ai_incidents.ai_system_id' using errcode = '23514'; end if;

    when 'ai_system_history' then
      if new.ai_system_id is not null and not exists (
        select 1 from public.ai_systems p
        where p.id = new.ai_system_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: ai_system_history.ai_system_id' using errcode = '23514'; end if;

    when 'compliance_findings' then
      if new.assessment_id is not null and not exists (
        select 1 from public.gap_assessments p
        where p.id = new.assessment_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: compliance_findings.assessment_id' using errcode = '23514'; end if;

    when 'compliance_tasks' then
      if new.finding_id is not null and not exists (
        select 1 from public.compliance_findings p
        where p.id = new.finding_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: compliance_tasks.finding_id' using errcode = '23514'; end if;

    when 'enterprise_access_export_download_events' then
      if new.export_job_id is not null and not exists (
        select 1 from public.enterprise_access_export_jobs p
        where p.id = new.export_job_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_access_export_download_events.export_job_id' using errcode = '23514'; end if;

    when 'enterprise_access_operation_events' then
      if new.operation_id is not null and not exists (
        select 1 from public.enterprise_access_operations p
        where p.id = new.operation_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_access_operation_events.operation_id' using errcode = '23514'; end if;

    when 'enterprise_access_operation_items' then
      if new.identity_id is not null and not exists (
        select 1 from public.enterprise_scim_identities p
        where p.id = new.identity_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_access_operation_items.identity_id' using errcode = '23514'; end if;
      if new.membership_id is not null and not exists (
        select 1 from public.organization_members p
        where p.id = new.membership_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_access_operation_items.membership_id' using errcode = '23514'; end if;
      if new.operation_id is not null and not exists (
        select 1 from public.enterprise_access_operations p
        where p.id = new.operation_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_access_operation_items.operation_id' using errcode = '23514'; end if;

    when 'enterprise_contract_billing_events' then
      if new.contract_id is not null and not exists (
        select 1 from public.enterprise_contracts p
        where p.id = new.contract_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_contract_billing_events.contract_id' using errcode = '23514'; end if;

    when 'enterprise_seat_contention_events' then
      if new.membership_id is not null and not exists (
        select 1 from public.organization_members p
        where p.id = new.membership_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_seat_contention_events.membership_id' using errcode = '23514'; end if;

    when 'enterprise_seat_events' then
      if new.reservation_id is not null and not exists (
        select 1 from public.enterprise_seat_reservations p
        where p.id = new.reservation_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_seat_events.reservation_id' using errcode = '23514'; end if;

    when 'enterprise_seat_operations' then
      if new.membership_id is not null and not exists (
        select 1 from public.organization_members p
        where p.id = new.membership_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: enterprise_seat_operations.membership_id' using errcode = '23514'; end if;

    when 'evidence_item_audit_events' then
      if new.evidence_item_id is not null and not exists (
        select 1 from public.evidence_items p
        where p.id = new.evidence_item_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: evidence_item_audit_events.evidence_item_id' using errcode = '23514'; end if;

    when 'evidence_items' then
      if new.finding_id is not null and not exists (
        select 1 from public.compliance_findings p
        where p.id = new.finding_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: evidence_items.finding_id' using errcode = '23514'; end if;
      if new.task_id is not null and not exists (
        select 1 from public.compliance_tasks p
        where p.id = new.task_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: evidence_items.task_id' using errcode = '23514'; end if;

    when 'organization_entitlements' then
      if new.contract_id is not null and not exists (
        select 1 from public.enterprise_contracts p
        where p.id = new.contract_id
          and p.organization_id is not distinct from new.organization_id
      ) then raise exception 'cross_tenant_reference: organization_entitlements.contract_id' using errcode = '23514'; end if;

    else
      raise exception 'unsupported tenant integrity trigger table: %', tg_table_name;
  end case;

  return new;
end;
$$;

revoke all on function app_private.enforce_same_tenant_reference_integrity() from public, anon, authenticated;
grant execute on function app_private.enforce_same_tenant_reference_integrity() to service_role;

-- One trigger per child table keeps the checked column set explicit and makes
-- schema drift visible in review and CI.
drop trigger if exists enforce_ai_assessments_same_tenant_reference on public.ai_assessments;
create trigger enforce_ai_assessments_same_tenant_reference
before insert or update of organization_id, ai_system_id on public.ai_assessments
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_ai_incidents_same_tenant_reference on public.ai_incidents;
create trigger enforce_ai_incidents_same_tenant_reference
before insert or update of organization_id, ai_system_id on public.ai_incidents
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_ai_system_history_same_tenant_reference on public.ai_system_history;
create trigger enforce_ai_system_history_same_tenant_reference
before insert or update of organization_id, ai_system_id on public.ai_system_history
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_compliance_findings_same_tenant_reference on public.compliance_findings;
create trigger enforce_compliance_findings_same_tenant_reference
before insert or update of organization_id, assessment_id on public.compliance_findings
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_compliance_tasks_same_tenant_reference on public.compliance_tasks;
create trigger enforce_compliance_tasks_same_tenant_reference
before insert or update of organization_id, finding_id on public.compliance_tasks
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_access_export_download_events_same_tenant_reference on public.enterprise_access_export_download_events;
create trigger enforce_enterprise_access_export_download_events_same_tenant_reference
before insert or update of organization_id, export_job_id on public.enterprise_access_export_download_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_access_operation_events_same_tenant_reference on public.enterprise_access_operation_events;
create trigger enforce_enterprise_access_operation_events_same_tenant_reference
before insert or update of organization_id, operation_id on public.enterprise_access_operation_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_access_operation_items_same_tenant_reference on public.enterprise_access_operation_items;
create trigger enforce_enterprise_access_operation_items_same_tenant_reference
before insert or update of organization_id, identity_id, membership_id, operation_id on public.enterprise_access_operation_items
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_contract_billing_events_same_tenant_reference on public.enterprise_contract_billing_events;
create trigger enforce_enterprise_contract_billing_events_same_tenant_reference
before insert or update of organization_id, contract_id on public.enterprise_contract_billing_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_seat_contention_events_same_tenant_reference on public.enterprise_seat_contention_events;
create trigger enforce_enterprise_seat_contention_events_same_tenant_reference
before insert or update of organization_id, membership_id on public.enterprise_seat_contention_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_seat_events_same_tenant_reference on public.enterprise_seat_events;
create trigger enforce_enterprise_seat_events_same_tenant_reference
before insert or update of organization_id, reservation_id on public.enterprise_seat_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_enterprise_seat_operations_same_tenant_reference on public.enterprise_seat_operations;
create trigger enforce_enterprise_seat_operations_same_tenant_reference
before insert or update of organization_id, membership_id on public.enterprise_seat_operations
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_evidence_item_audit_events_same_tenant_reference on public.evidence_item_audit_events;
create trigger enforce_evidence_item_audit_events_same_tenant_reference
before insert or update of organization_id, evidence_item_id on public.evidence_item_audit_events
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_evidence_items_same_tenant_reference on public.evidence_items;
create trigger enforce_evidence_items_same_tenant_reference
before insert or update of organization_id, finding_id, task_id on public.evidence_items
for each row execute function app_private.enforce_same_tenant_reference_integrity();

drop trigger if exists enforce_organization_entitlements_same_tenant_reference on public.organization_entitlements;
create trigger enforce_organization_entitlements_same_tenant_reference
before insert or update of organization_id, contract_id on public.organization_entitlements
for each row execute function app_private.enforce_same_tenant_reference_integrity();

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
begin
  if guard_oid is null then
    raise exception 'same-tenant reference integrity guard is missing';
  end if;

  if has_function_privilege('public', guard_oid, 'EXECUTE')
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
end
$verify$;

notify pgrst, 'reload schema';
commit;
