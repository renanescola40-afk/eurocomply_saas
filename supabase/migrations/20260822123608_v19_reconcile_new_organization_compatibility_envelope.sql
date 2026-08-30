begin;

-- Forward-only continuity guard for organizations created after the Enterprise
-- licensing control-plane reconciliation has already run. The compatibility
-- envelope is technical anti-lockout state only: Enterprise feature flags remain
-- disabled and commercial plan gating continues to live in the application
-- Billing entitlement authority.

do $preflight$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.subscriptions') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regclass('public.organization_usage') is null then
    raise exception 'new-organization compatibility envelope prerequisites are incomplete';
  end if;
end
$preflight$;

create or replace function public.ensure_new_organization_compatibility_envelope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_plan text := 'starter';
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
begin
  -- Existing negotiated/compatibility authority always wins. This trigger only
  -- fills the post-rollout gap for organizations with no current contract.
  select contract.*
  into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = new.organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by contract.version desc, contract.updated_at desc
  limit 1;

  if not found then
    select coalesce(nullif(lower(trim(subscription.plan)), ''), 'starter')
    into v_plan
    from public.subscriptions as subscription
    where subscription.organization_id = new.organization_id
    order by subscription.updated_at desc nulls last, subscription.created_at desc
    limit 1;

    v_plan := coalesce(nullif(v_plan, ''), 'starter');

    insert into public.enterprise_contracts (
      organization_id,
      contract_code,
      contract_mode,
      plan,
      starts_at,
      status,
      member_limit,
      full_user_limit,
      participant_limit,
      viewer_limit,
      admin_limit,
      custom_features,
      internal_notes
    ) values (
      new.organization_id,
      'runtime-compatibility-' || new.organization_id::text,
      'compatibility',
      v_plan,
      now(),
      'active',
      10000,
      10000,
      10000,
      10000,
      1000,
      jsonb_build_object('legacy_compatibility', true, 'post_rollout_bootstrap', true),
      'Runtime compatibility envelope; commercial plan entitlements and Enterprise feature activation remain application/operator controlled.'
    )
    returning * into v_contract;
  end if;

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
    source
  ) values (
    new.organization_id,
    v_contract.id,
    v_contract.member_limit,
    v_contract.full_user_limit,
    v_contract.participant_limit,
    v_contract.viewer_limit,
    v_contract.admin_limit,
    v_contract.legal_entity_limit,
    v_contract.ai_system_limit,
    v_contract.storage_limit_bytes,
    v_contract.audit_retention_days,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    'legacy_compatibility'
  )
  on conflict (organization_id) do nothing;

  select
    count(*) filter (where member.status = 'active')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'full')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'participant')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'viewer')::integer,
    count(*) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer
  into v_active_members, v_full_users, v_participants, v_viewers, v_active_admins
  from public.organization_members as member
  where member.organization_id = new.organization_id;

  insert into public.organization_usage (
    organization_id,
    active_members,
    full_users,
    participants,
    viewers,
    active_admins,
    pending_invitations,
    last_reconciled_at
  ) values (
    new.organization_id,
    v_active_members,
    v_full_users,
    v_participants,
    v_viewers,
    v_active_admins,
    0,
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

  return new;
end;
$$;

revoke all on function public.ensure_new_organization_compatibility_envelope()
  from public, anon, authenticated, service_role;

drop trigger if exists organization_members_ensure_compatibility_envelope on public.organization_members;
create trigger organization_members_ensure_compatibility_envelope
after insert on public.organization_members
for each row execute function public.ensure_new_organization_compatibility_envelope();

do $verify$
declare
  trigger_function_oid oid := to_regprocedure('public.ensure_new_organization_compatibility_envelope()');
begin
  if trigger_function_oid is null then
    raise exception 'new-organization compatibility trigger function is missing';
  end if;

  if has_function_privilege('anon', trigger_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', trigger_function_oid, 'EXECUTE')
     or has_function_privilege('service_role', trigger_function_oid, 'EXECUTE') then
    raise exception 'compatibility trigger function remains directly executable';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organization_members'::regclass
      and tgname = 'organization_members_ensure_compatibility_envelope'
      and not tgisinternal
  ) then
    raise exception 'new-organization compatibility envelope trigger is missing';
  end if;

  if exists (
    select 1
    from public.enterprise_contracts
    where custom_features ->> 'post_rollout_bootstrap' = 'true'
      and contract_mode <> 'compatibility'
  ) then
    raise exception 'post-rollout compatibility envelope is not in compatibility contract mode';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
