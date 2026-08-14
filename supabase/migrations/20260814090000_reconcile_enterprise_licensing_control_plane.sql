begin;

create extension if not exists pgcrypto;

do $prerequisites$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.invitations') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'enterprise licensing prerequisites are missing';
  end if;
end
$prerequisites$;

alter table public.organization_members
  add column if not exists seat_type text not null default 'full',
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.invitations
  add column if not exists seat_type text not null default 'full',
  add column if not exists revoked_at timestamptz;

do $member_constraints$
begin
  alter table public.organization_members drop constraint if exists organization_members_seat_type_check;
  alter table public.organization_members add constraint organization_members_seat_type_check
    check (seat_type in ('full','participant','viewer'));
  alter table public.organization_members drop constraint if exists organization_members_status_check;
  alter table public.organization_members add constraint organization_members_status_check
    check (status in ('active','suspended','deprovisioned'));
  alter table public.invitations drop constraint if exists invitations_seat_type_check;
  alter table public.invitations add constraint invitations_seat_type_check
    check (seat_type in ('full','participant','viewer'));
end
$member_constraints$;

create table if not exists public.platform_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admin_users drop constraint if exists platform_admin_users_role_check;
alter table public.platform_admin_users add constraint platform_admin_users_role_check
  check (role in (
    'owner','sales_admin','sales_rep','support_admin',
    'platform_owner','platform_admin','platform_billing',
    'platform_support','platform_security','platform_auditor'
  ));

create table if not exists public.enterprise_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_code text not null unique,
  plan text not null default 'enterprise',
  currency text not null default 'EUR',
  annual_value_minor bigint not null default 0,
  billing_cycle text not null default 'annual',
  starts_at timestamptz not null,
  ends_at timestamptz,
  renews_at timestamptz,
  payment_terms_days integer not null default 30,
  grace_period_days integer not null default 14,
  status text not null default 'draft',
  member_limit integer not null,
  full_user_limit integer not null,
  participant_limit integer not null,
  viewer_limit integer not null,
  admin_limit integer not null,
  legal_entity_limit integer not null default 1,
  ai_system_limit integer not null default 100,
  storage_limit_bytes bigint not null default 10737418240,
  audit_retention_days integer not null default 365,
  sso_enabled boolean not null default false,
  scim_enabled boolean not null default false,
  api_enabled boolean not null default false,
  webhooks_enabled boolean not null default false,
  custom_roles_enabled boolean not null default false,
  advanced_reports_enabled boolean not null default false,
  priority_support_enabled boolean not null default false,
  sla jsonb not null default '{}'::jsonb,
  custom_features jsonb not null default '{}'::jsonb,
  internal_notes text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  latest_stripe_invoice_id text,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_contracts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint enterprise_contracts_annual_value_check check (annual_value_minor >= 0),
  constraint enterprise_contracts_billing_cycle_check check (billing_cycle in ('annual','invoice','custom')),
  constraint enterprise_contracts_status_check check (
    status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended','expired','terminated')
  ),
  constraint enterprise_contracts_dates_check check (ends_at is null or ends_at > starts_at),
  constraint enterprise_contracts_payment_terms_check check (payment_terms_days between 0 and 365),
  constraint enterprise_contracts_grace_period_check check (grace_period_days between 0 and 365),
  constraint enterprise_contracts_limits_check check (
    member_limit >= 1
    and full_user_limit >= 0
    and participant_limit >= 0
    and viewer_limit >= 0
    and admin_limit >= 1
    and full_user_limit + participant_limit + viewer_limit >= member_limit
    and admin_limit <= member_limit
    and legal_entity_limit >= 0
    and ai_system_limit >= 0
    and storage_limit_bytes >= 0
    and audit_retention_days >= 0
  )
);

create unique index if not exists enterprise_contracts_one_current_per_org_idx
  on public.enterprise_contracts (organization_id)
  where status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended');

