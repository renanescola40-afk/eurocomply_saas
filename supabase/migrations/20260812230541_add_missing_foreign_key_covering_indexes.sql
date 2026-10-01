begin;

-- Historical clean-replay compatibility: create each advisor-backed covering
-- index only when both its base table and every target column exist at this
-- replay point. Historical lineages may contain an earlier table shape without
-- the later FK column; those shapes are intentionally skipped here and are
-- reconciled by the later forward migrations. Whenever a target is applicable,
-- index creation remains fail-closed.
do $fk_covering_indexes_apply$
declare
  v_index_name text;
  v_table_name text;
  v_target_columns text[];
  v_create_sql text;
  v_missing_columns integer;
begin
  for v_index_name, v_table_name, v_target_columns, v_create_sql in
    select * from (values
      ('idx_ai_assessments_ai_system_fk','ai_assessments',array['ai_system_id']::text[],'create index if not exists idx_ai_assessments_ai_system_fk on public.ai_assessments (ai_system_id)'),
      ('idx_ai_assessments_created_by_fk','ai_assessments',array['created_by']::text[],'create index if not exists idx_ai_assessments_created_by_fk on public.ai_assessments (created_by)'),
      ('idx_ai_incidents_ai_system_fk','ai_incidents',array['ai_system_id']::text[],'create index if not exists idx_ai_incidents_ai_system_fk on public.ai_incidents (ai_system_id)'),
      ('idx_ai_incidents_created_by_fk','ai_incidents',array['created_by']::text[],'create index if not exists idx_ai_incidents_created_by_fk on public.ai_incidents (created_by)'),
      ('idx_audit_logs_actor_fk','audit_logs',array['actor_id']::text[],'create index if not exists idx_audit_logs_actor_fk on public.audit_logs (actor_id)'),
      ('idx_audit_logs_user_fk','audit_logs',array['user_id']::text[],'create index if not exists idx_audit_logs_user_fk on public.audit_logs (user_id)'),
      ('idx_metric_snapshots_org_fk','compliance_metric_snapshots',array['organization_id']::text[],'create index if not exists idx_metric_snapshots_org_fk on public.compliance_metric_snapshots (organization_id)'),
      ('idx_compliance_tasks_assigned_fk','compliance_tasks',array['assigned_to']::text[],'create index if not exists idx_compliance_tasks_assigned_fk on public.compliance_tasks (assigned_to)'),
      ('idx_compliance_tasks_created_by_fk','compliance_tasks',array['created_by']::text[],'create index if not exists idx_compliance_tasks_created_by_fk on public.compliance_tasks (created_by)'),
      ('idx_documents_created_by_fk','documents',array['created_by']::text[],'create index if not exists idx_documents_created_by_fk on public.documents (created_by)'),
      ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events',array['actor_user_id']::text[],'create index if not exists idx_ent_recon_events_actor_fk on public.enterprise_entitlement_reconciliation_events (actor_user_id)'),
      ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots',array['source_id','organization_id']::text[],'create index if not exists idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (source_id, organization_id)'),
      ('idx_seat_events_actor_fk','enterprise_seat_events',array['actor_user_id']::text[],'create index if not exists idx_seat_events_actor_fk on public.enterprise_seat_events (actor_user_id)'),
      ('idx_seat_events_reservation_fk','enterprise_seat_events',array['reservation_id']::text[],'create index if not exists idx_seat_events_reservation_fk on public.enterprise_seat_events (reservation_id)'),
      ('idx_seat_policies_updated_by_fk','enterprise_seat_policies',array['updated_by']::text[],'create index if not exists idx_seat_policies_updated_by_fk on public.enterprise_seat_policies (updated_by)'),
      ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations',array['reserved_by']::text[],'create index if not exists idx_seat_reservations_reserved_by_fk on public.enterprise_seat_reservations (reserved_by)'),
      ('idx_invitations_invited_by_fk','invitations',array['invited_by']::text[],'create index if not exists idx_invitations_invited_by_fk on public.invitations (invited_by)'),
      ('idx_monitoring_preferences_user_fk','monitoring_preferences',array['user_id']::text[],'create index if not exists idx_monitoring_preferences_user_fk on public.monitoring_preferences (user_id)'),
      ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs',array['created_by']::text[],'create index if not exists idx_onboarding_runs_created_by_fk on public.onboarding_activation_runs (created_by)'),
      ('idx_org_members_user_fk','organization_members',array['user_id']::text[],'create index if not exists idx_org_members_user_fk on public.organization_members (user_id)'),
      ('idx_organizations_created_by_fk','organizations',array['created_by']::text[],'create index if not exists idx_organizations_created_by_fk on public.organizations (created_by)'),
      ('idx_organizations_owner_fk','organizations',array['owner_id']::text[],'create index if not exists idx_organizations_owner_fk on public.organizations (owner_id)'),
      ('idx_risks_created_by_fk','risks',array['created_by']::text[],'create index if not exists idx_risks_created_by_fk on public.risks (created_by)'),
      ('idx_risks_owner_fk','risks',array['owner_id']::text[],'create index if not exists idx_risks_owner_fk on public.risks (owner_id)'),
      ('idx_role_permissions_permission_fk','role_permissions',array['permission_key']::text[],'create index if not exists idx_role_permissions_permission_fk on public.role_permissions (permission_key)'),
      ('idx_vendors_created_by_fk','vendors',array['created_by']::text[],'create index if not exists idx_vendors_created_by_fk on public.vendors (created_by)'),
      ('idx_vendors_owner_fk','vendors',array['owner_id']::text[],'create index if not exists idx_vendors_owner_fk on public.vendors (owner_id)')
    ) as expected(index_name, table_name, target_columns, create_sql)
  loop
    if to_regclass(format('public.%I', v_table_name)) is not null then
      select count(*) into v_missing_columns
      from unnest(v_target_columns) as required_column(column_name)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = v_table_name
          and c.column_name = required_column.column_name
      );

      if v_missing_columns = 0 then
        execute v_create_sql;
      end if;
    end if;
  end loop;
