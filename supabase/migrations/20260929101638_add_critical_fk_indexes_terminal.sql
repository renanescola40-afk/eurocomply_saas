-- Terminal database hardening: indexes limited to hot paths and security/tenant relationships.

create index if not exists idx_enterprise_contracts_created_by_fk on public.enterprise_contracts(created_by);
create index if not exists idx_enterprise_contracts_updated_by_fk on public.enterprise_contracts(updated_by);
create index if not exists idx_organization_entitlements_updated_by_fk on public.organization_entitlements(updated_by);
create index if not exists idx_audit_logs_actor_user_id_fk on public.audit_logs(actor_user_id);
create index if not exists idx_compliance_tasks_owner_id_fk on public.compliance_tasks(owner_id);
create index if not exists idx_vendors_approved_by_fk on public.vendors(approved_by);
create index if not exists idx_data_subject_requests_requester_user_fk on public.data_subject_requests(requester_user_id);
create index if not exists idx_enterprise_access_export_jobs_org_fk on public.enterprise_access_export_jobs(organization_id);
create index if not exists idx_enterprise_access_operation_events_org_fk on public.enterprise_access_operation_events(organization_id);
create index if not exists idx_enterprise_access_operation_events_operation_fk on public.enterprise_access_operation_events(operation_id);
create index if not exists idx_enterprise_access_operation_items_org_fk on public.enterprise_access_operation_items(organization_id);
create index if not exists idx_enterprise_access_operation_items_membership_fk on public.enterprise_access_operation_items(membership_id);
create index if not exists idx_enterprise_api_keys_service_account_tenant_fk on public.enterprise_api_keys(service_account_id, organization_id);
create index if not exists idx_enterprise_api_keys_rotation_tenant_fk on public.enterprise_api_keys(rotated_from_id, organization_id);
create index if not exists idx_enterprise_scim_identities_connection_tenant_fk on public.enterprise_scim_identities(identity_connection_id, organization_id);
create index if not exists idx_enterprise_scim_tokens_connection_tenant_fk on public.enterprise_scim_tokens(identity_connection_id, organization_id);
create index if not exists idx_enterprise_webhook_subscriptions_org_fk on public.enterprise_webhook_subscriptions(organization_id);
create index if not exists idx_enterprise_webhook_deliveries_subscription_tenant_fk on public.enterprise_webhook_deliveries(subscription_id, organization_id);
create index if not exists idx_ai_qms_audits_org_system_fk on public.ai_qms_audits(organization_id, qms_system_id);
create index if not exists idx_ai_qms_management_reviews_org_system_fk on public.ai_qms_management_reviews(organization_id, qms_system_id);
create index if not exists idx_ai_qms_nonconformities_org_system_fk on public.ai_qms_nonconformities(organization_id, qms_system_id);