create table if not exists public.organization_entitlements (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.enterprise_contracts(id) on delete restrict,
  member_limit integer not null,
  full_user_limit integer not null,
  participant_limit integer not null,
  viewer_limit integer not null,
  admin_limit integer not null,
  legal_entity_limit integer not null default 1,
  ai_system_limit integer not null default 100,
  storage_limit_bytes bigint not null default 10737418240,
  audit_retention_days integer not null default 365,
  sso_enabled boolean not null default false,
  scim_enabled boolean not null default false,
  api_enabled boolean not null default false,
  webhooks_enabled boolean not null default false,
  custom_roles_enabled boolean not null default false,
  advanced_reports_enabled boolean not null default false,
  priority_support_enabled boolean not null default false,
  source text not null default 'contract',
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint organization_entitlements_limits_check check (
    member_limit >= 1
    and full_user_limit >= 0
    and participant_limit >= 0
    and viewer_limit >= 0
    and admin_limit >= 1
    and full_user_limit + participant_limit + viewer_limit >= member_limit
    and admin_limit <= member_limit
    and legal_entity_limit >= 0
    and ai_system_limit >= 0
    and storage_limit_bytes >= 0
    and audit_retention_days >= 0
  )
);

create unique index if not exists organization_entitlements_contract_org_idx
  on public.organization_entitlements (contract_id, organization_id);

create table if not exists public.organization_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  active_members integer not null default 0,
  full_users integer not null default 0,
  participants integer not null default 0,
  viewers integer not null default 0,
  active_admins integer not null default 0,
  pending_invitations integer not null default 0,
  ai_systems integer not null default 0,
  legal_entities integer not null default 0,
  storage_bytes bigint not null default 0,
  api_requests bigint not null default 0,
  scim_operations bigint not null default 0,
  csv_imports bigint not null default 0,
  last_reconciled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint organization_usage_non_negative_check check (
    active_members >= 0 and full_users >= 0 and participants >= 0 and viewers >= 0
    and active_admins >= 0 and pending_invitations >= 0 and ai_systems >= 0
    and legal_entities >= 0 and storage_bytes >= 0 and api_requests >= 0
    and scim_operations >= 0 and csv_imports >= 0
  ),
  constraint organization_usage_seat_sum_check check (active_members = full_users + participants + viewers)
);

create table if not exists public.enterprise_seat_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  source text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  membership_id uuid references public.organization_members(id) on delete set null,
  requested_seat_type text,
  outcome text not null default 'started',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint enterprise_seat_operations_key_check check (length(idempotency_key) between 8 and 200),
  constraint enterprise_seat_operations_operation_check check (operation in ('reserve','release','change')),
  constraint enterprise_seat_operations_source_check check (
    source in ('invitation','csv','scim','sso','api','platform','admin','reactivation')
  ),
  constraint enterprise_seat_operations_seat_type_check check (
    requested_seat_type is null or requested_seat_type in ('full','participant','viewer')
  ),
  unique (organization_id, idempotency_key)
);

create index if not exists enterprise_seat_operations_org_created_idx
  on public.enterprise_seat_operations (organization_id, created_at desc);

alter table public.platform_admin_users enable row level security;
alter table public.platform_admin_users force row level security;
alter table public.enterprise_contracts enable row level security;
alter table public.enterprise_contracts force row level security;
alter table public.organization_entitlements enable row level security;
alter table public.organization_entitlements force row level security;
alter table public.organization_usage enable row level security;
alter table public.organization_usage force row level security;
alter table public.enterprise_seat_operations enable row level security;
alter table public.enterprise_seat_operations force row level security;

revoke all on table public.platform_admin_users from public, anon, authenticated;
revoke all on table public.enterprise_contracts from public, anon, authenticated;
revoke all on table public.organization_entitlements from public, anon, authenticated;
revoke all on table public.organization_usage from public, anon, authenticated;
revoke all on table public.enterprise_seat_operations from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_admin_users to service_role;
grant select, insert, update on table public.enterprise_contracts to service_role;
grant select, insert, update on table public.organization_entitlements to service_role;
grant select, insert, update on table public.organization_usage to service_role;
grant select, insert, update on table public.enterprise_seat_operations to service_role;

-- Existing organizations get a deliberately permissive capacity envelope only so
-- current members are not locked out by schema activation. Enterprise feature flags
-- remain disabled and must be explicitly enabled by an operator-owned contract.
insert into public.enterprise_contracts (
  organization_id, contract_code, plan, starts_at, status,
  member_limit, full_user_limit, participant_limit, viewer_limit, admin_limit,
  custom_features, internal_notes
)
select
  organization.id,
  'legacy-' || organization.id::text,
  coalesce(nullif(lower(trim(subscription.plan)), ''), 'starter'),
  organization.created_at,
  'active',
  greatest(coalesce(member_counts.active_members, 0), 10000),
  greatest(coalesce(member_counts.full_users, 0), 10000),
  10000,
  10000,
  greatest(coalesce(member_counts.active_admins, 0), 1000),
  jsonb_build_object('legacy_compatibility', true),
  'Compatibility envelope; Enterprise SSO/SCIM/API/webhooks remain disabled until explicitly contracted.'