end
$fk_covering_indexes_apply$;

do $fk_covering_indexes_guard$
declare
  missing integer := 0;
  required record;
  missing_columns integer;
begin
  for required in
    select * from (values
      ('idx_ai_assessments_ai_system_fk','ai_assessments',array['ai_system_id']::text[]),
      ('idx_ai_assessments_created_by_fk','ai_assessments',array['created_by']::text[]),
      ('idx_ai_incidents_ai_system_fk','ai_incidents',array['ai_system_id']::text[]),
      ('idx_ai_incidents_created_by_fk','ai_incidents',array['created_by']::text[]),
      ('idx_audit_logs_actor_fk','audit_logs',array['actor_id']::text[]),
      ('idx_audit_logs_user_fk','audit_logs',array['user_id']::text[]),
      ('idx_metric_snapshots_org_fk','compliance_metric_snapshots',array['organization_id']::text[]),
      ('idx_compliance_tasks_assigned_fk','compliance_tasks',array['assigned_to']::text[]),
      ('idx_compliance_tasks_created_by_fk','compliance_tasks',array['created_by']::text[]),
      ('idx_documents_created_by_fk','documents',array['created_by']::text[]),
      ('idx_ent_recon_events_actor_fk','enterprise_entitlement_reconciliation_events',array['actor_user_id']::text[]),
      ('idx_ent_snapshots_source_org_fk','enterprise_entitlement_snapshots',array['source_id','organization_id']::text[]),
      ('idx_seat_events_actor_fk','enterprise_seat_events',array['actor_user_id']::text[]),
      ('idx_seat_events_reservation_fk','enterprise_seat_events',array['reservation_id']::text[]),
      ('idx_seat_policies_updated_by_fk','enterprise_seat_policies',array['updated_by']::text[]),
      ('idx_seat_reservations_reserved_by_fk','enterprise_seat_reservations',array['reserved_by']::text[]),
      ('idx_invitations_invited_by_fk','invitations',array['invited_by']::text[]),
      ('idx_monitoring_preferences_user_fk','monitoring_preferences',array['user_id']::text[]),
      ('idx_onboarding_runs_created_by_fk','onboarding_activation_runs',array['created_by']::text[]),
      ('idx_org_members_user_fk','organization_members',array['user_id']::text[]),
      ('idx_organizations_created_by_fk','organizations',array['created_by']::text[]),
      ('idx_organizations_owner_fk','organizations',array['owner_id']::text[]),
      ('idx_risks_created_by_fk','risks',array['created_by']::text[]),
      ('idx_risks_owner_fk','risks',array['owner_id']::text[]),
      ('idx_role_permissions_permission_fk','role_permissions',array['permission_key']::text[]),
      ('idx_vendors_created_by_fk','vendors',array['created_by']::text[]),
      ('idx_vendors_owner_fk','vendors',array['owner_id']::text[])
    ) as expected(index_name, table_name, target_columns)
  loop
    if to_regclass(format('public.%I', required.table_name)) is not null then
      select count(*) into missing_columns
      from unnest(required.target_columns) as required_column(column_name)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = required.table_name
          and c.column_name = required_column.column_name
      );

      if missing_columns = 0
        and to_regclass('public.' || required.index_name) is null then
        missing := missing + 1;
      end if;
    end if;
  end loop;

  if missing <> 0 then
    raise exception 'missing required foreign-key covering indexes after reconciliation: %', missing;
  end if;
end
$fk_covering_indexes_guard$;

commit;
