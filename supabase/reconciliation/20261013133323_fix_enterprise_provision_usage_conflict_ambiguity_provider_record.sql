-- PROVIDER RECORD ONLY. NOT AN AUTOMATIC MIGRATION.
-- Captures the exact SQL statement recorded in the production Supabase migration ledger.
-- Purpose: source provenance and isolated QA/recovery replay planning; never auto-apply to production.
-- provider_version: 20261013133323
-- provider_name: fix_enterprise_provision_usage_conflict_ambiguity
-- provider_statement_sha256: 6eb4f7dfe9291502bc07fb2404af0bceeba5c9426e95ed7ef7c9f17f55c5d89e
-- production data is not embedded in this file.
-- BEGIN PROVIDER-APPLIED STATEMENT
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
set search_path=pg_catalog
as $$
declare
  v_actor_role text;
  v_currency text:=upper(trim(coalesce(p_currency,'')));
  v_contract_code text:=trim(coalesce(p_contract_code,''));
  v_active_members integer:=0;
  v_full_users integer:=0;
  v_participants integer:=0;
  v_viewers integer:=0;
  v_active_admins integer:=0;
  v_pending_members integer:=0;
  v_pending_full integer:=0;
  v_pending_participants integer:=0;
  v_pending_viewers integer:=0;
  v_pending_admins integer:=0;
  v_contract public.enterprise_contracts%rowtype;