from public.organizations as organization
left join lateral (
  select subscription_row.plan
  from public.subscriptions as subscription_row
  where subscription_row.organization_id = organization.id
  order by subscription_row.updated_at desc nulls last, subscription_row.created_at desc
  limit 1
) as subscription on true
left join lateral (
  select
    count(*) filter (where member.status = 'active')::integer as active_members,
    count(*) filter (where member.status = 'active' and member.seat_type = 'full')::integer as full_users,
    count(*) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer as active_admins
  from public.organization_members as member
  where member.organization_id = organization.id
) as member_counts on true
where not exists (
  select 1 from public.enterprise_contracts as contract
  where contract.organization_id = organization.id
);

insert into public.organization_entitlements (
  organization_id, contract_id, member_limit, full_user_limit, participant_limit,
  viewer_limit, admin_limit, legal_entity_limit, ai_system_limit, storage_limit_bytes,
  audit_retention_days, sso_enabled, scim_enabled, api_enabled, webhooks_enabled,
  custom_roles_enabled, advanced_reports_enabled, priority_support_enabled, source
)
select
  contract.organization_id, contract.id, contract.member_limit, contract.full_user_limit,
  contract.participant_limit, contract.viewer_limit, contract.admin_limit,
  contract.legal_entity_limit, contract.ai_system_limit, contract.storage_limit_bytes,
  contract.audit_retention_days, contract.sso_enabled, contract.scim_enabled,
  contract.api_enabled, contract.webhooks_enabled, contract.custom_roles_enabled,
  contract.advanced_reports_enabled, contract.priority_support_enabled,
  case when coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean, false)
    then 'legacy_compatibility' else 'contract' end
from public.enterprise_contracts as contract
where contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
on conflict (organization_id) do nothing;

insert into public.organization_usage (
  organization_id, active_members, full_users, participants, viewers,
  active_admins, pending_invitations, last_reconciled_at
)
select
  organization.id,
  count(member.id) filter (where member.status = 'active')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'full')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'participant')::integer,
  count(member.id) filter (where member.status = 'active' and member.seat_type = 'viewer')::integer,
  count(member.id) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer,
  (
    select count(*)::integer from public.invitations as invitation
    where invitation.organization_id = organization.id
      and invitation.accepted_at is null
      and invitation.revoked_at is null
      and invitation.expires_at > now()
  ),
  now()
from public.organizations as organization
left join public.organization_members as member on member.organization_id = organization.id
group by organization.id
on conflict (organization_id) do update set
  active_members = excluded.active_members,
  full_users = excluded.full_users,
  participants = excluded.participants,
  viewers = excluded.viewers,
  active_admins = excluded.active_admins,
  pending_invitations = excluded.pending_invitations,
  last_reconciled_at = excluded.last_reconciled_at,
  updated_at = now();

