begin;

-- V26 forward-only reconciliation for the Enterprise SSO runtime used by the
-- current application. Production already contains the base
-- enterprise_identity_connections table, but the live schema is missing the
-- provider binding/provisioning columns and RPCs required by the application.
--
-- This migration is intentionally additive and idempotent. It does not repair,
-- rewrite or delete migration history and it does not weaken the fail-closed
-- SSO access path.

do $prerequisites$
begin
  if to_regclass('public.enterprise_identity_connections') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regclass('public.platform_admin_users') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'enterprise SSO runtime prerequisites are missing';
  end if;
end
$prerequisites$;

alter table public.enterprise_identity_connections
  add column if not exists supabase_provider_id uuid,
  add column if not exists default_role text not null default 'editor',
  add column if not exists default_seat_type text not null default 'full',
  add column if not exists auto_provision boolean not null default true,
  add column if not exists last_login_at timestamptz;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_identity_default_role_allowed'
      and conrelid = 'public.enterprise_identity_connections'::regclass
  ) then
    alter table public.enterprise_identity_connections
      add constraint enterprise_identity_default_role_allowed
      check (default_role in ('admin', 'editor', 'viewer'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_identity_default_seat_allowed'
      and conrelid = 'public.enterprise_identity_connections'::regclass
  ) then
    alter table public.enterprise_identity_connections
      add constraint enterprise_identity_default_seat_allowed
      check (default_seat_type in ('full', 'participant', 'viewer'));
  end if;
end
$constraints$;

create unique index if not exists enterprise_identity_supabase_provider_unique
  on public.enterprise_identity_connections (supabase_provider_id)
  where supabase_provider_id is not null
    and status in ('verified', 'active');

create index if not exists enterprise_identity_domain_active_idx
  on public.enterprise_identity_connections (lower(verified_domain), status)
  where verified_domain is not null;

create or replace function public.resolve_enterprise_sso_binding(
  p_supabase_provider_id uuid,
  p_email text
)
returns table (
  outcome text,
  organization_id uuid,
  identity_connection_id uuid,
  default_role text,
  default_seat_type text,
  enforce_sso boolean,
  auto_provision boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_domain text;
  v_connection public.enterprise_identity_connections%rowtype;
begin
  if p_supabase_provider_id is null
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return query
      select 'invalid_input'::text, null::uuid, null::uuid,
             null::text, null::text, false, false;
    return;
  end if;

  v_domain := split_part(v_email, '@', 2);

  select connection.*
    into v_connection
  from public.enterprise_identity_connections connection
  where connection.supabase_provider_id = p_supabase_provider_id
    and connection.status = 'active'
    and connection.protocol = 'saml'
    and lower(coalesce(connection.verified_domain, '')) = v_domain
  order by connection.id
  limit 1;

  if not found then
    return query
      select 'connection_not_found'::text, null::uuid, null::uuid,
             null::text, null::text, false, false;
    return;
  end if;

  if not exists (
    select 1
    from public.enterprise_contracts contract
    join public.organization_entitlements entitlement
      on entitlement.organization_id = contract.organization_id
     and entitlement.contract_id = contract.id
    where contract.organization_id = v_connection.organization_id
      and contract.contract_mode = 'negotiated'
      and contract.status = 'active'
      and contract.starts_at <= now()
      and (contract.ends_at is null or contract.ends_at > now())
      and entitlement.sso_enabled = true
  ) then
    return query
      select 'sso_not_entitled'::text,
             v_connection.organization_id,
             v_connection.id,
             v_connection.default_role,
             v_connection.default_seat_type,
             v_connection.enforce_sso,
             v_connection.auto_provision;
    return;
  end if;

  return query
    select 'resolved'::text,
           v_connection.organization_id,
           v_connection.id,
           v_connection.default_role,
           v_connection.default_seat_type,
           v_connection.enforce_sso,
           v_connection.auto_provision;
end;
$$;

create or replace function public.record_enterprise_sso_login(
  p_identity_connection_id uuid,
  p_user_id uuid,
  p_outcome text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_connection public.enterprise_identity_connections%rowtype;
begin
  if p_identity_connection_id is null or p_user_id is null then
    return;
  end if;

  update public.enterprise_identity_connections connection
  set last_login_at = now(),
      updated_at = now()
  where connection.id = p_identity_connection_id
  returning * into v_connection;

  if not found then
    return;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_connection.organization_id,
    p_user_id,
    p_user_id,
    'enterprise.sso_login',
    'enterprise_identity_connection',
    v_connection.id::text,
    jsonb_build_object(
      'provider_id', v_connection.supabase_provider_id,
      'outcome', left(coalesce(p_outcome, 'unknown'), 80)
    )
  );
end;
$$;

create or replace function public.upsert_enterprise_sso_connection_atomic(
  p_organization_id uuid,
  p_connection_id uuid,
  p_supabase_provider_id uuid,
  p_issuer text,
  p_metadata_url text,
  p_verified_domain text,
  p_default_role text,
  p_default_seat_type text,
  p_enforce_sso boolean,
  p_auto_provision boolean,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  connection_id uuid,
  organization_id uuid,
  connection_status text,
  verified_domain text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_domain text := lower(trim(coalesce(p_verified_domain, '')));
  v_issuer text := trim(coalesce(p_issuer, ''));
  v_metadata_url text := trim(coalesce(p_metadata_url, ''));
  v_role text := lower(trim(coalesce(p_default_role, '')));
  v_seat text := lower(trim(coalesce(p_default_seat_type, '')));
  v_connection public.enterprise_identity_connections%rowtype;
begin
  if p_organization_id is null
     or p_supabase_provider_id is null
     or p_actor_user_id is null
     or char_length(v_issuer) not between 3 and 1000
     or v_metadata_url !~ '^https://'
     or v_domain !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
     or v_role not in ('admin', 'editor', 'viewer')
     or v_seat not in ('full', 'participant', 'viewer') then
    return query
      select 'invalid_input'::text, null::uuid, p_organization_id,
             null::text, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in ('owner', 'platform_owner', 'platform_admin', 'platform_security')
  ) then
    return query
      select 'platform_role_required'::text, null::uuid, p_organization_id,
             null::text, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.enterprise_contracts contract
    join public.organization_entitlements entitlement
      on entitlement.organization_id = contract.organization_id
     and entitlement.contract_id = contract.id
    where contract.organization_id = p_organization_id
      and contract.contract_mode = 'negotiated'
      and contract.status = 'active'
      and contract.starts_at <= now()
      and (contract.ends_at is null or contract.ends_at > now())
      and entitlement.sso_enabled = true
  ) then
    return query
      select 'sso_not_entitled'::text, null::uuid, p_organization_id,
             null::text, v_domain;
    return;
  end if;

  if exists (
    select 1
    from public.enterprise_identity_connections conflicting
    where conflicting.status = 'active'
      and conflicting.id is distinct from p_connection_id
      and (
        conflicting.supabase_provider_id = p_supabase_provider_id
        or lower(coalesce(conflicting.verified_domain, '')) = v_domain
      )
  ) then
    return query
      select 'binding_conflict'::text, null::uuid, p_organization_id,
             null::text, v_domain;
    return;
  end if;

  if p_connection_id is null then
    insert into public.enterprise_identity_connections (
      organization_id,
      protocol,
      status,
      issuer,
      metadata_url,
      verified_domain,
      supabase_provider_id,
      default_role,
      default_seat_type,
      enforce_sso,
      auto_provision,
      created_by,
      verified_by,
      verified_at
    ) values (
      p_organization_id,
      'saml',
      'active',
      v_issuer,
      v_metadata_url,
      v_domain,
      p_supabase_provider_id,
      v_role,
      v_seat,
      coalesce(p_enforce_sso, false),
      coalesce(p_auto_provision, true),
      p_actor_user_id,
      p_actor_user_id,
      now()
    )
    returning * into v_connection;
  else
    update public.enterprise_identity_connections connection
    set protocol = 'saml',
        status = 'active',
        issuer = v_issuer,
        metadata_url = v_metadata_url,
        verified_domain = v_domain,
        supabase_provider_id = p_supabase_provider_id,
        default_role = v_role,
        default_seat_type = v_seat,
        enforce_sso = coalesce(p_enforce_sso, false),
        auto_provision = coalesce(p_auto_provision, true),
        verified_by = p_actor_user_id,
        verified_at = now(),
        updated_at = now()
    where connection.id = p_connection_id
      and connection.organization_id = p_organization_id
    returning * into v_connection;

    if not found then
      return query
        select 'not_found'::text, null::uuid, p_organization_id,
               null::text, v_domain;
      return;
    end if;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_actor_user_id,
    p_actor_user_id,
    'enterprise.sso_connection_configured',
    'enterprise_identity_connection',
    v_connection.id::text,
    jsonb_build_object(
      'provider_id', v_connection.supabase_provider_id,
      'verified_domain', v_connection.verified_domain,
      'default_role', v_connection.default_role,
      'default_seat_type', v_connection.default_seat_type,
      'enforce_sso', v_connection.enforce_sso,
      'auto_provision', v_connection.auto_provision
    )
  );

  return query
    select 'configured'::text,
           v_connection.id,
           v_connection.organization_id,
           v_connection.status,
           v_connection.verified_domain;
