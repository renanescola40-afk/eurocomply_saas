begin;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'enterprise_api_keys'
      and constraint_type = 'CHECK'
  loop
    if (
      select pg_get_constraintdef(constraint_oid)
      from (
        select constraint_record.oid as constraint_oid
        from pg_constraint as constraint_record
        join pg_class as relation on relation.oid = constraint_record.conrelid
        join pg_namespace as namespace on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and relation.relname = 'enterprise_api_keys'
          and constraint_record.conname = v_constraint.constraint_name
      ) as definition
    ) ilike '%char_length(secret_hash)%64%' then
      execute format('alter table public.enterprise_api_keys drop constraint %I', v_constraint.constraint_name);
    end if;
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_api_keys_verifier_format_check'
  ) then
    alter table public.enterprise_api_keys
      add constraint enterprise_api_keys_verifier_format_check
      check (
        secret_hash ~ '^[a-f0-9]{64}$'
        or secret_hash ~ '^pbkdf2\$[0-9]{5,9}\$[a-f0-9]{32}\$[a-f0-9]{64}$'
      ) not valid;
  end if;
end;
$$;

create or replace function public.create_enterprise_api_credential_atomic(
  p_organization_id uuid,
  p_service_account_name text,
  p_service_account_description text,
  p_key_prefix text,
  p_secret_verifier text,
  p_scopes text[],
  p_expires_at timestamptz,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  organization_id uuid,
  service_account_id uuid,
  api_key_id uuid,
  key_prefix text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_service_account_name, ''));
  v_description text := nullif(trim(coalesce(p_service_account_description, '')), '');
  v_prefix text := trim(coalesce(p_key_prefix, ''));
  v_verifier text := lower(trim(coalesce(p_secret_verifier, '')));
  v_scopes text[];
  v_service_account public.enterprise_service_accounts%rowtype;
  v_key public.enterprise_api_keys%rowtype;
  v_snapshot record;
begin
  select array_agg(distinct lower(trim(scope)) order by lower(trim(scope)))
  into v_scopes
  from unnest(coalesce(p_scopes, '{}'::text[])) as scope
  where trim(scope) <> '';

  if p_organization_id is null
    or p_actor_user_id is null
    or char_length(v_name) not between 3 and 120
    or v_prefix !~ '^rc_live_[a-f0-9]{8}$'
    or v_verifier !~ '^pbkdf2\$[0-9]{5,9}\$[a-f0-9]{32}\$[a-f0-9]{64}$'
    or p_expires_at <= now()
    or coalesce(cardinality(v_scopes), 0) not between 1 and 32
    or not (v_scopes <@ array[
      'inventory:read','inventory:write','assessments:read','assessments:write',
      'evidence:read','evidence:write','reports:read','webhooks:manage','users:provision'
    ]::text[]) then
    return query select 'invalid_input'::text, p_organization_id, null::uuid, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in ('owner','platform_owner','platform_admin','platform_security')
  ) then
    return query select 'platform_role_required'::text, p_organization_id, null::uuid, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(p_organization_id);

  if v_snapshot.outcome is distinct from 'resolved'
    or v_snapshot.contract_status is distinct from 'active'
    or v_snapshot.api_enabled is distinct from true then
    return query select 'api_not_entitled'::text, p_organization_id, null::uuid, null::uuid, v_prefix, p_expires_at;
    return;
  end if;

  insert into public.enterprise_service_accounts (
    organization_id,
    name,
    description,
    status,
    created_by
  ) values (
    p_organization_id,
    v_name,
    v_description,
    'active',
    p_actor_user_id
  )
  on conflict (organization_id, name) do update
  set
    description = excluded.description,
    status = case when public.enterprise_service_accounts.status = 'revoked' then 'active' else public.enterprise_service_accounts.status end,
    updated_at = now()
  returning * into v_service_account;

  insert into public.enterprise_api_keys (
    organization_id,
    service_account_id,
    key_prefix,
    secret_hash,
    scopes,
    status,
    expires_at,
    created_by
  ) values (
    p_organization_id,
    v_service_account.id,
    v_prefix,
    v_verifier,
    v_scopes,
    'active',
    p_expires_at,
    p_actor_user_id
  ) returning * into v_key;

  insert into public.enterprise_integration_audit_events (
    organization_id,
    actor_user_id,
    event_type,
    target_type,
    target_id,
    correlation_id,
    metadata,
    previous_hash,
    event_hash
  ) values (
    p_organization_id,
    p_actor_user_id,
    'enterprise.api_key_created',
    'enterprise_api_key',
    v_key.id,
    gen_random_uuid(),
    jsonb_build_object('key_prefix', v_key.key_prefix, 'scopes', v_key.scopes, 'expires_at', v_key.expires_at),
    null,
    encode(digest(
      concat_ws('|', p_organization_id::text, v_key.id::text, v_key.key_prefix, v_key.expires_at::text),
      'sha256'
    ), 'hex')
  );

  return query select
    'created'::text,
    p_organization_id,
    v_service_account.id,
    v_key.id,
    v_key.key_prefix,
    v_key.expires_at;
exception
  when unique_violation then
    return query select 'prefix_conflict'::text, p_organization_id, null::uuid, null::uuid, v_prefix, p_expires_at;
end;
$$;

revoke all on function public.create_enterprise_api_credential_atomic(uuid, text, text, text, text, text[], timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.create_enterprise_api_credential_atomic(uuid, text, text, text, text, text[], timestamptz, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