create or replace function public.resolve_organization_entitlements_v2(p_organization_id uuid)
returns table (
  outcome text, contract_id uuid, contract_status text, contract_version integer,
  member_limit integer, full_user_limit integer, participant_limit integer, viewer_limit integer, admin_limit integer,
  active_members integer, full_users integer, participants integer, viewers integer, active_admins integer,
  pending_invitations integer, pending_full_users integer, pending_participants integer, pending_viewers integer, pending_admins integer,
  sso_enabled boolean, scim_enabled boolean, api_enabled boolean, webhooks_enabled boolean
)
language plpgsql
security definer
set search_path = pg_catalog
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
    return query select 'invalid_input'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended','expired')
  order by contract.version desc, contract.updated_at desc
  limit 1;

  if not found then
    return query select 'contract_missing'::text, null::uuid, null::text, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = p_organization_id and entitlement.contract_id = v_contract.id;

  if not found then
    return query select 'entitlements_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::boolean, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select usage.* into v_usage from public.organization_usage as usage
  where usage.organization_id = p_organization_id;
  if not found then
    return query select 'usage_missing'::text, v_contract.id, v_contract.status, v_contract.version,
      v_entitlement.member_limit, v_entitlement.full_user_limit, v_entitlement.participant_limit,
      v_entitlement.viewer_limit, v_entitlement.admin_limit,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      v_entitlement.sso_enabled, v_entitlement.scim_enabled, v_entitlement.api_enabled, v_entitlement.webhooks_enabled;
    return;
  end if;

  select count(*)::integer,
    count(*) filter (where invitation.seat_type = 'full')::integer,
    count(*) filter (where invitation.seat_type = 'participant')::integer,
    count(*) filter (where invitation.seat_type = 'viewer')::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner','admin'))::integer
  into v_pending_invitations, v_pending_full_users, v_pending_participants, v_pending_viewers, v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at > now();

  return query select
    case when v_contract.status = 'active' then 'resolved' else 'contract_not_active' end,
    v_contract.id, v_contract.status, v_contract.version,
    least(v_contract.member_limit, v_entitlement.member_limit),
    least(v_contract.full_user_limit, v_entitlement.full_user_limit),
    least(v_contract.participant_limit, v_entitlement.participant_limit),
    least(v_contract.viewer_limit, v_entitlement.viewer_limit),
    least(v_contract.admin_limit, v_entitlement.admin_limit),
    v_usage.active_members, v_usage.full_users, v_usage.participants, v_usage.viewers, v_usage.active_admins,
    v_pending_invitations, v_pending_full_users, v_pending_participants, v_pending_viewers, v_pending_admins,
    v_entitlement.sso_enabled, v_entitlement.scim_enabled, v_entitlement.api_enabled, v_entitlement.webhooks_enabled;
end;
$$;

