-- Atomically provision a negotiated Enterprise contract, its entitlements and
-- authoritative usage row. The platform operator is checked again in the DB.

begin;

create or replace function public.create_enterprise_contract_atomic(
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
  v_contract public.enterprise_contracts%rowtype;
  v_actor_role text;
  v_currency text := upper(trim(coalesce(p_currency, '')));
  v_contract_code text := trim(coalesce(p_contract_code, ''));
  v_current_members integer;
  v_current_full integer;
  v_current_participants integer;
  v_current_viewers integer;
  v_current_admins integer;
begin
  if p_organization_id is null or p_actor_user_id is null or v_contract_code = '' then
    return query select 'invalid_input'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  select admin.role into v_actor_role
  from public.platform_admin_users as admin
  where admin.user_id = p_actor_user_id
    and admin.enabled = true
    and admin.role in (
      'owner', 'sales_admin', 'platform_owner', 'platform_admin', 'platform_billing'
    );

  if not found then
    return query select 'platform_role_required'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  perform 1
  from public.organizations as organization
  where organization.id = p_organization_id
  for update;

  if not found then
    return query select 'organization_not_found'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  if v_currency !~ '^[A-Z]{3}$'
    or p_annual_value_minor < 0
    or p_starts_at is null
    or (p_ends_at is not null and p_ends_at <= p_starts_at)
    or p_payment_terms_days not between 0 and 365
    or p_grace_period_days not between 0 and 365
    or p_member_limit < 1
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
    return query select 'invalid_contract'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  if exists (
    select 1
    from public.enterprise_contracts as contract
    where contract.organization_id = p_organization_id
      and contract.status in (
        'draft', 'pending_activation', 'active', 'past_due', 'grace_period',
        'read_only', 'suspended'
      )
      and coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean, false) = false
  ) then
    return query select 'current_contract_exists'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  -- Remove the permissive backfill contract only while provisioning the first
  -- negotiated contract. No customer data or membership row is deleted.
  delete from public.organization_entitlements as entitlement
  using public.enterprise_contracts as contract
  where entitlement.organization_id = p_organization_id
    and entitlement.contract_id = contract.id
    and contract.organization_id = p_organization_id
    and coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean, false) = true;

  delete from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean, false) = true;

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
    v_current_members,
    v_current_full,
    v_current_participants,
    v_current_viewers,
    v_current_admins
  from public.organization_members as member
  where member.organization_id = p_organization_id;

  if v_current_members > p_member_limit
    or v_current_full > p_full_user_limit
    or v_current_participants > p_participant_limit
    or v_current_viewers > p_viewer_limit
    or v_current_admins > p_admin_limit then
    return query select 'limits_below_current_usage'::text, null::uuid, p_organization_id, null::text, null::integer;
    return;
  end if;

  insert into public.enterprise_contracts (
    organization_id,
    contract_code,
    plan,
    currency,
    annual_value_minor,
    billing_cycle,
    starts_at,
    ends_at,
    renews_at,
    payment_terms_days,
    grace_period_days,
    status,
    member_limit,
    full_user_limit,
    participant_limit,
    viewer_limit,
    admin_limit,
    legal_entity_limit,
    ai_system_limit,
    storage_limit_bytes,
    audit_retention_days,
    sso_enabled,
    scim_enabled,
    api_enabled,
    webhooks_enabled,
    custom_roles_enabled,
    advanced_reports_enabled,
    priority_support_enabled,
    created_by,
    updated_by
  ) values (
    p_organization_id,
    v_contract_code,
    'enterprise',
    v_currency,
    p_annual_value_minor,
    'annual',
    p_starts_at,
    p_ends_at,
    p_renews_at,
    p_payment_terms_days,
    p_grace_period_days,
    'draft',
    p_member_limit,
    p_full_user_limit,
    p_participant_limit,
    p_viewer_limit,
    p_admin_limit,
    p_legal_entity_limit,
    p_ai_system_limit,
    p_storage_limit_bytes,
    p_audit_retention_days,
    coalesce(p_sso_enabled, false),
    coalesce(p_scim_enabled, false),
    coalesce(p_api_enabled, false),
    coalesce(p_webhooks_enabled, false),
    coalesce(p_custom_roles_enabled, false),
    coalesce(p_advanced_reports_enabled, false),
    coalesce(p_priority_support_enabled, false),
    p_actor_user_id,
    p_actor_user_id
  ) returning * into v_contract;

  insert into public.organization_entitlements (
    organization_id,
    contract_id,
    member_limit,
    full_user_limit,
    participant_limit,
    viewer_limit,
    admin_limit,
    legal_entity_limit,
    ai_system_limit,
    storage_limit_bytes,
    audit_retention_days,
    sso_enabled,
    scim_enabled,
    api_enabled,
    webhooks_enabled,
    custom_roles_enabled,
    advanced_reports_enabled,
    priority_support_enabled,
    source,
    updated_by
  ) values (
    p_organization_id,
    v_contract.id,
    p_member_limit,
    p_full_user_limit,
    p_participant_limit,
    p_viewer_limit,
    p_admin_limit,
    p_legal_entity_limit,
    p_ai_system_limit,
    p_storage_limit_bytes,
    p_audit_retention_days,
    coalesce(p_sso_enabled, false),
    coalesce(p_scim_enabled, false),
    coalesce(p_api_enabled, false),
    coalesce(p_webhooks_enabled, false),
    coalesce(p_custom_roles_enabled, false),
    coalesce(p_advanced_reports_enabled, false),
    coalesce(p_priority_support_enabled, false),
    'contract',
    p_actor_user_id
  );

  insert into public.organization_usage (
    organization_id,
    active_members,
    full_users,
    participants,
    viewers,
    active_admins,
    last_reconciled_at
  ) values (
    p_organization_id,
    v_current_members,
    v_current_full,
    v_current_participants,
    v_current_viewers,
    v_current_admins,
    now()
  )
  on conflict (organization_id) do update set
    active_members = excluded.active_members,
    full_users = excluded.full_users,
    participants = excluded.participants,
    viewers = excluded.viewers,
    active_admins = excluded.active_admins,
    last_reconciled_at = excluded.last_reconciled_at,
    updated_at = now();

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_actor_user_id,
    'enterprise.contract_created',
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object(
      'contract_code', v_contract.contract_code,
      'currency', v_contract.currency,
      'annual_value_minor', v_contract.annual_value_minor,
      'member_limit', v_contract.member_limit,
      'full_user_limit', v_contract.full_user_limit,
      'participant_limit', v_contract.participant_limit,
      'viewer_limit', v_contract.viewer_limit,
      'admin_limit', v_contract.admin_limit,
      'platform_role', v_actor_role
    )
  );

  return query select
    'created'::text,
    v_contract.id,
    v_contract.organization_id,
    v_contract.status,
    v_contract.version;
end;
$$;

revoke all on function public.create_enterprise_contract_atomic(
  uuid, text, text, bigint, timestamptz, timestamptz, timestamptz,
  integer, integer, integer, integer, integer, integer, integer,
  integer, integer, bigint, integer, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, uuid
) from public, anon, authenticated;

grant execute on function public.create_enterprise_contract_atomic(
  uuid, text, text, bigint, timestamptz, timestamptz, timestamptz,
  integer, integer, integer, integer, integer, integer, integer,
  integer, integer, bigint, integer, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, uuid
) to service_role;

notify pgrst, 'reload schema';

commit;
