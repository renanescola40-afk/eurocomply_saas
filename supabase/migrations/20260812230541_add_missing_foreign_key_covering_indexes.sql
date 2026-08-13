begin;

create index if not exists idx_ai_assessments_ai_system_fk on public.ai_assessments (ai_system_id);
create index if not exists idx_ai_assessments_created_by_fk on public.ai_assessments (created_by);
create index if not exists idx_ai_incidents_ai_system_fk on public.ai_incidents (ai_system_id);
create index if not exists idx_ai_incidents_created_by_fk on public.ai_incidents (created_by);
create index if not exists idx_audit_logs_actor_fk on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_user_fk on public.audit_logs (user_id);
create index if not exists idx_metric_snapshots_org_fk on public.compliance_metric_snapshots (organization_id);
create index if not exists idx_compliance_tasks_assigned_fk on public.compliance_tasks (assigned_to);
create index if not exists idx_compliance_tasks_created_by_fk on public.compliance_tasks (created_by);
create index if not exists idx_documents_created_by_fk on public.documents (created_by);
create index if not exists idx_ent_recon_events_actor_fk on public.enterprise_entitlement_reconciliation_events (actor_user_id);
create index if not exists idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (source_id, organization_id);
create index if not exists idx_seat_events_actor_fk on public.enterprise_seat_events (actor_user_id);
create index if not exists idx_seat_events_reservation_fk on public.enterprise_seat_events (reservation_id);
create index if not exists idx_seat_policies_updated_by_fk on public.enterprise_seat_policies (updated_by);
create index if not exists idx_seat_reservations_reserved_by_fk on public.enterprise_seat_reservations (reserved_by);
create index if not exists idx_invitations_invited_by_fk on public.invitations (invited_by);
create index if not exists idx_monitoring_preferences_user_fk on public.monitoring_preferences (user_id);
create index if not exists idx_onboarding_runs_created_by_fk on public.onboarding_activation_runs (created_by);
create index if not exists idx_org_members_user_fk on public.organization_members (user_id);
create index if not exists idx_organizations_created_by_fk on public.organizations (created_by);
create index if not exists idx_organizations_owner_fk on public.organizations (owner_id);
create index if not exists idx_risks_created_by_fk on public.risks (created_by);
create index if not exists idx_risks_owner_fk on public.risks (owner_id);
create index if not exists idx_role_permissions_permission_fk on public.role_permissions (permission_key);
create index if not exists idx_vendors_created_by_fk on public.vendors (created_by);
create index if not exists idx_vendors_owner_fk on public.vendors (owner_id);

do $$
declare
  missing integer;
begin
  select count(*) into missing
  from (values
    ('idx_ai_assessments_ai_system_fk'),
    ('idx_ai_assessments_created_by_fk'),
    ('idx_ai_incidents_ai_system_fk'),
    ('idx_ai_incidents_created_by_fk'),
    ('idx_audit_logs_actor_fk'),
    ('idx_audit_logs_user_fk'),
    ('idx_metric_snapshots_org_fk'),
    ('idx_compliance_tasks_assigned_fk'),
    ('idx_compliance_tasks_created_by_fk'),
    ('idx_documents_created_by_fk'),
    ('idx_ent_recon_events_actor_fk'),
    ('idx_ent_snapshots_source_org_fk'),
    ('idx_seat_events_actor_fk'),
    ('idx_seat_events_reservation_fk'),
    ('idx_seat_policies_updated_by_fk'),
    ('idx_seat_reservations_reserved_by_fk'),
    ('idx_invitations_invited_by_fk'),
    ('idx_monitoring_preferences_user_fk'),
    ('idx_onboarding_runs_created_by_fk'),
    ('idx_org_members_user_fk'),
    ('idx_organizations_created_by_fk'),
    ('idx_organizations_owner_fk'),
    ('idx_risks_created_by_fk'),
    ('idx_risks_owner_fk'),
    ('idx_role_permissions_permission_fk'),
    ('idx_vendors_created_by_fk'),
    ('idx_vendors_owner_fk')
  ) as required(index_name)
  where to_regclass('public.' || required.index_name) is null;

  if missing <> 0 then
    raise exception 'missing required foreign-key covering indexes after reconciliation: %', missing;
  end if;
end $$;

commit;
