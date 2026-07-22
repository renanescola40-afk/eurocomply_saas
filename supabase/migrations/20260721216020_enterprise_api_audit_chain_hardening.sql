begin;

create or replace function public.record_enterprise_api_provisioning_event(
  p_organization_id uuid,
  p_service_account_id uuid,
  p_api_key_id uuid,
  p_target_user_id uuid,
  p_outcome text,
  p_role text,
  p_seat_type text,
  p_idempotency_digest text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_previous_hash text;
  v_event_hash text;
begin
  if p_organization_id is null
    or p_service_account_id is null
    or p_api_key_id is null
    or p_target_user_id is null
    or char_length(trim(coalesce(p_outcome, ''))) < 2
    or lower(trim(coalesce(p_role, ''))) not in ('admin','editor','viewer')
    or lower(trim(coalesce(p_seat_type, ''))) not in ('full','participant','viewer')
    or p_idempotency_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_enterprise_api_audit_input';
  end if;

  if not exists (
    select 1
    from public.enterprise_api_keys as api_key
    join public.enterprise_service_accounts as account
      on account.id = api_key.service_account_id
     and account.organization_id = api_key.organization_id
    where api_key.id = p_api_key_id
      and api_key.organization_id = p_organization_id
      and account.id = p_service_account_id
  ) then
    raise exception 'enterprise_api_binding_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('enterprise-api-audit:' || p_organization_id::text, 0));

  select event.event_hash into v_previous_hash
  from public.enterprise_integration_audit_events as event
  where event.organization_id = p_organization_id
  order by event.created_at desc, event.id desc
  limit 1;

  v_event_hash := encode(digest(
    concat_ws(
      '|',
      coalesce(v_previous_hash, ''),
      v_event_id::text,
      p_organization_id::text,
      p_service_account_id::text,
      p_target_user_id::text,
      lower(trim(p_outcome)),
      lower(trim(p_role)),
      lower(trim(p_seat_type)),
      p_idempotency_digest
    ),
    'sha256'
  ), 'hex');

  insert into public.enterprise_integration_audit_events (
    id,
    organization_id,
    actor_service_account_id,
    event_type,
    target_type,
    target_id,
    correlation_id,
    metadata,
    previous_hash,
    event_hash
  ) values (
    v_event_id,
    p_organization_id,
    p_service_account_id,
    'enterprise.api_user_provisioned',
    'auth_user',
    p_target_user_id,
    v_correlation_id,
    jsonb_build_object(
      'api_key_id', p_api_key_id,
      'outcome', lower(trim(p_outcome)),
      'role', lower(trim(p_role)),
      'seat_type', lower(trim(p_seat_type)),
      'idempotency_digest', p_idempotency_digest
    ),
    v_previous_hash,
    v_event_hash
  );

  return v_event_id;
end;
$$;

revoke all on function public.record_enterprise_api_provisioning_event(uuid, uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_enterprise_api_provisioning_event(uuid, uuid, uuid, uuid, text, text, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
