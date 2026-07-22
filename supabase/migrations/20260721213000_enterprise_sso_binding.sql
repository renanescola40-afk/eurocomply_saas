begin;

alter table public.enterprise_identity_connections
  add column if not exists supabase_provider_id uuid,
  add column if not exists default_role text not null default 'editor',
  add column if not exists default_seat_type text not null default 'full',
  add column if not exists auto_provision boolean not null default true,
  add column if not exists last_login_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_identity_default_role_allowed'
  ) then
    alter table public.enterprise_identity_connections
      add constraint enterprise_identity_default_role_allowed
      check (default_role in ('admin','editor','viewer'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_identity_default_seat_allowed'
  ) then
    alter table public.enterprise_identity_connections
      add constraint enterprise_identity_default_seat_allowed
      check (default_seat_type in ('full','participant','viewer'));
  end if;
end;
$$;

create unique index if not exists enterprise_identity_supabase_provider_unique
  on public.enterprise_identity_connections (supabase_provider_id)
  where supabase_provider_id is not null
    and status in ('verified','active');

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
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_domain text;
  v_connection public.enterprise_identity_connections%rowtype;
  v_snapshot record;
begin
  if p_supabase_provider_id is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text, null::text, false, false;
    return;
  end if;

  v_domain := split_part(v_email, '@', 2);

  select connection.* into v_connection
  from public.enterprise_identity_connections as connection
  where connection.supabase_provider_id = p_supabase_provider_id
    and connection.status = 'active'
    and lower(coalesce(connection.verified_domain, '')) = v_domain
  limit 1;

  if not found then
    return query select 'connection_not_found'::text, null::uuid, null::uuid, null::text, null::text, false, false;
    return;
  end if;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(v_connection.organization_id);

  if v_snapshot.outcome is distinct from 'resolved'
    or v_snapshot.contract_status is distinct from 'active'
    or v_snapshot.sso_enabled is distinct from true then
    return query select
      'sso_not_entitled'::text,
      v_connection.organization_id,
      v_connection.id,
      v_connection.default_role,
      v_connection.default_seat_type,
      v_connection.enforce_sso,
      v_connection.auto_provision;
    return;
  end if;

  return query select
    'resolved'::text,
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
set search_path = public
as $$
declare
  v_connection public.enterprise_identity_connections%rowtype;
begin
  if p_identity_connection_id is null or p_user_id is null then
    return;
  end if;

  update public.enterprise_identity_connections as connection
  set last_login_at = now(), updated_at = now()
  where connection.id = p_identity_connection_id
  returning * into v_connection;

  if not found then return; end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_connection.organization_id,
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

revoke all on function public.resolve_enterprise_sso_binding(uuid, text) from public, anon, authenticated;
revoke all on function public.record_enterprise_sso_login(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_enterprise_sso_binding(uuid, text) to service_role;
grant execute on function public.record_enterprise_sso_login(uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