create or replace function public.reserve_organization_seat_idempotent_atomic(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text,
  p_seat_type text,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'api'
)
returns table (
  outcome text, membership_id uuid, applied_role text, applied_seat_type text,
  active_members integer, seat_usage integer, seat_limit integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_membership public.organization_members%rowtype;
  v_existing_operation public.enterprise_seat_operations%rowtype;
  v_operation_id uuid;
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_source text := lower(trim(coalesce(p_source, '')));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_member_limit integer := 0;
  v_seat_limit integer := 0;
  v_admin_limit integer := 0;
  v_current_seat_usage integer := 0;
  v_previous_active boolean := false;
  v_previous_seat_type text;
  v_previous_role text;
begin
  if p_organization_id is null or p_user_id is null or p_actor_user_id is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    return query select 'invalid_idempotency_key'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_role not in ('owner','admin','editor','member','viewer') then
    return query select 'invalid_role'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_seat_type'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;
  if v_source not in ('invitation','csv','scim','sso','api','platform','admin','reactivation') then
    return query select 'invalid_source'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));

  select operation.* into v_existing_operation from public.enterprise_seat_operations as operation
  where operation.organization_id = p_organization_id and operation.idempotency_key = p_idempotency_key;
  if found then
    return query select 'duplicate'::text, v_existing_operation.membership_id, null::text,
      v_existing_operation.requested_seat_type,
      coalesce((v_existing_operation.metadata ->> 'active_members')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_usage')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_limit')::integer, 0);
    return;
  end if;

  insert into public.enterprise_seat_operations (
    organization_id, idempotency_key, operation, source, actor_user_id, target_user_id, requested_seat_type
  ) values (p_organization_id, p_idempotency_key, 'reserve', v_source, p_actor_user_id, p_user_id, v_seat_type)
  returning id into v_operation_id;

  insert into public.organization_usage (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage
  where usage.organization_id = p_organization_id for update;

  select contract.* into v_contract from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by contract.version desc, contract.updated_at desc limit 1 for update;
  if not found then
    update public.enterprise_seat_operations set outcome='contract_missing', completed_at=now() where id=v_operation_id;
    return query select 'contract_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;
  if v_contract.status <> 'active' then
    update public.enterprise_seat_operations set outcome='contract_not_active', completed_at=now() where id=v_operation_id;
    return query select 'contract_not_active'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;

  select entitlement.* into v_entitlement from public.organization_entitlements as entitlement
  where entitlement.organization_id=p_organization_id and entitlement.contract_id=v_contract.id for update;
  if not found then
    update public.enterprise_seat_operations set outcome='entitlements_missing', completed_at=now() where id=v_operation_id;
    return query select 'entitlements_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0; return;
  end if;

  select member.* into v_membership from public.organization_members as member
  where member.organization_id=p_organization_id and member.user_id=p_user_id for update;
  if found then
    v_previous_active := v_membership.status='active';
    v_previous_seat_type := v_membership.seat_type;
    v_previous_role := lower(coalesce(v_membership.role,''));
  end if;

  select
    count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members, v_full_users, v_participants, v_viewers, v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  if v_previous_active and v_previous_seat_type=v_seat_type and v_previous_role=v_role then
    v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;
    v_seat_limit := case v_seat_type when 'full' then least(v_contract.full_user_limit,v_entitlement.full_user_limit)
      when 'participant' then least(v_contract.participant_limit,v_entitlement.participant_limit)
      else least(v_contract.viewer_limit,v_entitlement.viewer_limit) end;
    update public.enterprise_seat_operations set outcome='already_active', membership_id=v_membership.id, completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit)
      where id=v_operation_id;
    return query select 'already_active'::text,v_membership.id,v_membership.role,v_membership.seat_type,v_active_members,v_current_seat_usage,v_seat_limit;
    return;
  end if;

  select count(*)::integer,
    count(*) filter (where invitation.seat_type=v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role,'')) in ('owner','admin'))::integer
  into v_pending_members,v_pending_seats,v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id=p_organization_id
    and invitation.accepted_at is null and invitation.revoked_at is null and invitation.expires_at>now();

  v_member_limit := least(v_contract.member_limit,v_entitlement.member_limit);
  v_seat_limit := case v_seat_type when 'full' then least(v_contract.full_user_limit,v_entitlement.full_user_limit)
    when 'participant' then least(v_contract.participant_limit,v_entitlement.participant_limit)
    else least(v_contract.viewer_limit,v_entitlement.viewer_limit) end;
  v_admin_limit := least(v_contract.admin_limit,v_entitlement.admin_limit);
  v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;

  if not v_previous_active and v_active_members + v_pending_members >= v_member_limit then
    update public.enterprise_seat_operations set outcome='member_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit) where id=v_operation_id;
    return query select 'member_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_current_seat_usage,v_seat_limit; return;
  end if;

  if (not v_previous_active or v_previous_seat_type<>v_seat_type)
     and v_current_seat_usage + v_pending_seats >= v_seat_limit then
    update public.enterprise_seat_operations set outcome='seat_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit) where id=v_operation_id;
    return query select 'seat_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_current_seat_usage,v_seat_limit; return;
  end if;

  if v_role in ('owner','admin')
     and (not v_previous_active or v_previous_role not in ('owner','admin'))
     and v_active_admins + v_pending_admins >= v_admin_limit then
    update public.enterprise_seat_operations set outcome='admin_limit_reached',completed_at=now(),
      metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_active_admins,'seat_limit',v_admin_limit) where id=v_operation_id;
    return query select 'admin_limit_reached'::text,null::uuid,null::text,v_seat_type,v_active_members,v_active_admins,v_admin_limit; return;
  end if;

  insert into public.organization_members (organization_id,user_id,role,seat_type,status,updated_at)
  values (p_organization_id,p_user_id,v_role,v_seat_type,'active',now())
  on conflict (organization_id,user_id) do update set
    role=excluded.role,seat_type=excluded.seat_type,status='active',updated_at=now()
  returning * into v_membership;

  select
    count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  update public.organization_usage set active_members=v_active_members,full_users=v_full_users,
    participants=v_participants,viewers=v_viewers,active_admins=v_active_admins,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,
    case when v_previous_active then 'enterprise.member_seat_type_changed' else 'enterprise.seat_reserved' end,
    'organization_member',v_membership.id::text,
    jsonb_build_object('source',v_source,'seat_type',v_seat_type,'role',v_role,'previous_seat_type',v_previous_seat_type));

  v_current_seat_usage := case v_seat_type when 'full' then v_full_users when 'participant' then v_participants else v_viewers end;
  update public.enterprise_seat_operations set outcome=case when v_previous_active then 'seat_changed' else 'reserved' end,
    membership_id=v_membership.id,completed_at=now(),
    metadata=jsonb_build_object('active_members',v_active_members,'seat_usage',v_current_seat_usage,'seat_limit',v_seat_limit)
  where id=v_operation_id;

  return query select case when v_previous_active then 'seat_changed'::text else 'reserved'::text end,
    v_membership.id,v_membership.role,v_membership.seat_type,v_active_members,v_current_seat_usage,v_seat_limit;
end;
$$;

