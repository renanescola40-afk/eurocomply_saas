-- Update negotiated limits and feature entitlements beneath the same tenant
-- serialization lock used by seat consumers. Downgrades cannot go below active
-- members plus valid pending invitations.

begin;

create or replace function public.update_enterprise_contract_entitlements_atomic(
  p_contract_id uuid,
  p_expected_version integer,
  p_member_limit integer,
  p_full_user_limit integer,
  p_participant_limit integer,
  p_viewer_limit integer,
  p_admin_limit integer,
  p_legal_entity_limit integer,
  p_ai_system_limit integer,
  p_storage_limit_bytes bigint,
  p_audit_retention_days integer,
  p_sso_enabled boolean,
  p_scim_enabled boolean,
  p_api_enabled boolean,
  p_webhooks_enabled boolean,
  p_custom_roles_enabled boolean,
  p_advanced_reports_enabled boolean,
  p_priority_support_enabled boolean,
  p_actor_user_id uuid,
  p_reason text
)
returns table (
  outcome text,
  contract_id uuid,
  organization_id uuid,
  contract_status text,
  version integer,
  member_limit integer,
  full_user_limit integer,
  participant_limit integer,
  viewer_limit integer,
  admin_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_actor_role text;
  v_reason text := trim(coalesce(p_reason, ''));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
  v_pending_members integer := 0;
  v_pending_full integer := 0;
  v_pending_participants integer := 0;
  v_pending_viewers integer := 0;
  v_pending_admins integer := 0;
begin
  if p_contract_id is null
    or p_actor_user_id is null
    or p_expected_version is null
    or p_expected_version < 1 then
    return query select
      'invalid_input'::text, p_contract_id, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if length(v_reason) < 5 or length(v_reason) > 1000 then
    return query select
      'reason_required'::text, p_contract_id, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if p_member_limit < 1
    or p_full_user_limit < 0
    or p_participant_limit < 0
    or p_viewer_limit < 0
    or p_admin_limit < 1
    or p_full_user_limit + p_participant_limit + p_viewer_limit < p_member_limit
    or p_admin_limit > p_member_limit
    or p_legal_entity_limit < 0
    or p_ai_system_limit < 0
    or p_storage_limit_bytes < 0
    or p_audit_retention_days < 0 then
    return query select
      'invalid_limits'::text, p_contract_id, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  select admin.role into v_actor_role
  from public.platform_admin_users as admin
  where admin.user_id = p_actor_user_id
    and admin.enabled = true
    and admin.role in ('owner', 'sales_admin', 'platform_owner', 'platform_admin', 'platform_billing');

  if not found then
    return query select
      'platform_role_required'::text, p_contract_id, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  -- Discover the tenant without locking the contract, then follow the global
  -- tenant lock order: organization_usage -> contract -> entitlements.
  select contract.organization_id into v_organization_id
  from public.enterprise_contracts as contract
  where contract.id = p_contract_id;

  if not found then
    return query select
      'not_found'::text, p_contract_id, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;

  perform 1
  from public.organization_usage as usage
  where usage.organization_id = v_organization_id
  for update;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.id = p_contract_id
    and contract.organization_id = v_organization_id
  for update;

  if not found then
    return query select
      'not_found'::text, p_contract_id, v_organization_id, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_contract.status = 'terminated' then
    return query select
      'contract_terminated'::text, v_contract.id, v_contract.organization_id,
      v_contract.status, v_contract.version,
      v_contract.member_limit, v_contract.full_user_limit, v_contract.participant_limit,
      v_contract.viewer_limit, v_contract.admin_limit;
    return;
  end if;

  if v_contract.version <> p_expected_version then
    return query select
      'version_changed'::text, v_contract.id, v_contract.organization_id,
      v_contract.status, v_contract.version,
      v_contract.member_limit, v_contract.full_user_limit, v_contract.participant_limit,
      v_contract.viewer_limit, v_contract.admin_limit;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = v_contract.organization_id
    and entitlement.contract_id = v_contract.id
  for update;

  if not found then
    return query select
      'entitlements_missing'::text, v_contract.id, v_contract.organization_id,
      v_contract.status, v_contract.version,
      v_contract.member_limit, v_contract.full_user_limit, v_contract.participant_limit,
      v_contract.viewer_limit, v_contract.admin_limit;
    return;
  end if;

  select
    count(*) filter (where member.status = 'active')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'full')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'participant')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'viewer')::integer,
    count(*) filter (
      where member.status = 'active'
        and lower(coalesce(member.role, '')) in ('owner', 'admin')
    )::integer
  into
    v_active_members,
    v_full_users,
    v_participants,
    v_viewers,
    v_active_admins
  from public.organization_members as member
  where member.organization_id = v_contract.organization_id;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = 'full')::integer,
    count(*) filter (where invitation.seat_type = 'participant')::integer,
    count(*) filter (where invitation.seat_type = 'viewer')::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner', 'admin'))::integer
  into
    v_pending_members,
    v_pending_full,
    v_pending_participants,
    v_pending_viewers,
    v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = v_contract.organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now();

  if v_active_members + v_pending_members > p_member_limit
    or v_full_users + v_pending_full > p_full_user_limit
    or v_participants + v_pending_participants > p_participant_limit
    or v_viewers + v_pending_viewers > p_viewer_limit
    or v_active_admins + v_pending_admins > p_admin_limit then
    return query select
      'limits_below_committed_usage'::text, v_contract.id, v_contract.organization_id,
      v_contract.status, v_contract.version,
      v_contract.member_limit, v_contract.full_user_limit, v_contract.participant_limit,
      v_contract.viewer_limit, v_contract.admin_limit;
    return;
  end if;

  update public.enterprise_contracts as contract
  set
    member_limit = p_member_limit,
    full_user_limit = p_full_user_limit,
    participant_limit = p_participant_limit,
    viewer_limit = p_viewer_limit,
    admin_limit = p_admin_limit,
    legal_entity_limit = p_legal_entity_limit,
    ai_system_limit = p_ai_system_limit,
    storage_limit_bytes = p_storage_limit_bytes,
    audit_retention_days = p_audit_retention_days,
    sso_enabled = coalesce(p_sso_enabled, false),
    scim_enabled = coalesce(p_scim_enabled, false),
    api_enabled = coalesce(p_api_enabled, false),
    webhooks_enabled = coalesce(p_webhooks_enabled, false),
    custom_roles_enabled = coalesce(p_custom_roles_enabled, false),
    advanced_reports_enabled = coalesce(p_advanced_reports_enabled, false),
    priority_support_enabled = coalesce(p_priority_support_enabled, false),
    version = contract.version + 1,
    updated_by = p_actor_user_id,
    updated_at = now()
  where contract.id = v_contract.id
    and contract.version = p_expected_version;

  if not found then
    return query select
      'version_changed'::text, v_contract.id, v_contract.organization_id,
      v_contract.status, v_contract.version,
      v_contract.member_limit, v_contract.full_user_limit, v_contract.participant_limit,
      v_contract.viewer_limit, v_contract.admin_limit;
    return;
  end if;

  update public.organization_entitlements as entitlement
  set
    member_limit = p_member_limit,
    full_user_limit = p_full_user_limit,
    participant_limit = p_participant_limit,
    viewer_limit = p_viewer_limit,
    admin_limit = p_admin_limit,
    legal_entity_limit = p_legal_entity_limit,
    ai_system_limit = p_ai_system_limit,
    storage_limit_bytes = p_storage_limit_bytes,
    audit_retention_days = p_audit_retention_days,
    sso_enabled = coalesce(p_sso_enabled, false),
    scim_enabled = coalesce(p_scim_enabled, false),
    api_enabled = coalesce(p_api_enabled, false),
    webhooks_enabled = coalesce(p_webhooks_enabled, false),
    custom_roles_enabled = coalesce(p_custom_roles_enabled, false),
    advanced_reports_enabled = coalesce(p_advanced_reports_enabled, false),
    priority_support_enabled = coalesce(p_priority_support_enabled, false),
    version = entitlement.version + 1,
    updated_by = p_actor_user_id,
    updated_at = now()
  where entitlement.organization_id = v_contract.organization_id
    and entitlement.contract_id = v_contract.id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_contract.organization_id,
    p_actor_user_id,
    'enterprise.entitlement_changed',
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object(
      'reason', v_reason,
      'platform_role', v_actor_role,
      'previous_version', v_contract.version,
      'next_version', v_contract.version + 1,
      'previous_limits', jsonb_build_object(
        'members', v_contract.member_limit,
        'full_users', v_contract.full_user_limit,
        'participants', v_contract.participant_limit,
        'viewers', v_contract.viewer_limit,
        'admins', v_contract.admin_limit
      ),
      'next_limits', jsonb_build_object(
        'members', p_member_limit,
        'full_users', p_full_user_limit,
        'participants', p_participant_limit,
        'viewers', p_viewer_limit,
        'admins', p_admin_limit
      )
    )
  );

  return query select
    'changed'::text,
    v_contract.id,
    v_contract.organization_id,
    v_contract.status,
    v_contract.version + 1,
    p_member_limit,
    p_full_user_limit,
    p_participant_limit,
    p_viewer_limit,
    p_admin_limit;
end;
$$;

revoke all on function public.update_enterprise_contract_entitlements_atomic(
  uuid, integer, integer, integer, integer, integer, integer, integer, integer,
  bigint, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean,
  uuid, text
) from public, anon, authenticated;

grant execute on function public.update_enterprise_contract_entitlements_atomic(
  uuid, integer, integer, integer, integer, integer, integer, integer, integer,
  bigint, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean,
  uuid, text
) to service_role;

notify pgrst, 'reload schema';

commit;