end;
$$;

revoke all on function public.resolve_enterprise_sso_binding(uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_enterprise_sso_login(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.upsert_enterprise_sso_connection_atomic(
  uuid, uuid, uuid, text, text, text, text, text, boolean, boolean, uuid
) from public, anon, authenticated;

grant execute on function public.resolve_enterprise_sso_binding(uuid, text)
  to service_role;
grant execute on function public.record_enterprise_sso_login(uuid, uuid, text)
  to service_role;
grant execute on function public.upsert_enterprise_sso_connection_atomic(
  uuid, uuid, uuid, text, text, text, text, text, boolean, boolean, uuid
) to service_role;

do $verify$
declare
  required_column text;
begin
  foreach required_column in array array[
    'supabase_provider_id',
    'default_role',
    'default_seat_type',
    'auto_provision',
    'last_login_at'
  ] loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'enterprise_identity_connections'
        and column_name = required_column
    ) then
      raise exception 'enterprise SSO runtime column % is missing', required_column;
    end if;
  end loop;

  if to_regprocedure('public.resolve_enterprise_sso_binding(uuid,text)') is null
     or to_regprocedure('public.record_enterprise_sso_login(uuid,uuid,text)') is null
     or to_regprocedure('public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)') is null then
    raise exception 'enterprise SSO runtime RPC is missing';
  end if;

  if has_function_privilege('public', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE') then
    raise exception 'enterprise SSO binding resolver privilege boundary is invalid';
  end if;
end
$verify$;

notify pgrst, 'reload schema';

commit;
