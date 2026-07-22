-- Guard negotiated contract provisioning before the compatibility contract is
-- replaced. The authoritative usage row is locked so seat changes cannot race
-- the limit validation.

begin;

create or replace function public.provision_enterprise_contract_atomic(
  p_organization_id uuid,
  p_contract_code text,
  p_currency text,
  p_annual_value_minor bigint,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_renews_at timestamptz,
  p_payment_terms_days integer,
  p_grace_period_days integer,
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
  p_actor_user_id uuid
)
returns table (
  outcome text,
  contract_id uuid,
  organization_id uuid,
  contract_status text,
  version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.organization_usage%rowtype;
  v_result record;
begin
  if p_organization_id is null or p_actor_user_id is null then
    return query select 'invalid_input'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select usage.* into v_usage
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

  -- Reconcile beneath the same organization usage lock used by seat consumers.
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
    v_usage.active_members,
    v_usage.full_users,
    v_usage.participants,
    v_usage.viewers,
    v_usage.active_admins
  from public.organization_members as member
  where member.organization_id = p_organization_id;

  if v_usage.active_members > p_member_limit
    or v_usage.full_users > p_full_user_limit
    or v_usage.participants > p_participant_limit
    or v_usage.viewers > p_viewer_limit
    or v_usage.active_admins > p_admin_limit then
    return query select
      'limits_below_current_usage'::text,
      null::uuid,
      p_organization_id,
      null::text,
      null::integer;
    return;
  end if;

  select * into v_result
  from public.create_enterprise_contract_atomic(
    p_organization_id,
    p_contract_code,
    p_currency,
    p_annual_value_minor,
    p_starts_at,
    p_ends_at,
    p_renews_at,
    p_payment_terms_days,
    p_grace_period_days,
    p_member_limit,
    p_full_user_limit,
    p_participant_limit,
    p_viewer_limit,
    p_admin_limit,
    p_legal_entity_limit,
    p_ai_system_limit,
    p_storage_limit_bytes,
    p_audit_retention_days,
    p_sso_enabled,
    p_scim_enabled,
    p_api_enabled,
    p_webhooks_enabled,
    p_custom_roles_enabled,
    p_advanced_reports_enabled,
    p_priority_support_enabled,
    p_actor_user_id
  );

  return query select
    v_result.outcome,
    v_result.contract_id,
    v_result.organization_id,
    v_result.contract_status,
    v_result.version;
end;
$$;

-- The lower-level function is internal to the safe wrapper.
revoke all on function public.create_enterprise_contract_atomic(
  uuid, text, text, bigint, timestamptz, timestamptz, timestamptz,
  integer, integer, integer, integer, integer, integer, integer,
  integer, integer, bigint, integer, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, uuid
) from service_role;

revoke all on function public.provision_enterprise_contract_atomic(
  uuid, text, text, bigint, timestamptz, timestamptz, timestamptz,
  integer, integer, integer, integer, integer, integer, integer,
  integer, integer, bigint, integer, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, uuid
) from public, anon, authenticated;

grant execute on function public.provision_enterprise_contract_atomic(
  uuid, text, text, bigint, timestamptz, timestamptz, timestamptz,
  integer, integer, integer, integer, integer, integer, integer,
  integer, integer, bigint, integer, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, uuid
) to service_role;

notify pgrst, 'reload schema';

commit;
