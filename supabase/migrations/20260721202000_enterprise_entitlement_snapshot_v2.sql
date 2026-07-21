-- Expose a complete control-plane snapshot. Availability must subtract both
-- active memberships and non-expired pending invitations by seat/admin type.

begin;

create or replace function public.resolve_organization_entitlements_v2(
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
  webhooks_enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_usage public.organization_usage%rowtype;
  v_pending_invitations integer := 0;
  v_pending_full_users integer := 0;
  v_pending_participants integer := 0;
  v_pending_viewers integer := 0;
  v_pending_admins integer := 0;
begin
  if p_organization_id is null then
    return query select
      'invalid_input'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in (
      'draft', 'pending_activation', 'active', 'past_due', 'grace_period',
      'read_only', 'suspended', 'expired'
    )
  order by contract.version desc, contract.updated_at desc
  limit 1;

  if not found then
    return query select
      'contract_missing'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = p_organization_id
    and entitlement.contract_id = v_contract.id;

  if not found then
    return query select
      'entitlements_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select usage.* into v_usage
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id;

  if not found then
    return query select
      'usage_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      v_entitlement.member_limit, v_entitlement.full_user_limit,
      v_entitlement.participant_limit, v_entitlement.viewer_limit,
      v_entitlement.admin_limit,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      v_entitlement.sso_enabled, v_entitlement.scim_enabled,
      v_entitlement.api_enabled, v_entitlement.webhooks_enabled;
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = 'full')::integer,
    count(*) filter (where invitation.seat_type = 'participant')::integer,
    count(*) filter (where invitation.seat_type = 'viewer')::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner', 'admin'))::integer
  into
    v_pending_invitations,
    v_pending_full_users,
    v_pending_participants,
    v_pending_viewers,
    v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now();

  return query select
    case when v_contract.status = 'active' then 'resolved' else 'contract_not_active' end,
    v_contract.id,
    v_contract.status,
    v_contract.version,
    least(v_contract.member_limit, v_entitlement.member_limit),
    least(v_contract.full_user_limit, v_entitlement.full_user_limit),
    least(v_contract.participant_limit, v_entitlement.participant_limit),
    least(v_contract.viewer_limit, v_entitlement.viewer_limit),
    least(v_contract.admin_limit, v_entitlement.admin_limit),
    v_usage.active_members,
    v_usage.full_users,
    v_usage.participants,
    v_usage.viewers,
    v_usage.active_admins,
    v_pending_invitations,
    v_pending_full_users,
    v_pending_participants,
    v_pending_viewers,
    v_pending_admins,
    v_entitlement.sso_enabled,
    v_entitlement.scim_enabled,
    v_entitlement.api_enabled,
    v_entitlement.webhooks_enabled;
end;
$$;

revoke all on function public.resolve_organization_entitlements_v2(uuid) from public, anon, authenticated;
grant execute on function public.resolve_organization_entitlements_v2(uuid) to service_role;

-- New backend code uses the complete snapshot. The v1 function remains for
-- database-owned compatibility but is no longer an exposed service entrypoint.
revoke all on function public.resolve_organization_entitlements(uuid) from service_role;

notify pgrst, 'reload schema';

commit;
