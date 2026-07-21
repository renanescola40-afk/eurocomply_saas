begin;

alter table public.enterprise_service_accounts
  add constraint enterprise_service_accounts_id_org_key unique (id, organization_id);
alter table public.enterprise_webhook_subscriptions
  add constraint enterprise_webhook_subscriptions_id_org_key unique (id, organization_id);
alter table public.enterprise_identity_connections
  add constraint enterprise_identity_connections_id_org_key unique (id, organization_id);
alter table public.enterprise_api_keys
  add constraint enterprise_api_keys_id_org_key unique (id, organization_id);

alter table public.enterprise_api_keys
  add constraint enterprise_api_keys_service_account_tenant_fk
  foreign key (service_account_id, organization_id)
  references public.enterprise_service_accounts(id, organization_id)
  on delete cascade;

alter table public.enterprise_api_keys
  add constraint enterprise_api_keys_rotation_tenant_fk
  foreign key (rotated_from_id, organization_id)
  references public.enterprise_api_keys(id, organization_id);

alter table public.enterprise_webhook_deliveries
  add constraint enterprise_webhook_deliveries_subscription_tenant_fk
  foreign key (subscription_id, organization_id)
  references public.enterprise_webhook_subscriptions(id, organization_id)
  on delete cascade;

alter table public.enterprise_scim_tokens
  add constraint enterprise_scim_tokens_connection_tenant_fk
  foreign key (identity_connection_id, organization_id)
  references public.enterprise_identity_connections(id, organization_id)
  on delete cascade;

alter table public.enterprise_integration_audit_events
  add constraint enterprise_integration_audit_service_account_tenant_fk
  foreign key (actor_service_account_id, organization_id)
  references public.enterprise_service_accounts(id, organization_id);

commit;
