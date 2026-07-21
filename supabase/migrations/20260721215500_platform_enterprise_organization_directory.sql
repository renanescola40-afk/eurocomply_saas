begin;

create or replace function public.is_platform_enterprise_reader(p_actor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in (
        'owner','sales_admin','support_admin',
        'platform_owner','platform_admin','platform_billing',
        'platform_support','platform_security','platform_auditor'
      )
  );
$$;

create or replace function public.list_platform_enterprise_organizations(
  p_actor_user_id uuid,
  p_search text default null,
  p_contract_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_created_at timestamptz,
  contract_id uuid,
  contract_code text,
  contract_mode text,
  contract_status text,
  billing_status text,
  contract_version integer,
  member_limit integer,
  committed_members integer,
  available_members integer,
  open_alerts integer,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search text := lower(trim(coalesce(p_search, '')));
  v_status text := lower(trim(coalesce(p_contract_status, '')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_platform_enterprise_reader(p_actor_user_id) then
    raise exception 'platform_role_required';
  end if;

  if v_status <> '' and v_status not in (
    'uncontracted','draft','pending_activation','active','past_due','grace_period',
    'read_only','suspended','expired','terminated'
  ) then
    raise exception 'invalid_contract_status';
  end if;

  return query
  with directory as (
    select
      organization.id as organization_id,
      organization.name::text as organization_name,
      nullif(to_jsonb(organization)->>'slug', '') as organization_slug,
      coalesce((to_jsonb(organization)->>'created_at')::timestamptz, now()) as organization_created_at,
      contract.id as contract_id,
      contract.contract_code,
      contract.contract_mode,
      coalesce(contract.status, 'uncontracted') as contract_status,
      coalesce(contract.billing_status, 'unlinked') as billing_status,
      contract.version as contract_version,
      coalesce(snapshot.member_limit, 0) as member_limit,
      coalesce(snapshot.active_members, 0)
        + coalesce(snapshot.pending_invitations, 0)
        + coalesce(queued.members, 0) as committed_members,
      greatest(
        coalesce(snapshot.member_limit, 0)
          - coalesce(snapshot.active_members, 0)
          - coalesce(snapshot.pending_invitations, 0)
          - coalesce(queued.members, 0),
        0
      ) as available_members,
      coalesce(alerts.open_alerts, 0) as open_alerts
    from public.organizations as organization
    left join lateral (
      select current_contract.*
      from public.enterprise_contracts as current_contract
      where current_contract.organization_id = organization.id
        and current_contract.contract_mode = 'negotiated'
      order by
        case when current_contract.status not in ('expired','terminated') then 0 else 1 end,
        current_contract.updated_at desc,
        current_contract.id desc
      limit 1
    ) as contract on true
    left join lateral public.resolve_organization_entitlements_v3(organization.id) as snapshot
      on contract.id is not null
    left join lateral (
      select count(*)::integer as members
      from public.enterprise_provisioning_job_items as item
      where item.organization_id = organization.id
        and item.status in ('queued','processing')
    ) as queued on true
    left join lateral (
      select count(*)::integer as open_alerts
      from public.enterprise_usage_alerts as alert
      where alert.organization_id = organization.id
        and alert.status = 'open'
    ) as alerts on true
    where (
      v_search = ''
      or lower(organization.name) like '%' || v_search || '%'
      or organization.id::text = v_search
      or lower(coalesce(to_jsonb(organization)->>'slug', '')) like '%' || v_search || '%'
      or lower(coalesce(contract.contract_code, '')) like '%' || v_search || '%'
    )
      and (v_status = '' or coalesce(contract.status, 'uncontracted') = v_status)
  )
  select
    directory.organization_id,
    directory.organization_name,
    directory.organization_slug,
    directory.organization_created_at,
    directory.contract_id,
    directory.contract_code,
    directory.contract_mode,
    directory.contract_status,
    directory.billing_status,
    directory.contract_version,
    directory.member_limit,
    directory.committed_members,
    directory.available_members,
    directory.open_alerts,
    count(*) over () as total_count
  from directory
  order by directory.organization_created_at desc, directory.organization_id
  limit v_limit
  offset v_offset;
end;
$$;

create or replace function public.get_platform_enterprise_organization_detail(
  p_actor_user_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization public.organizations%rowtype;
  v_contract public.enterprise_contracts%rowtype;
  v_snapshot record;
  v_jobs jsonb;
  v_identity jsonb;
  v_alerts jsonb;
begin
  if not public.is_platform_enterprise_reader(p_actor_user_id) then
    raise exception 'platform_role_required';
  end if;

  select organization.* into v_organization
  from public.organizations as organization
  where organization.id = p_organization_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.contract_mode = 'negotiated'
  order by
    case when contract.status not in ('expired','terminated') then 0 else 1 end,
    contract.updated_at desc,
    contract.id desc
  limit 1;

  if v_contract.id is not null then
    select * into v_snapshot
    from public.resolve_organization_entitlements_v3(p_organization_id);
  end if;

  select jsonb_build_object(
    'total', count(*),
    'queued', count(*) filter (where job.status = 'queued'),
    'processing', count(*) filter (where job.status = 'processing'),
    'completed', count(*) filter (where job.status = 'completed'),
    'partial', count(*) filter (where job.status = 'partial'),
    'failed', count(*) filter (where job.status = 'failed')
  ) into v_jobs
  from public.enterprise_provisioning_jobs as job
  where job.organization_id = p_organization_id;

  select jsonb_build_object(
    'connections', count(*) filter (where connection.status in ('verified','active')),
    'enforcedSso', count(*) filter (where connection.status = 'active' and connection.enforce_sso),
    'activeScimTokens', (
      select count(*)
      from public.enterprise_scim_tokens as token
      where token.organization_id = p_organization_id
        and token.status = 'active'
        and token.expires_at > now()
    )
  ) into v_identity
  from public.enterprise_identity_connections as connection
  where connection.organization_id = p_organization_id;

  select jsonb_build_object(
    'open', count(*) filter (where alert.status = 'open'),
    'critical', count(*) filter (where alert.status = 'open' and alert.threshold_percent = 100),
    'warning90', count(*) filter (where alert.status = 'open' and alert.threshold_percent = 90),
    'warning80', count(*) filter (where alert.status = 'open' and alert.threshold_percent = 80)
  ) into v_alerts
  from public.enterprise_usage_alerts as alert
  where alert.organization_id = p_organization_id;

  return jsonb_build_object(
    'outcome', 'resolved',
    'organization', jsonb_build_object(
      'id', v_organization.id,
      'name', v_organization.name,
      'slug', nullif(to_jsonb(v_organization)->>'slug', ''),
      'createdAt', nullif(to_jsonb(v_organization)->>'created_at', '')
    ),
    'contract', case when v_contract.id is null then null else jsonb_build_object(
      'id', v_contract.id,
      'code', v_contract.contract_code,
      'mode', v_contract.contract_mode,
      'status', v_contract.status,
      'billingStatus', v_contract.billing_status,
      'paymentMethod', v_contract.payment_method,
      'currency', v_contract.currency,
      'annualValueMinor', v_contract.annual_value_minor,
      'startsAt', v_contract.starts_at,
      'endsAt', v_contract.ends_at,
      'renewsAt', v_contract.renews_at,
      'paymentDueAt', v_contract.payment_due_at,
      'version', v_contract.version
    ) end,
    'limits', case when v_contract.id is null then null else jsonb_build_object(
      'members', v_snapshot.member_limit,
      'fullUsers', v_snapshot.full_user_limit,
      'participants', v_snapshot.participant_limit,
      'viewers', v_snapshot.viewer_limit,
      'admins', v_snapshot.admin_limit,
      'legalEntities', v_snapshot.legal_entity_limit,
      'aiSystems', v_snapshot.ai_system_limit,
      'storageBytes', v_snapshot.storage_limit_bytes,
      'auditRetentionDays', v_snapshot.audit_retention_days
    ) end,
    'usage', case when v_contract.id is null then null else jsonb_build_object(
      'activeMembers', v_snapshot.active_members,
      'pendingInvitations', v_snapshot.pending_invitations,
      'fullUsers', v_snapshot.full_users,
      'participants', v_snapshot.participants,
      'viewers', v_snapshot.viewers,
      'activeAdmins', v_snapshot.active_admins
    ) end,
    'features', case when v_contract.id is null then null else jsonb_build_object(
      'sso', v_snapshot.sso_enabled,
      'scim', v_snapshot.scim_enabled,
      'api', v_snapshot.api_enabled,
      'webhooks', v_snapshot.webhooks_enabled,
      'customRoles', v_snapshot.custom_roles_enabled,
      'advancedReports', v_snapshot.advanced_reports_enabled,
      'prioritySupport', v_snapshot.priority_support_enabled
    ) end,
    'jobs', coalesce(v_jobs, '{}'::jsonb),
    'identity', coalesce(v_identity, '{}'::jsonb),
    'alerts', coalesce(v_alerts, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.is_platform_enterprise_reader(uuid) from public, anon, authenticated;
revoke all on function public.list_platform_enterprise_organizations(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_platform_enterprise_organization_detail(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_platform_enterprise_reader(uuid) to service_role;
grant execute on function public.list_platform_enterprise_organizations(uuid, text, text, integer, integer) to service_role;
grant execute on function public.get_platform_enterprise_organization_detail(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
