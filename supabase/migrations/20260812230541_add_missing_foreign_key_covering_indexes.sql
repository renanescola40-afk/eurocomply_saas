begin;

-- Historical clean-replay compatibility: create each covering index only when
-- its base table exists at this replay point. If an existing table has schema
-- drift (for example a missing indexed column), CREATE INDEX still fails closed.
do $fk_covering_indexes_apply$
declare
  index_name text;
  table_name text;
  create_sql text;
begin
  for index_name, table_name, create_sql in
    select * from (values
      ('idx_ai_assessments_ai_system_fk','ai_assessments','create index if not exists idx_ai_assessments_ai_system_fk on public.ai_assessments (ai_system_id)'),
      ('idx_ai_assessments_created_by_fk','ai_assessments','create index if not exists idx_ai_assessments_created_by_fk on public.ai_assessments (created_by)'),
      ('idx_ai_incidents_ai_system_fk','ai_incidents','create index if not exists idx_ai_incidents_ai_system_fk on public.ai_incidents (ai_system_id)'),
      ('idx_ai_incidents_created_by_fk','ai_incidents','create index if not exists idx_ai_incidents_created_by_fk on public.ai_incidents (created_by)'),
      ('idx_audit_logs_actor_fk','audit_logs','create index if not exists idx_audit_logs_actor_fk on public.audit_logs (actor_id)'),
      ('idx_audit_logs_user_fk','audit_logs','create index if not exists idx_audit_logs_user_fk on public.audit_logs (user_id)'),
      ('idx_metric_snapshots_org_fk','compliance_metric_snapshots','create index if not exists idx_metric_snapshots_org_fk on public.compliance_metric_snapshots (organization_id)'),
      ('idx_compliance_tasks_assigned_fk','compliance_tasks','create index if not exists idx_compliance_tasks_assigned_fk on public.compliance_tasks (assigned_to)'),
      ('idx_compliance_tasks_created_by_fk','compliance_tasks','create index if not exists idx_compliance_tasks_created_by_fk on public.compliance_tasks (created_by)'),
      ('idx_documents_created_by_fk','documents','create index if not exists idx_documents_created_by_fk on public.documents (created_by)'),
      ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events','create index if not exists idx_ent_recon_events_actor_fk on public.enterprise_entitlement_reconciliation_events (actor_user_id)'),
      ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots','create index if not exists idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (source_id, organization_id)'),
      ('idx_seat_events_actor_fk','enterprise_seat_events','create index if not exists idx_seat_events_actor_fk on public.enterprise_seat_events (actor_user_id)'),
      ('idx_seat_events_reservation_fk','enterprise_seat_events','create index if not exists idx_seat_events_reservation_fk on public.enterprise_seat_events (reservation_id)'),
      ('idx_seat_policies_updated_by_fk','enterprise_seat_policies','create index if not exists idx_seat_policies_updated_by_fk on public.enterprise_seat_policies (updated_by)'),
      ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations','create index if not exists idx_seat_reservations_reserved_by_fk on public.enterprise_seat_reservations (reserved_by)'),
      ('idx_invitations_invited_by_fk','invitations','create index if not exists idx_invitations_invited_by_fk on public.invitations (invited_by)'),
      ('idx_monitoring_preferences_user_fk','monitoring_preferences','create index if not exists idx_monitoring_preferences_user_fk on public.monitoring_preferences (user_id)'),
      ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs','create index if not exists idx_onboarding_runs_created_by_fk on public.onboarding_activation_runs (created_by)'),
      ('idx_org_members_user_fk','organization_members','create index if not exists idx_org_members_user_fk on public.organization_members (user_id)'),
      ('idx_organizations_created_by_fk','organizations','create index if not exists idx_organizations_created_by_fk on public.organizations (created_by)'),
      ('idx_organizations_owner_fk','organizations','create index if not exists idx_organizations_owner_fk on public.organizations (owner_id)'),
      ('idx_risks_created_by_fk','risks','create index if not exists idx_risks_created_by_fk on public.risks (created_by)'),
      ('idx_risks_owner_fk','risks','create index if not exists idx_risks_owner_fk on public.risks (owner_id)'),
      ('idx_role_permissions_permission_fk','role_permissions','create index if not exists idx_role_permissions_permission_fk on public.role_permissions (permission_key)'),
      ('idx_vendors_created_by_fk','vendors','create index if not exists idx_vendors_created_by_fk on public.vendors (created_by)'),
      ('idx_vendors_owner_fk','vendors','create index if not exists idx_vendors_owner_fk on public.vendors (owner_id)')
    ) as expected(index_name, table_name, create_sql)
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute create_sql;
    end if;
  end loop;
end
$fk_covering_indexes_apply$;

do $fk_covering_indexes_guard$
declare
  missing integer;
begin
  select count(*) into missing
  from (values
    ('idx_ai_assessments_ai_system_fk','ai_assessments'),
    ('idx_ai_assessments_created_by_fk','ai_assessments'),
    ('idx_ai_incidents_ai_system_fk','ai_incidents'),
    ('idx_ai_incidents_created_by_fk','ai_incidents'),
    ('idx_audit_logs_actor_fk','audit_logs'),
    ('idx_audit_logs_user_fk','audit_logs'),
    ('idx_metric_snapshots_org_fk','compliance_metric_snapshots'),
    ('idx_compliance_tasks_assigned_fk','compliance_tasks'),
    ('idx_compliance_tasks_created_by_fk','compliance_tasks'),
    ('idx_documents_created_by_fk','documents'),
    ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events'),
    ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots'),
    ('idx_seat_events_actor_fk','enterprise_seat_events'),
    ('idx_seat_events_reservation_fk','enterprise_seat_events'),
    ('idx_seat_policies_updated_by_fk','enterprise_seat_policies'),
    ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations'),
    ('idx_invitations_invited_by_fk','invitations'),
    ('idx_monitoring_preferences_user_fk','monitoring_preferences'),
    ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs'),
    ('idx_org_members_user_fk','organization_members'),
    ('idx_organizations_created_by_fk','organizations'),
    ('idx_organizations_owner_fk','organizations'),
    ('idx_risks_created_by_fk','risks'),
    ('idx_risks_owner_fk','risks'),
    ('idx_role_permissions_permission_fk','role_permissions'),
    ('idx_vendors_created_by_fk','vendors'),
    ('idx_vendors_owner_fk','vendors')
  ) as required(index_name, table_name)
  where to_regclass(format('public.%I', required.table_name)) is not null
    and to_regclass('public.' || required.index_name) is null;

  if missing <> 0 then
    raise exception 'missing required foreign-key covering indexes after reconciliation: %', missing;
  end if;
end
$fk_covering_indexes_guard$;

commit;
