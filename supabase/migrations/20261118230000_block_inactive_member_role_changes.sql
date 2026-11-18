-- RISCK COMPLY: deny role edits to suspended/deprovisioned members.
-- Isolated QA PG17.11 pg_get_functiondef baseline MD5 5d60573052ea68c18fb2de26fa8485c2.
-- Review-required candidate only: do not apply to QA/Production until qualified review.
-- Preserve original usage/member lock order and SECURITY DEFINER search path.

CREATE OR REPLACE FUNCTION public.change_organization_member_role_atomic(p_organization_id uuid, p_member_id uuid, p_expected_role text, p_next_role text)
 RETURNS TABLE(outcome text, affected_member_id uuid, affected_user_id uuid, previous_role text, applied_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_member public.organization_members%rowtype;
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_next_role text := lower(trim(coalesce(p_next_role, '')));
  v_expected_role text := lower(trim(coalesce(p_expected_role, '')));
  v_owner_count integer;
  v_active_admins integer;
  v_pending_admins integer;
  v_admin_limit integer;
begin
  if p_organization_id is null or p_member_id is null then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;

  if v_next_role not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select 'invalid_role'::text, p_member_id, null::uuid, null::text, null::text;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  perform 1
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

  select member.* into v_member
  from public.organization_members as member
  where member.id = p_member_id
    and member.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, p_member_id, null::uuid, null::text, null::text;
    return;
  end if;

  -- Reject inactive targets after acquiring the membership row lock.
  if v_member.status is distinct from 'active' then
    return query select 'member_inactive'::text, p_member_id, v_member.user_id, v_member.role, null::text;
    return;
  end if;

  if lower(coalesce(v_member.role, '')) is distinct from v_expected_role then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role, null::text;
    return;
  end if;

  if lower(coalesce(v_member.role, 'viewer')) = v_next_role then
    return query select 'unchanged'::text, p_member_id, v_member.user_id, v_member.role, v_member.role;
    return;
  end if;

  if lower(coalesce(v_member.role, '')) = 'owner' and v_next_role <> 'owner' then
    select count(*)::integer into v_owner_count
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.status = 'active'
      and lower(coalesce(member.role, '')) = 'owner';

    if v_owner_count <= 1 then
      return query select 'last_owner'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;
  end if;

  if v_next_role in ('owner', 'admin')
    and lower(coalesce(v_member.role, '')) not in ('owner', 'admin') then
    select contract.* into v_contract
    from public.enterprise_contracts as contract
    where contract.organization_id = p_organization_id
      and contract.status in (
        'draft', 'pending_activation', 'active', 'past_due', 'grace_period',
        'read_only', 'suspended'
      )
    order by contract.version desc, contract.updated_at desc
    limit 1
    for update;

    if not found or v_contract.status <> 'active' then
      return query select 'contract_not_active'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;

    select entitlement.* into v_entitlement
    from public.organization_entitlements as entitlement
    where entitlement.organization_id = p_organization_id
      and entitlement.contract_id = v_contract.id
    for update;

    if not found then
      return query select 'entitlements_missing'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;

    select count(*)::integer into v_active_admins
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.status = 'active'
      and lower(coalesce(member.role, '')) in ('owner', 'admin');

    select count(*)::integer into v_pending_admins
    from public.invitations as invitation
    where invitation.organization_id = p_organization_id
      and invitation.accepted_at is null
      and invitation.revoked_at is null
      and invitation.expires_at > now()
      and lower(coalesce(invitation.role, '')) in ('owner', 'admin');

    v_admin_limit := least(v_contract.admin_limit, v_entitlement.admin_limit);

    if v_active_admins + v_pending_admins >= v_admin_limit then
      return query select 'admin_limit_reached'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;
  end if;

  update public.organization_members as member
  set role = v_next_role,
      updated_at = now()
  where member.id = p_member_id
    and member.organization_id = p_organization_id
    and lower(coalesce(member.role, '')) = v_expected_role;

  if not found then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role, null::text;
    return;
  end if;

  return query select 'changed'::text, p_member_id, v_member.user_id, v_member.role, v_next_role;
end;
$function$;

-- Internal canonical RPC must not become directly executable by API principals.
REVOKE ALL ON FUNCTION public.change_organization_member_role_atomic(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
