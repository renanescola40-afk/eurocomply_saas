-- Consolidate Enterprise platform roles into the existing platform_admin_users
-- authority and add fail-closed contract state transitions.

begin;

-- The previous licensing migration originally introduced a parallel table while
-- auditing was still in progress. Remove it immediately and retain the existing
-- MFA-protected platform_admin_users authority as the single source of truth.
drop table if exists public.platform_admins;

alter table public.platform_admin_users
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.platform_admin_users'::regclass
      and conname = 'platform_admin_users_role_check'
  ) then
    alter table public.platform_admin_users
      drop constraint platform_admin_users_role_check;
  end if;

  alter table public.platform_admin_users
    add constraint platform_admin_users_role_check
    check (
      role in (
        'owner',
        'sales_admin',
        'sales_rep',
        'support_admin',
        'platform_owner',
        'platform_admin',
        'platform_billing',
        'platform_support',
        'platform_security',
        'platform_auditor'
      )
    );
end;
$$;

alter table public.platform_admin_users enable row level security;
alter table public.platform_admin_users force row level security;
revoke all on table public.platform_admin_users from public, anon, authenticated;
grant select, insert, update on table public.platform_admin_users to service_role;

create or replace function public.is_valid_enterprise_contract_transition(
  p_from_status text,
  p_to_status text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case lower(trim(coalesce(p_from_status, '')))
    when 'draft' then lower(trim(coalesce(p_to_status, ''))) in ('pending_activation', 'terminated')
    when 'pending_activation' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'terminated')
    when 'active' then lower(trim(coalesce(p_to_status, ''))) in ('past_due', 'read_only', 'suspended', 'expired', 'terminated')
    when 'past_due' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'grace_period', 'read_only', 'suspended', 'terminated')
    when 'grace_period' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'read_only', 'suspended', 'terminated')
    when 'read_only' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'suspended', 'expired', 'terminated')
    when 'suspended' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'expired', 'terminated')
    when 'expired' then lower(trim(coalesce(p_to_status, ''))) in ('active', 'terminated')
    when 'terminated' then false
    else false
  end;
$$;

create or replace function public.transition_enterprise_contract_status_atomic(
  p_contract_id uuid,
  p_expected_status text,
  p_next_status text,
  p_actor_user_id uuid,
  p_reason text
)
returns table (
  outcome text,
  contract_id uuid,
  organization_id uuid,
  previous_status text,
  applied_status text,
  version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_expected text := lower(trim(coalesce(p_expected_status, '')));
  v_next text := lower(trim(coalesce(p_next_status, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_actor_role text;
begin
  if p_contract_id is null
    or p_actor_user_id is null
    or v_expected = ''
    or v_next = '' then
    return query select
      'invalid_input'::text,
      p_contract_id,
      null::uuid,
      null::text,
      null::text,
      null::integer;
    return;
  end if;

  if length(v_reason) < 5 or length(v_reason) > 1000 then
    return query select
      'reason_required'::text,
      p_contract_id,
      null::uuid,
      null::text,
      null::text,
      null::integer;
    return;
  end if;

  select admin.role
    into v_actor_role
  from public.platform_admin_users as admin
  where admin.user_id = p_actor_user_id
    and admin.enabled = true
    and admin.role in (
      'owner',
      'platform_owner',
      'platform_admin',
      'platform_billing',
      'platform_security'
    );

  if not found then
    return query select
      'platform_role_required'::text,
      p_contract_id,
      null::uuid,
      null::text,
      null::text,
      null::integer;
    return;
  end if;

  select contract.*
    into v_contract
  from public.enterprise_contracts as contract
  where contract.id = p_contract_id
  for update;

  if not found then
    return query select
      'not_found'::text,
      p_contract_id,
      null::uuid,
      null::text,
      null::text,
      null::integer;
    return;
  end if;

  if v_contract.status is distinct from v_expected then
    return query select
      'state_changed'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      null::text,
      v_contract.version;
    return;
  end if;

  if v_contract.status = v_next then
    return query select
      'unchanged'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      v_contract.status,
      v_contract.version;
    return;
  end if;

  if not public.is_valid_enterprise_contract_transition(v_contract.status, v_next) then
    return query select
      'invalid_transition'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      null::text,
      v_contract.version;
    return;
  end if;

  -- Billing operators may restore or move payment states, but only owner/admin or
  -- security may suspend/terminate. Security may not alter financial recovery.
  if v_next in ('suspended', 'terminated')
    and v_actor_role not in ('owner', 'platform_owner', 'platform_admin', 'platform_security') then
    return query select
      'insufficient_platform_role'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      null::text,
      v_contract.version;
    return;
  end if;

  if v_next in ('past_due', 'grace_period', 'active')
    and v_actor_role not in ('owner', 'platform_owner', 'platform_admin', 'platform_billing') then
    return query select
      'insufficient_platform_role'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      null::text,
      v_contract.version;
    return;
  end if;

  update public.enterprise_contracts as contract
  set
    status = v_next,
    version = contract.version + 1,
    updated_by = p_actor_user_id,
    updated_at = now()
  where contract.id = v_contract.id
    and contract.status = v_expected;

  if not found then
    return query select
      'state_changed'::text,
      v_contract.id,
      v_contract.organization_id,
      v_contract.status,
      null::text,
      v_contract.version;
    return;
  end if;

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
    case v_next
      when 'active' then 'enterprise.contract_activated'
      when 'suspended' then 'enterprise.contract_suspended'
      when 'expired' then 'enterprise.contract_expired'
      when 'terminated' then 'enterprise.contract_terminated'
      else 'enterprise.contract_status_changed'
    end,
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object(
      'previous_status', v_contract.status,
      'next_status', v_next,
      'reason', v_reason,
      'platform_role', v_actor_role,
      'previous_version', v_contract.version,
      'next_version', v_contract.version + 1
    )
  );

  return query select
    'changed'::text,
    v_contract.id,
    v_contract.organization_id,
    v_contract.status,
    v_next,
    v_contract.version + 1;
end;
$$;

revoke all on function public.is_valid_enterprise_contract_transition(text, text) from public, anon, authenticated;
revoke all on function public.transition_enterprise_contract_status_atomic(uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.is_valid_enterprise_contract_transition(text, text) to service_role;
grant execute on function public.transition_enterprise_contract_status_atomic(uuid, text, text, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
