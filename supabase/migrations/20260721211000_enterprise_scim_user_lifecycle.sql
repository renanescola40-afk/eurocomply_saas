begin;

create table if not exists public.enterprise_scim_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete set null,
  external_id text check (external_id is null or char_length(external_id) <= 255),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('admin','editor','viewer')),
  seat_type text not null check (seat_type in ('full','participant','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deprovisioned_at timestamptz,
  unique (organization_id, user_id),
  unique (organization_id, email)
);

create unique index if not exists enterprise_scim_identity_external_id_unique
  on public.enterprise_scim_identities (organization_id, identity_connection_id, external_id)
  where external_id is not null;
create index if not exists enterprise_scim_identity_org_active_idx
  on public.enterprise_scim_identities (organization_id, active, created_at desc);

alter table public.enterprise_scim_identities enable row level security;
alter table public.enterprise_scim_identities force row level security;
revoke all on public.enterprise_scim_identities from public, anon, authenticated;
grant all on public.enterprise_scim_identities to service_role;

create or replace function public.authenticate_enterprise_scim_token(
  p_token_prefix text,
  p_token_hash text
)
returns table (
  outcome text,
  token_id uuid,
  organization_id uuid,
  identity_connection_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if coalesce(p_token_prefix, '') !~ '^scim_[a-zA-Z0-9]{8}$'
    or coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$' then
    return query select 'invalid_token'::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select token.* into v_token
  from public.enterprise_scim_tokens as token
  where token.token_prefix = p_token_prefix
  for update;

  if not found
    or v_token.status <> 'active'
    or v_token.expires_at <= now()
    or v_token.token_hash <> p_token_hash then
    return query select 'invalid_token'::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(v_token.organization_id);

  if v_snapshot.outcome is distinct from 'resolved'
    or v_snapshot.contract_status is distinct from 'active'
    or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text, v_token.id, v_token.organization_id, v_token.identity_connection_id;
    return;
  end if;

  update public.enterprise_scim_tokens as token
  set last_used_at = now()
  where token.id = v_token.id;

  return query select
    'authenticated'::text,
    v_token.id,
    v_token.organization_id,
    v_token.identity_connection_id;
end;
$$;

create or replace function public.create_enterprise_scim_token_atomic(
  p_organization_id uuid,
  p_identity_connection_id uuid,
  p_token_prefix text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_actor_user_id uuid
)
returns table (outcome text, token_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if p_organization_id is null
    or p_actor_user_id is null
    or coalesce(p_token_prefix, '') !~ '^scim_[a-zA-Z0-9]{8}$'
    or coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '370 days' then
    return query select 'invalid_input'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in (
        'owner','sales_admin','support_admin','platform_owner','platform_admin','platform_security'
      )
  ) then
    return query select 'platform_role_required'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if p_identity_connection_id is not null and not exists (
    select 1
    from public.enterprise_identity_connections as connection
    where connection.id = p_identity_connection_id
      and connection.organization_id = p_organization_id
      and connection.status in ('verified','active')
  ) then
    return query select 'identity_connection_not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(p_organization_id);

  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.enterprise_scim_tokens (
    organization_id,
    identity_connection_id,
    token_prefix,
    token_hash,
    status,
    expires_at,
    created_by
  ) values (
    p_organization_id,
    p_identity_connection_id,
    p_token_prefix,
    p_token_hash,
    'active',
    p_expires_at,
    p_actor_user_id
  ) returning * into v_token;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_actor_user_id,
    'enterprise.scim_token_created',
    'enterprise_scim_token',
    v_token.id::text,
    jsonb_build_object(
      'token_prefix', v_token.token_prefix,
      'expires_at', v_token.expires_at,
      'identity_connection_id', v_token.identity_connection_id
    )
  );

  return query select 'created'::text, v_token.id, v_token.expires_at;
end;
$$;

create or replace function public.upsert_enterprise_scim_identity_atomic(
  p_organization_id uuid,
  p_identity_connection_id uuid,
  p_external_id text,
  p_user_id uuid,
  p_email text,
  p_role text,
  p_seat_type text
)
returns table (
  outcome text,
  identity_id uuid,
  user_id uuid,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity public.enterprise_scim_identities%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
begin
  if p_organization_id is null
    or p_user_id is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or v_role not in ('admin','editor','viewer')
    or v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_input'::text, null::uuid, null::uuid, false, null::timestamptz, null::timestamptz;
    return;
  end if;

  insert into public.enterprise_scim_identities (
    organization_id,
    identity_connection_id,
    external_id,
    user_id,
    email,
    role,
    seat_type,
    active
  ) values (
    p_organization_id,
    p_identity_connection_id,
    nullif(trim(coalesce(p_external_id, '')), ''),
    p_user_id,
    v_email,
    v_role,
    v_seat_type,
    true
  )
  on conflict (organization_id, user_id) do update
  set
    identity_connection_id = excluded.identity_connection_id,
    external_id = excluded.external_id,
    email = excluded.email,
    role = excluded.role,
    seat_type = excluded.seat_type,
    active = true,
    deprovisioned_at = null,
    updated_at = now()
  returning * into v_identity;

  return query select
    'upserted'::text,
    v_identity.id,
    v_identity.user_id,
    v_identity.active,
    v_identity.created_at,
    v_identity.updated_at;
end;
$$;

create or replace function public.get_enterprise_scim_identity(
  p_organization_id uuid,
  p_identity_id uuid
)
returns table (
  outcome text,
  identity_id uuid,
  external_id text,
  user_id uuid,
  email text,
  role text,
  seat_type text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    'resolved'::text,
    identity.id,
    identity.external_id,
    identity.user_id,
    identity.email,
    identity.role,
    identity.seat_type,
    identity.active,
    identity.created_at,
    identity.updated_at
  from public.enterprise_scim_identities as identity
  where identity.organization_id = p_organization_id
    and identity.id = p_identity_id;
$$;

create or replace function public.deactivate_enterprise_scim_identity_atomic(
  p_organization_id uuid,
  p_identity_id uuid
)
returns table (
  outcome text,
  identity_id uuid,
  user_id uuid,
  active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity public.enterprise_scim_identities%rowtype;
begin
  select identity.* into v_identity
  from public.enterprise_scim_identities as identity
  where identity.organization_id = p_organization_id
    and identity.id = p_identity_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, false, null::timestamptz;
    return;
  end if;

  if v_identity.active = false then
    return query select 'unchanged'::text, v_identity.id, v_identity.user_id, false, v_identity.updated_at;
    return;
  end if;

  update public.enterprise_scim_identities as identity
  set active = false, deprovisioned_at = now(), updated_at = now()
  where identity.id = v_identity.id
  returning * into v_identity;

  return query select 'deactivated'::text, v_identity.id, v_identity.user_id, v_identity.active, v_identity.updated_at;
end;
$$;

revoke all on function public.authenticate_enterprise_scim_token(text, text) from public, anon, authenticated;
revoke all on function public.create_enterprise_scim_token_atomic(uuid, uuid, text, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.upsert_enterprise_scim_identity_atomic(uuid, uuid, text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.get_enterprise_scim_identity(uuid, uuid) from public, anon, authenticated;
revoke all on function public.deactivate_enterprise_scim_identity_atomic(uuid, uuid) from public, anon, authenticated;

grant execute on function public.authenticate_enterprise_scim_token(text, text) to service_role;
grant execute on function public.create_enterprise_scim_token_atomic(uuid, uuid, text, text, timestamptz, uuid) to service_role;
grant execute on function public.upsert_enterprise_scim_identity_atomic(uuid, uuid, text, uuid, text, text, text) to service_role;
grant execute on function public.get_enterprise_scim_identity(uuid, uuid) to service_role;
grant execute on function public.deactivate_enterprise_scim_identity_atomic(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
