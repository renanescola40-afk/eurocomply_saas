begin;

-- Final forward-only hardening for active onboarding after the production
-- reconciliation and Enterprise invitation seat-authority identities.
-- This wrapper preserves completed tenants, rejects inactive privileged actors,
-- and routes onboarding invitations through the same seat/quota authority as
-- the canonical team invitation runtime.

do $preflight$
begin
  if to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)') is null then
    raise exception 'active onboarding RPC must exist before final hardening';
  end if;
  if to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)') is null then
    raise exception 'enterprise invitation seat authority must exist before onboarding hardening';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_members' and column_name = 'status'
  ) then
    raise exception 'organization membership status must exist before onboarding hardening';
  end if;
end
$preflight$;

with latest_completed as (
  select distinct on (organization_id)
    organization_id,
    nullif(lower(trim(selected_plan)), '') as selected_plan,
    created_at
  from public.onboarding_activation_runs
  where lower(coalesce(status, '')) = 'completed'
  order by organization_id, created_at desc
)
update public.organizations as organizations
set
  onboarding_status = 'completed',
  onboarding_completed_at = coalesce(
    organizations.onboarding_completed_at,
    latest_completed.created_at
  ),
  selected_plan = coalesce(
    nullif(lower(trim(organizations.selected_plan)), ''),
    latest_completed.selected_plan
  )
from latest_completed
where organizations.id = latest_completed.organization_id;

alter function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)
  rename to complete_onboarding_activation_atomic_reconciled;

revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.complete_onboarding_activation_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_activation jsonb
)
returns table (
  outcome text,
  activation_run_id uuid,
  first_ai_system_id uuid,
  documents_created integer,
  tasks_created integer,
  invitations_created integer,
  organization_name text,
  invitation_deliveries jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_role text;
  v_actor_status text;
  v_activation record;
  v_invitation record;
  v_invite_emails jsonb := coalesce(p_activation -> 'inviteEmails', '[]'::jsonb);
  v_inner_activation jsonb;
  v_email text;
  v_token text;
  v_deliveries jsonb := '[]'::jsonb;
  v_invited_emails text[] := '{}'::text[];
  v_new_invitations integer := 0;
begin
  select lower(trim(member.role)), lower(trim(member.status))
  into v_actor_role, v_actor_status
  from public.organization_members as member
  where member.organization_id = p_organization_id
    and member.user_id = p_actor_user_id;

  if v_actor_status is distinct from 'active'
     or coalesce(v_actor_role, '') not in ('owner', 'admin') then
    return query select
      'forbidden'::text,
      null::uuid,
      null::uuid,
      0,
      0,
      0,
      coalesce((select name from public.organizations where id = p_organization_id), ''),
      '[]'::jsonb;
    return;
  end if;

  if jsonb_typeof(v_invite_emails) <> 'array' then
    return query select
      'invalid_input'::text,
      null::uuid,
      null::uuid,
      0,
      0,
      0,
      ''::text,
      '[]'::jsonb;
    return;
  end if;

  select coalesce(
    array_agg(distinct lower(trim(invited.value #>> '{}')) order by lower(trim(invited.value #>> '{}'))),
    '{}'::text[]
  )
  into v_invited_emails
  from jsonb_array_elements(v_invite_emails) as invited(value);

  v_inner_activation := jsonb_set(p_activation, '{inviteEmails}', '[]'::jsonb, true);

  select *
  into v_activation
  from public.complete_onboarding_activation_atomic_reconciled(
    p_organization_id,
    p_actor_user_id,
    p_idempotency_key,
    v_inner_activation
  );

  if v_activation.outcome = 'replayed' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', invitation.id,
          'email', invitation.email,
          'role', invitation.role,
          'token', invitation.token
        ) order by invitation.email
      ),
      '[]'::jsonb
    )
    into v_deliveries
    from public.invitations as invitation
    where invitation.organization_id = p_organization_id
      and invitation.accepted_at is null
      and invitation.revoked_at is null
      and invitation.expires_at > now()
      and invitation.email = any(v_invited_emails);

    return query select
      v_activation.outcome,
      v_activation.activation_run_id,
      v_activation.first_ai_system_id,
      v_activation.documents_created,
      v_activation.tasks_created,
      0,
      v_activation.organization_name,
      v_deliveries;
    return;
  end if;

  if v_activation.outcome <> 'completed' then
    return query select
      v_activation.outcome,
      v_activation.activation_run_id,
      v_activation.first_ai_system_id,
      v_activation.documents_created,
      v_activation.tasks_created,
      v_activation.invitations_created,
      v_activation.organization_name,
      v_activation.invitation_deliveries;
    return;
  end if;

  foreach v_email in array v_invited_emails
  loop
    if char_length(v_email) > 254
       or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid_onboarding_invitation_email' using errcode = '22023';
    end if;

    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    select *
    into v_invitation
    from public.create_organization_invitation_with_seat_atomic(
      p_organization_id,
      v_email,
      'viewer',
      'viewer',
      v_token,
      p_actor_user_id,
      now() + interval '7 days'
    );

    if v_invitation.outcome <> 'created' then
      raise exception 'onboarding_invitation_seat_authority_denied:%', v_invitation.outcome
        using errcode = 'P0001';
    end if;

    v_deliveries := v_deliveries || jsonb_build_array(
      jsonb_build_object(
        'id', v_invitation.invitation_id,
        'email', v_invitation.email,
        'role', v_invitation.applied_role,
        'token', v_token
      )
    );
    v_new_invitations := v_new_invitations + 1;
  end loop;

  update public.onboarding_activation_runs as run
  set invited_emails = v_invited_emails
  where run.id = v_activation.activation_run_id
    and run.organization_id = p_organization_id;

  if not found then
    raise exception 'onboarding_activation_run_missing_after_completion';
  end if;

  return query select
    'completed'::text,
    v_activation.activation_run_id,
    v_activation.first_ai_system_id,
    v_activation.documents_created,
    v_activation.tasks_created,
    v_new_invitations,
    v_activation.organization_name,
    v_deliveries;
end;
$$;

revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)
  to service_role;

comment on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)
is 'Backend-only active onboarding authority: active owner/admin gate plus transactional seat-aware viewer invitations.';

do $verify$
declare
  wrapper_oid oid := to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)');
  inner_oid oid := to_regprocedure('public.complete_onboarding_activation_atomic_reconciled(uuid,uuid,text,jsonb)');
  invite_oid oid := to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)');
begin
  if wrapper_oid is null or inner_oid is null or invite_oid is null then
    raise exception 'hardened onboarding authority functions are incomplete';
  end if;

  if has_function_privilege('anon', wrapper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', wrapper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', wrapper_oid, 'EXECUTE') then
    raise exception 'hardened onboarding wrapper privileges are not canonical';
  end if;

  if has_function_privilege('anon', inner_oid, 'EXECUTE')
     or has_function_privilege('authenticated', inner_oid, 'EXECUTE')
     or has_function_privilege('service_role', inner_oid, 'EXECUTE') then
    raise exception 'reconciled inner onboarding function remains externally executable';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = wrapper_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog, public'
  ) then
    raise exception 'hardened onboarding wrapper search path is not fixed';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