create or replace function public.release_organization_seat_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'admin'
)
returns table (outcome text,membership_id uuid,released_seat_type text,active_members integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_membership public.organization_members%rowtype;
  v_operation_id uuid;
  v_source text := lower(trim(coalesce(p_source,'')));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
begin
  if p_organization_id is null or p_member_id is null or p_actor_user_id is null
     or length(trim(coalesce(p_idempotency_key,''))) not between 8 and 200 then
    return query select 'invalid_input'::text,null::uuid,null::text,0; return;
  end if;
  if v_source not in ('invitation','csv','scim','sso','api','platform','admin','reactivation') then
    return query select 'invalid_source'::text,null::uuid,null::text,0; return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key,0));
  insert into public.enterprise_seat_operations (organization_id,idempotency_key,operation,source,actor_user_id)
  values (p_organization_id,p_idempotency_key,'release',v_source,p_actor_user_id)
  on conflict (organization_id,idempotency_key) do nothing returning id into v_operation_id;
  if v_operation_id is null then return query select 'duplicate'::text,null::uuid,null::text,0; return; end if;

  insert into public.organization_usage (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage where usage.organization_id=p_organization_id for update;

  select member.* into v_membership from public.organization_members as member
  where member.organization_id=p_organization_id and member.id=p_member_id for update;
  if not found then
    update public.enterprise_seat_operations set outcome='not_found',completed_at=now() where id=v_operation_id;
    return query select 'not_found'::text,p_member_id,null::text,0; return;
  end if;
  if v_membership.status<>'active' then
    select count(*)::integer into v_active_members from public.organization_members
    where organization_id=p_organization_id and status='active';
    update public.enterprise_seat_operations set outcome='already_released',membership_id=v_membership.id,completed_at=now() where id=v_operation_id;
    return query select 'already_released'::text,v_membership.id,v_membership.seat_type,v_active_members; return;
  end if;

  update public.organization_members set status=case when v_source='scim' then 'deprovisioned' else 'suspended' end,updated_at=now()
  where id=v_membership.id and organization_id=p_organization_id;

  select count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  update public.organization_usage set active_members=v_active_members,full_users=v_full_users,
    participants=v_participants,viewers=v_viewers,active_admins=v_active_admins,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.seat_released','organization_member',v_membership.id::text,
    jsonb_build_object('source',v_source,'seat_type',v_membership.seat_type));

  update public.enterprise_seat_operations set outcome='released',membership_id=v_membership.id,completed_at=now(),
    metadata=jsonb_build_object('active_members',v_active_members) where id=v_operation_id;
  return query select 'released'::text,v_membership.id,v_membership.seat_type,v_active_members;
end;
$$;

revoke all on function public.resolve_organization_entitlements_v2(uuid) from public,anon,authenticated;
revoke all on function public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_organization_entitlements_v2(uuid) to service_role;
grant execute on function public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text) to service_role;
grant execute on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) to service_role;

do $verify$
declare
  browser_grants integer;
  forced_rls integer;
  function_oid oid;
begin
  select count(*) into forced_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('platform_admin_users','enterprise_contracts','organization_entitlements','organization_usage','enterprise_seat_operations')
    and c.relrowsecurity and c.relforcerowsecurity;
  if forced_rls<>5 then raise exception 'enterprise licensing RLS/FORCE RLS incomplete'; end if;

  select count(*) into browser_grants from information_schema.role_table_grants
  where table_schema='public'
    and table_name in ('platform_admin_users','enterprise_contracts','organization_entitlements','organization_usage','enterprise_seat_operations')
    and grantee in ('anon','authenticated');
  if browser_grants<>0 then raise exception 'browser roles retain enterprise licensing table privileges'; end if;

  if to_regprocedure('public.resolve_organization_entitlements_v2(uuid)') is null
     or to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)') is null
     or to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)') is null then
    raise exception 'enterprise licensing RPCs incomplete';
  end if;

  for function_oid in
    select unnest(array[
      to_regprocedure('public.resolve_organization_entitlements_v2(uuid)'),
      to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)'),
      to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)')
    ]::oid[])
  loop
    if has_function_privilege('anon',function_oid,'EXECUTE')
       or has_function_privilege('authenticated',function_oid,'EXECUTE')
       or not has_function_privilege('service_role',function_oid,'EXECUTE') then
      raise exception 'enterprise licensing RPC privileges are not canonical';
    end if;
    if not exists (
      select 1 from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=function_oid and p.prosecdef and setting='search_path=pg_catalog'
    ) then
      raise exception 'enterprise licensing RPC security configuration is not fixed';
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';
commit;
