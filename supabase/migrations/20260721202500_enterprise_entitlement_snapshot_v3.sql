-- Extend the control-plane snapshot with every limit and feature that can be
-- amended. This prevents a partial UI update from replacing hidden negotiated
-- values with defaults.

begin;

create or replace function public.resolve_organization_entitlements_v3(
  p_organization_id uuid
)
returns table (
  outcome text,
  contract_id uuid,
  contract_status text,
  contract_version integer,
  member_limit integer,
  full_user_limit integer,
  participant_limit integer,
  viewer_limit integer,
  admin_limit integer,
  legal_entity_limit integer,
  ai_system_limit integer,
  storage_limit_bytes bigint,
  audit_retention_days integer,
  active_members integer,
  full_users integer,
  participants integer,
  viewers integer,
  active_admins integer,
  pending_invitations integer,
  pending_full_users integer,
  pending_participants integer,
  pending_viewers integer,
  pending_admins integer,
  sso_enabled boolean,
  scim_enabled boolean,
  api_enabled boolean,
  webhooks_enabled boolean,
  custom_roles_enabled boolean,
  advanced_reports_enabled boolean,
  priority_support_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    snapshot.outcome,
    snapshot.contract_id,
    snapshot.contract_status,
    snapshot.contract_version,
    snapshot.member_limit,
    snapshot.full_user_limit,
    snapshot.participant_limit,
    snapshot.viewer_limit,
    snapshot.admin_limit,
    least(contract.legal_entity_limit, entitlement.legal_entity_limit) as legal_entity_limit,
    least(contract.ai_system_limit, entitlement.ai_system_limit) as ai_system_limit,
    least(contract.storage_limit_bytes, entitlement.storage_limit_bytes) as storage_limit_bytes,
    least(contract.audit_retention_days, entitlement.audit_retention_days) as audit_retention_days,
    snapshot.active_members,
    snapshot.full_users,
    snapshot.participants,
    snapshot.viewers,
    snapshot.active_admins,
    snapshot.pending_invitations,
    snapshot.pending_full_users,
    snapshot.pending_participants,
    snapshot.pending_viewers,
    snapshot.pending_admins,
    snapshot.sso_enabled,
    snapshot.scim_enabled,
    snapshot.api_enabled,
    snapshot.webhooks_enabled,
    contract.custom_roles_enabled and entitlement.custom_roles_enabled as custom_roles_enabled,
    contract.advanced_reports_enabled and entitlement.advanced_reports_enabled as advanced_reports_enabled,
    contract.priority_support_enabled and entitlement.priority_support_enabled as priority_support_enabled
  from public.resolve_organization_entitlements_v2(p_organization_id) as snapshot
  left join public.enterprise_contracts as contract
    on contract.id = snapshot.contract_id
    and contract.organization_id = p_organization_id
  left join public.organization_entitlements as entitlement
    on entitlement.organization_id = p_organization_id
    and entitlement.contract_id = snapshot.contract_id;
$$;

revoke all on function public.resolve_organization_entitlements_v3(uuid) from public, anon, authenticated;
grant execute on function public.resolve_organization_entitlements_v3(uuid) to service_role;

-- v2 remains callable by the database-owned v3 function but is no longer a
-- backend service entrypoint.
revoke all on function public.resolve_organization_entitlements_v2(uuid) from service_role;

notify pgrst, 'reload schema';

commit;