begin
  if p_organization_id is null or p_actor_user_id is null or v_contract_code='' then
    return query select 'invalid_input'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  select admin.role into v_actor_role
  from public.platform_admin_users admin
  where admin.user_id=p_actor_user_id and admin.enabled=true
    and admin.role in ('owner','sales_admin','platform_owner','platform_admin','platform_billing');
  if not found then
    return query select 'platform_role_required'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  if v_currency !~ '^[A-Z]{3}$'
     or p_annual_value_minor<0 or p_starts_at is null
     or (p_ends_at is not null and p_ends_at<=p_starts_at)
     or p_payment_terms_days not between 0 and 365
     or p_grace_period_days not between 0 and 365
     or p_member_limit<1 or p_full_user_limit<0 or p_participant_limit<0 or p_viewer_limit<0
     or p_admin_limit<1 or p_full_user_limit+p_participant_limit+p_viewer_limit<p_member_limit
     or p_admin_limit>p_member_limit or p_legal_entity_limit<0 or p_ai_system_limit<0
     or p_storage_limit_bytes<0 or p_audit_retention_days<0 then
    return query select 'invalid_contract'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  if exists (select 1 from public.enterprise_contracts where contract_code=v_contract_code) then
    return query select 'invalid_contract'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  perform 1 from public.organizations organization
  where organization.id=p_organization_id for update;
  if not found then
    return query select 'organization_not_found'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  insert into public.organization_usage(organization_id) values (p_organization_id)
  on conflict on constraint organization_usage_pkey do nothing;
  perform 1 from public.organization_usage usage
  where usage.organization_id=p_organization_id for update;

  if exists (
    select 1 from public.enterprise_contracts contract
    where contract.organization_id=p_organization_id
      and contract.contract_mode='negotiated'
      and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  ) then
    return query select 'current_contract_exists'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  select
    count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members member where member.organization_id=p_organization_id;

  select count(*)::integer,
    count(*) filter (where invitation.seat_type='full')::integer,
    count(*) filter (where invitation.seat_type='participant')::integer,
    count(*) filter (where invitation.seat_type='viewer')::integer,
    count(*) filter (where lower(coalesce(invitation.role,'')) in ('owner','admin'))::integer
  into v_pending_members,v_pending_full,v_pending_participants,v_pending_viewers,v_pending_admins
  from public.invitations invitation
  where invitation.organization_id=p_organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at>now();

  if v_active_members+v_pending_members>p_member_limit
     or v_full_users+v_pending_full>p_full_user_limit
     or v_participants+v_pending_participants>p_participant_limit
     or v_viewers+v_pending_viewers>p_viewer_limit
     or v_active_admins+v_pending_admins>p_admin_limit then
    return query select 'limits_below_current_usage'::text,null::uuid,p_organization_id,null::text,null::integer; return;
  end if;

  delete from public.organization_entitlements entitlement
  using public.enterprise_contracts contract
  where entitlement.organization_id=p_organization_id
    and entitlement.contract_id=contract.id
    and contract.organization_id=p_organization_id
    and contract.contract_mode='compatibility';

  delete from public.enterprise_contracts contract
  where contract.organization_id=p_organization_id and contract.contract_mode='compatibility';

  insert into public.enterprise_contracts(
    organization_id,contract_code,contract_mode,plan,currency,annual_value_minor,billing_cycle,
    starts_at,ends_at,renews_at,payment_terms_days,grace_period_days,status,
    member_limit,full_user_limit,participant_limit,viewer_limit,admin_limit,legal_entity_limit,
    ai_system_limit,storage_limit_bytes,audit_retention_days,sso_enabled,scim_enabled,api_enabled,
    webhooks_enabled,custom_roles_enabled,advanced_reports_enabled,priority_support_enabled,
    custom_features,created_by,updated_by
  ) values (
    p_organization_id,v_contract_code,'negotiated','enterprise',v_currency,p_annual_value_minor,'annual',
    p_starts_at,p_ends_at,p_renews_at,p_payment_terms_days,p_grace_period_days,'draft',
    p_member_limit,p_full_user_limit,p_participant_limit,p_viewer_limit,p_admin_limit,p_legal_entity_limit,
    p_ai_system_limit,p_storage_limit_bytes,p_audit_retention_days,coalesce(p_sso_enabled,false),
    coalesce(p_scim_enabled,false),coalesce(p_api_enabled,false),coalesce(p_webhooks_enabled,false),
    coalesce(p_custom_roles_enabled,false),coalesce(p_advanced_reports_enabled,false),
    coalesce(p_priority_support_enabled,false),'{}'::jsonb,p_actor_user_id,p_actor_user_id
  ) returning * into v_contract;

  insert into public.organization_entitlements(
    organization_id,contract_id,member_limit,full_user_limit,participant_limit,viewer_limit,admin_limit,
    legal_entity_limit,ai_system_limit,storage_limit_bytes,audit_retention_days,sso_enabled,scim_enabled,
    api_enabled,webhooks_enabled,custom_roles_enabled,advanced_reports_enabled,priority_support_enabled,
    source,updated_by
  ) values (
    p_organization_id,v_contract.id,p_member_limit,p_full_user_limit,p_participant_limit,p_viewer_limit,
    p_admin_limit,p_legal_entity_limit,p_ai_system_limit,p_storage_limit_bytes,p_audit_retention_days,
    coalesce(p_sso_enabled,false),coalesce(p_scim_enabled,false),coalesce(p_api_enabled,false),
    coalesce(p_webhooks_enabled,false),coalesce(p_custom_roles_enabled,false),
    coalesce(p_advanced_reports_enabled,false),coalesce(p_priority_support_enabled,false),'contract',p_actor_user_id
  );

  update public.organization_usage set
    active_members=v_active_members,full_users=v_full_users,participants=v_participants,viewers=v_viewers,
    active_admins=v_active_admins,pending_invitations=v_pending_members,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.contract_created','enterprise_contract',v_contract.id::text,
    jsonb_build_object('contract_code',v_contract_code,'platform_role',v_actor_role,'contract_mode','negotiated',
      'member_limit',p_member_limit,'full_user_limit',p_full_user_limit,'participant_limit',p_participant_limit,
      'viewer_limit',p_viewer_limit,'admin_limit',p_admin_limit));

  return query select 'created'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version;
end;
$$;