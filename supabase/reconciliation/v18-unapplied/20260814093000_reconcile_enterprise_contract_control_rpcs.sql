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
  on conflict (organization_id) do nothing;
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

create or replace function public.update_enterprise_contract_entitlements_atomic(
  p_contract_id uuid,p_expected_version integer,p_member_limit integer,p_full_user_limit integer,
  p_participant_limit integer,p_viewer_limit integer,p_admin_limit integer,p_legal_entity_limit integer,
  p_ai_system_limit integer,p_storage_limit_bytes bigint,p_audit_retention_days integer,
  p_sso_enabled boolean,p_scim_enabled boolean,p_api_enabled boolean,p_webhooks_enabled boolean,
  p_custom_roles_enabled boolean,p_advanced_reports_enabled boolean,p_priority_support_enabled boolean,
  p_actor_user_id uuid,p_reason text
)
returns table (
  outcome text,contract_id uuid,organization_id uuid,contract_status text,version integer,
  member_limit integer,full_user_limit integer,participant_limit integer,viewer_limit integer,admin_limit integer
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_actor_role text;
  v_reason text:=trim(coalesce(p_reason,''));
  v_active_members integer:=0; v_full integer:=0; v_participant integer:=0; v_viewer integer:=0; v_admin integer:=0;
  v_pending integer:=0; v_pending_full integer:=0; v_pending_participant integer:=0; v_pending_viewer integer:=0; v_pending_admin integer:=0;
begin
  if p_contract_id is null or p_actor_user_id is null or p_expected_version is null or p_expected_version<1 then
    return query select 'invalid_input'::text,p_contract_id,null::uuid,null::text,null::integer,null::integer,null::integer,null::integer,null::integer,null::integer; return;
  end if;
  if length(v_reason)<5 or length(v_reason)>1000 then
    return query select 'reason_required'::text,p_contract_id,null::uuid,null::text,null::integer,null::integer,null::integer,null::integer,null::integer,null::integer; return;
  end if;
  if p_member_limit<1 or p_full_user_limit<0 or p_participant_limit<0 or p_viewer_limit<0 or p_admin_limit<1
     or p_full_user_limit+p_participant_limit+p_viewer_limit<p_member_limit or p_admin_limit>p_member_limit
     or p_legal_entity_limit<0 or p_ai_system_limit<0 or p_storage_limit_bytes<0 or p_audit_retention_days<0 then
    return query select 'invalid_limits'::text,p_contract_id,null::uuid,null::text,null::integer,null::integer,null::integer,null::integer,null::integer,null::integer; return;
  end if;

  select admin.role into v_actor_role from public.platform_admin_users admin
  where admin.user_id=p_actor_user_id and admin.enabled=true
    and admin.role in ('owner','sales_admin','platform_owner','platform_admin','platform_billing');
  if not found then
    return query select 'platform_role_required'::text,p_contract_id,null::uuid,null::text,null::integer,null::integer,null::integer,null::integer,null::integer,null::integer; return;
  end if;

  select contract.* into v_contract from public.enterprise_contracts contract
  where contract.id=p_contract_id and contract.contract_mode='negotiated';
  if not found then
    return query select 'not_found'::text,p_contract_id,null::uuid,null::text,null::integer,null::integer,null::integer,null::integer,null::integer,null::integer; return;
  end if;

  insert into public.organization_usage(organization_id) values (v_contract.organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage usage where usage.organization_id=v_contract.organization_id for update;

  select contract.* into v_contract from public.enterprise_contracts contract
  where contract.id=p_contract_id and contract.contract_mode='negotiated' for update;
  if v_contract.status='terminated' then
    return query select 'contract_terminated'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version,
      v_contract.member_limit,v_contract.full_user_limit,v_contract.participant_limit,v_contract.viewer_limit,v_contract.admin_limit; return;
  end if;
  if v_contract.version<>p_expected_version then
    return query select 'version_changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version,
      v_contract.member_limit,v_contract.full_user_limit,v_contract.participant_limit,v_contract.viewer_limit,v_contract.admin_limit; return;
  end if;

  select entitlement.* into v_entitlement from public.organization_entitlements entitlement
  where entitlement.organization_id=v_contract.organization_id and entitlement.contract_id=v_contract.id for update;
  if not found then
    return query select 'entitlements_missing'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version,
      v_contract.member_limit,v_contract.full_user_limit,v_contract.participant_limit,v_contract.viewer_limit,v_contract.admin_limit; return;
  end if;

  select count(*) filter(where member.status='active')::integer,
    count(*) filter(where member.status='active' and member.seat_type='full')::integer,
    count(*) filter(where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter(where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter(where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full,v_participant,v_viewer,v_admin
  from public.organization_members member where member.organization_id=v_contract.organization_id;

  select count(*)::integer,
    count(*) filter(where invitation.seat_type='full')::integer,
    count(*) filter(where invitation.seat_type='participant')::integer,
    count(*) filter(where invitation.seat_type='viewer')::integer,
    count(*) filter(where lower(coalesce(invitation.role,'')) in ('owner','admin'))::integer
  into v_pending,v_pending_full,v_pending_participant,v_pending_viewer,v_pending_admin
  from public.invitations invitation
  where invitation.organization_id=v_contract.organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at>now();

  if v_active_members+v_pending>p_member_limit or v_full+v_pending_full>p_full_user_limit
     or v_participant+v_pending_participant>p_participant_limit or v_viewer+v_pending_viewer>p_viewer_limit
     or v_admin+v_pending_admin>p_admin_limit then
    return query select 'limits_below_committed_usage'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version,
      v_contract.member_limit,v_contract.full_user_limit,v_contract.participant_limit,v_contract.viewer_limit,v_contract.admin_limit; return;
  end if;

  update public.enterprise_contracts contract set
    member_limit=p_member_limit,full_user_limit=p_full_user_limit,participant_limit=p_participant_limit,
    viewer_limit=p_viewer_limit,admin_limit=p_admin_limit,legal_entity_limit=p_legal_entity_limit,
    ai_system_limit=p_ai_system_limit,storage_limit_bytes=p_storage_limit_bytes,audit_retention_days=p_audit_retention_days,
    sso_enabled=coalesce(p_sso_enabled,false),scim_enabled=coalesce(p_scim_enabled,false),api_enabled=coalesce(p_api_enabled,false),
    webhooks_enabled=coalesce(p_webhooks_enabled,false),custom_roles_enabled=coalesce(p_custom_roles_enabled,false),
    advanced_reports_enabled=coalesce(p_advanced_reports_enabled,false),priority_support_enabled=coalesce(p_priority_support_enabled,false),
    version=contract.version+1,updated_by=p_actor_user_id,updated_at=now()
  where contract.id=v_contract.id and contract.version=p_expected_version;
  if not found then
    return query select 'version_changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version,
      v_contract.member_limit,v_contract.full_user_limit,v_contract.participant_limit,v_contract.viewer_limit,v_contract.admin_limit; return;
  end if;

  update public.organization_entitlements entitlement set
    member_limit=p_member_limit,full_user_limit=p_full_user_limit,participant_limit=p_participant_limit,
    viewer_limit=p_viewer_limit,admin_limit=p_admin_limit,legal_entity_limit=p_legal_entity_limit,
    ai_system_limit=p_ai_system_limit,storage_limit_bytes=p_storage_limit_bytes,audit_retention_days=p_audit_retention_days,
    sso_enabled=coalesce(p_sso_enabled,false),scim_enabled=coalesce(p_scim_enabled,false),api_enabled=coalesce(p_api_enabled,false),
    webhooks_enabled=coalesce(p_webhooks_enabled,false),custom_roles_enabled=coalesce(p_custom_roles_enabled,false),
    advanced_reports_enabled=coalesce(p_advanced_reports_enabled,false),priority_support_enabled=coalesce(p_priority_support_enabled,false),
    version=entitlement.version+1,updated_by=p_actor_user_id,updated_at=now()
  where entitlement.organization_id=v_contract.organization_id and entitlement.contract_id=v_contract.id;

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (v_contract.organization_id,p_actor_user_id,'enterprise.entitlement_changed','enterprise_contract',v_contract.id::text,
    jsonb_build_object('reason',v_reason,'platform_role',v_actor_role,'previous_version',v_contract.version,
      'next_version',v_contract.version+1));

  return query select 'changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.version+1,
    p_member_limit,p_full_user_limit,p_participant_limit,p_viewer_limit,p_admin_limit;
end;
$$;

create or replace function public.transition_enterprise_contract_status_atomic(
  p_contract_id uuid,p_expected_status text,p_next_status text,p_actor_user_id uuid,p_reason text
)
returns table (outcome text,contract_id uuid,organization_id uuid,previous_status text,applied_status text,version integer)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_expected text:=lower(trim(coalesce(p_expected_status,'')));
  v_next text:=lower(trim(coalesce(p_next_status,'')));
  v_reason text:=trim(coalesce(p_reason,''));
  v_actor_role text;
begin
  if p_contract_id is null or p_actor_user_id is null or v_expected='' or v_next='' then
    return query select 'invalid_input'::text,p_contract_id,null::uuid,null::text,null::text,null::integer; return;
  end if;
  if length(v_reason)<5 or length(v_reason)>1000 then
    return query select 'reason_required'::text,p_contract_id,null::uuid,null::text,null::text,null::integer; return;
  end if;

  select admin.role into v_actor_role from public.platform_admin_users admin
  where admin.user_id=p_actor_user_id and admin.enabled=true
    and admin.role in ('owner','platform_owner','platform_admin','platform_billing','platform_security');
  if not found then
    return query select 'platform_role_required'::text,p_contract_id,null::uuid,null::text,null::text,null::integer; return;
  end if;

  select contract.* into v_contract from public.enterprise_contracts contract
  where contract.id=p_contract_id and contract.contract_mode='negotiated' for update;
  if not found then
    return query select 'not_found'::text,p_contract_id,null::uuid,null::text,null::text,null::integer; return;
  end if;
  if v_contract.status is distinct from v_expected then
    return query select 'state_changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,null::text,v_contract.version; return;
  end if;
  if v_contract.status=v_next then
    return query select 'unchanged'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_contract.status,v_contract.version; return;
  end if;
  if not public.is_valid_enterprise_contract_transition(v_contract.status,v_next) then
    return query select 'invalid_transition'::text,v_contract.id,v_contract.organization_id,v_contract.status,null::text,v_contract.version; return;
  end if;
  if v_next in ('suspended','terminated') and v_actor_role not in ('owner','platform_owner','platform_admin','platform_security') then
    return query select 'insufficient_platform_role'::text,v_contract.id,v_contract.organization_id,v_contract.status,null::text,v_contract.version; return;
  end if;
  if v_next in ('past_due','grace_period','active') and v_actor_role not in ('owner','platform_owner','platform_admin','platform_billing') then
    return query select 'insufficient_platform_role'::text,v_contract.id,v_contract.organization_id,v_contract.status,null::text,v_contract.version; return;
  end if;

  update public.enterprise_contracts contract set status=v_next,version=contract.version+1,
    updated_by=p_actor_user_id,updated_at=now()
  where contract.id=v_contract.id and contract.status=v_expected;
  if not found then
    return query select 'state_changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,null::text,v_contract.version; return;
  end if;

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (v_contract.organization_id,p_actor_user_id,
    case v_next when 'active' then 'enterprise.contract_activated'
      when 'suspended' then 'enterprise.contract_suspended'
      when 'expired' then 'enterprise.contract_expired'
      when 'terminated' then 'enterprise.contract_terminated'
      else 'enterprise.contract_status_changed' end,
    'enterprise_contract',v_contract.id::text,
    jsonb_build_object('previous_status',v_contract.status,'next_status',v_next,'reason',v_reason,
      'platform_role',v_actor_role,'previous_version',v_contract.version,'next_version',v_contract.version+1));

  return query select 'changed'::text,v_contract.id,v_contract.organization_id,v_contract.status,v_next,v_contract.version+1;
end;
$$;

revoke all on function public.provision_enterprise_contract_atomic(
  uuid,text,text,bigint,timestamptz,timestamptz,timestamptz,integer,integer,integer,integer,integer,integer,integer,
  integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid
) from public,anon,authenticated;
revoke all on function public.update_enterprise_contract_entitlements_atomic(
  uuid,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,
  boolean,boolean,boolean,uuid,text
) from public,anon,authenticated;
revoke all on function public.transition_enterprise_contract_status_atomic(uuid,text,text,uuid,text) from public,anon,authenticated;

grant execute on function public.provision_enterprise_contract_atomic(
  uuid,text,text,bigint,timestamptz,timestamptz,timestamptz,integer,integer,integer,integer,integer,integer,integer,
  integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid
) to service_role;
grant execute on function public.update_enterprise_contract_entitlements_atomic(
  uuid,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,
  boolean,boolean,boolean,uuid,text
) to service_role;
grant execute on function public.transition_enterprise_contract_status_atomic(uuid,text,text,uuid,text) to service_role;

do $verify$
declare rpc oid;
begin
  foreach rpc in array array[
    to_regprocedure('public.provision_enterprise_contract_atomic(uuid,text,text,bigint,timestamptz,timestamptz,timestamptz,integer,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid)'),
    to_regprocedure('public.update_enterprise_contract_entitlements_atomic(uuid,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid,text)'),
    to_regprocedure('public.transition_enterprise_contract_status_atomic(uuid,text,text,uuid,text)')
  ]::oid[] loop
    if rpc is null then raise exception 'Enterprise contract control RPC missing'; end if;
    if has_function_privilege('anon',rpc,'EXECUTE') or has_function_privilege('authenticated',rpc,'EXECUTE')
       or not has_function_privilege('service_role',rpc,'EXECUTE') then
      raise exception 'Enterprise contract control RPC privileges are not service-role-only';
    end if;
    if not exists (
      select 1 from pg_proc p cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=rpc and p.prosecdef and setting='search_path=pg_catalog'
    ) then raise exception 'Enterprise contract control RPC security configuration is not fixed'; end if;
  end loop;
end
$verify$;

notify pgrst,'reload schema';
commit;
