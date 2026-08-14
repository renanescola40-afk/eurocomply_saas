begin;

create extension if not exists pgcrypto;

do $prerequisites$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.platform_admin_users') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regprocedure('public.resolve_organization_entitlements_v2(uuid)') is null then
    raise exception 'enterprise integrations prerequisites are missing';
  end if;
end
$prerequisites$;

create table if not exists public.enterprise_service_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  description text,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_by uuid not null references auth.users(id),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,name)
);

create table if not exists public.enterprise_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_account_id uuid not null references public.enterprise_service_accounts(id) on delete cascade,
  key_prefix text not null check (key_prefix ~ '^rc_live_[a-zA-Z0-9]{8}$'),
  secret_hash text not null check (char_length(secret_hash)=64),
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','rotating','revoked','expired')),
  expires_at timestamptz not null,
  rotated_from_id uuid references public.enterprise_api_keys(id),
  grace_period_ends_at timestamptz,
  last_used_at timestamptz,
  last_used_ip_hash text,
  created_by uuid not null references auth.users(id),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id,key_prefix),
  check (expires_at>created_at),
  check (cardinality(scopes) between 1 and 32)
);

create table if not exists public.enterprise_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_url text not null check (endpoint_url ~ '^https://'),
  event_types text[] not null,
  secret_ciphertext text not null,
  secret_version integer not null default 1 check (secret_version>0),
  status text not null default 'active' check (status in ('active','paused','revoked')),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  timeout_seconds integer not null default 10 check (timeout_seconds between 1 and 30),
  created_by uuid not null references auth.users(id),
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(event_types) between 1 and 64)
);

create table if not exists public.enterprise_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.enterprise_webhook_subscriptions(id) on delete cascade,
  event_id uuid not null,
  event_type text not null,
  idempotency_key text not null,
  payload_digest text not null check (char_length(payload_digest)=64),
  status text not null default 'pending' check (status in ('pending','leased','delivered','retryable','dead_letter','cancelled')),
  attempt_count integer not null default 0 check (attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  response_status integer,
  response_digest text,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id,event_id),
  unique (organization_id,idempotency_key)
);

create table if not exists public.enterprise_identity_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  protocol text not null check (protocol in ('oidc','saml')),
  status text not null default 'draft' check (status in ('draft','verified','active','suspended','revoked')),
  issuer text not null,
  metadata_url text,
  client_id text,
  encrypted_client_secret text,
  verified_domain text,
  domain_verification_token_hash text,
  group_role_mapping jsonb not null default '{}'::jsonb,
  enforce_sso boolean not null default false,
  created_by uuid not null references auth.users(id),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,protocol,issuer),
  check (not enforce_sso or status='active')
);

create table if not exists public.enterprise_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete cascade,
  token_prefix text not null check (token_prefix ~ '^scim_[a-zA-Z0-9]{8}$'),
  token_hash text not null check (char_length(token_hash)=64),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id,token_prefix),
  check (expires_at>created_at)
);

create table if not exists public.enterprise_integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_service_account_id uuid references public.enterprise_service_accounts(id),
  event_type text not null,
  target_type text not null,
  target_id uuid,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null check (char_length(event_hash)=64),
  created_at timestamptz not null default now(),
  check (actor_user_id is not null or actor_service_account_id is not null)
);

create table if not exists public.enterprise_scim_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete set null,
  external_id text check (external_id is null or char_length(external_id)<=255),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('admin','editor','viewer')),
  seat_type text not null check (seat_type in ('full','participant','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deprovisioned_at timestamptz,
  unique (organization_id,user_id),
  unique (organization_id,email)
);

create index if not exists enterprise_api_keys_lookup_idx on public.enterprise_api_keys(key_prefix,status,expires_at);
create index if not exists enterprise_webhook_due_idx on public.enterprise_webhook_deliveries(status,next_attempt_at) where status in ('pending','retryable');
create index if not exists enterprise_webhook_org_idx on public.enterprise_webhook_deliveries(organization_id,created_at desc);
create index if not exists enterprise_identity_org_idx on public.enterprise_identity_connections(organization_id,status);
create index if not exists enterprise_audit_chain_idx on public.enterprise_integration_audit_events(organization_id,created_at,id);
create unique index if not exists enterprise_scim_identity_external_id_unique
  on public.enterprise_scim_identities(organization_id,identity_connection_id,external_id) where external_id is not null;
create index if not exists enterprise_scim_identity_org_active_idx
  on public.enterprise_scim_identities(organization_id,active,created_at desc);

-- Tenant composite keys make every child relationship prove organization scope.
do $tenant_keys$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_service_accounts'::regclass and conname='enterprise_service_accounts_id_org_key') then
    alter table public.enterprise_service_accounts add constraint enterprise_service_accounts_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_webhook_subscriptions'::regclass and conname='enterprise_webhook_subscriptions_id_org_key') then
    alter table public.enterprise_webhook_subscriptions add constraint enterprise_webhook_subscriptions_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_identity_connections'::regclass and conname='enterprise_identity_connections_id_org_key') then
    alter table public.enterprise_identity_connections add constraint enterprise_identity_connections_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_id_org_key') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_id_org_key unique (id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_service_account_tenant_fk') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_service_account_tenant_fk
      foreign key (service_account_id,organization_id) references public.enterprise_service_accounts(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_api_keys'::regclass and conname='enterprise_api_keys_rotation_tenant_fk') then
    alter table public.enterprise_api_keys add constraint enterprise_api_keys_rotation_tenant_fk
      foreign key (rotated_from_id,organization_id) references public.enterprise_api_keys(id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_webhook_deliveries'::regclass and conname='enterprise_webhook_deliveries_subscription_tenant_fk') then
    alter table public.enterprise_webhook_deliveries add constraint enterprise_webhook_deliveries_subscription_tenant_fk
      foreign key (subscription_id,organization_id) references public.enterprise_webhook_subscriptions(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_scim_tokens'::regclass and conname='enterprise_scim_tokens_connection_tenant_fk') then
    alter table public.enterprise_scim_tokens add constraint enterprise_scim_tokens_connection_tenant_fk
      foreign key (identity_connection_id,organization_id) references public.enterprise_identity_connections(id,organization_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_integration_audit_events'::regclass and conname='enterprise_integration_audit_service_account_tenant_fk') then
    alter table public.enterprise_integration_audit_events add constraint enterprise_integration_audit_service_account_tenant_fk
      foreign key (actor_service_account_id,organization_id) references public.enterprise_service_accounts(id,organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.enterprise_scim_identities'::regclass and conname='enterprise_scim_identities_connection_tenant_fk') then
    alter table public.enterprise_scim_identities add constraint enterprise_scim_identities_connection_tenant_fk
      foreign key (identity_connection_id,organization_id) references public.enterprise_identity_connections(id,organization_id) on delete set null;
  end if;
end
$tenant_keys$;

-- Sensitive integration material is backend-only. Existing historical browser
-- policies are removed as defense in depth; service routes use the admin client.
drop policy if exists enterprise_service_accounts_admin on public.enterprise_service_accounts;
drop policy if exists enterprise_api_keys_admin on public.enterprise_api_keys;
drop policy if exists enterprise_webhook_subscriptions_admin on public.enterprise_webhook_subscriptions;
drop policy if exists enterprise_webhook_deliveries_read on public.enterprise_webhook_deliveries;
drop policy if exists enterprise_identity_connections_admin on public.enterprise_identity_connections;
drop policy if exists enterprise_scim_tokens_admin on public.enterprise_scim_tokens;
drop policy if exists enterprise_integration_audit_read on public.enterprise_integration_audit_events;

alter table public.enterprise_service_accounts enable row level security; alter table public.enterprise_service_accounts force row level security;
alter table public.enterprise_api_keys enable row level security; alter table public.enterprise_api_keys force row level security;
alter table public.enterprise_webhook_subscriptions enable row level security; alter table public.enterprise_webhook_subscriptions force row level security;
alter table public.enterprise_webhook_deliveries enable row level security; alter table public.enterprise_webhook_deliveries force row level security;
alter table public.enterprise_identity_connections enable row level security; alter table public.enterprise_identity_connections force row level security;
alter table public.enterprise_scim_tokens enable row level security; alter table public.enterprise_scim_tokens force row level security;
alter table public.enterprise_integration_audit_events enable row level security; alter table public.enterprise_integration_audit_events force row level security;
alter table public.enterprise_scim_identities enable row level security; alter table public.enterprise_scim_identities force row level security;

revoke all on table public.enterprise_service_accounts from public,anon,authenticated;
revoke all on table public.enterprise_api_keys from public,anon,authenticated;
revoke all on table public.enterprise_webhook_subscriptions from public,anon,authenticated;
revoke all on table public.enterprise_webhook_deliveries from public,anon,authenticated;
revoke all on table public.enterprise_identity_connections from public,anon,authenticated;
revoke all on table public.enterprise_scim_tokens from public,anon,authenticated;
revoke all on table public.enterprise_integration_audit_events from public,anon,authenticated;
revoke all on table public.enterprise_scim_identities from public,anon,authenticated;
grant all on table public.enterprise_service_accounts to service_role;
grant all on table public.enterprise_api_keys to service_role;
grant all on table public.enterprise_webhook_subscriptions to service_role;
grant all on table public.enterprise_webhook_deliveries to service_role;
grant all on table public.enterprise_identity_connections to service_role;
grant all on table public.enterprise_scim_tokens to service_role;
grant all on table public.enterprise_integration_audit_events to service_role;
grant all on table public.enterprise_scim_identities to service_role;

create or replace function public.create_enterprise_scim_token_atomic(
  p_organization_id uuid,p_identity_connection_id uuid,p_token_prefix text,p_token_hash text,
  p_expires_at timestamptz,p_actor_user_id uuid
)
returns table (outcome text,token_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if p_organization_id is null or p_actor_user_id is null
     or coalesce(p_token_prefix,'') !~ '^scim_[a-zA-Z0-9]{8}$'
     or coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$'
     or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '370 days' then
    return query select 'invalid_input'::text,null::uuid,null::timestamptz; return;
  end if;

  if not exists (
    select 1 from public.platform_admin_users actor
    where actor.user_id=p_actor_user_id and actor.enabled=true
      and actor.role in ('owner','sales_admin','support_admin','platform_owner','platform_admin','platform_security')
  ) then
    return query select 'platform_role_required'::text,null::uuid,null::timestamptz; return;
  end if;

  if p_identity_connection_id is not null and not exists (
    select 1 from public.enterprise_identity_connections connection
    where connection.id=p_identity_connection_id and connection.organization_id=p_organization_id
      and connection.status in ('verified','active')
  ) then
    return query select 'identity_connection_not_found'::text,null::uuid,null::timestamptz; return;
  end if;

  select * into v_snapshot from public.resolve_organization_entitlements_v2(p_organization_id);
  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text,null::uuid,null::timestamptz; return;
  end if;

  insert into public.enterprise_scim_tokens(
    organization_id,identity_connection_id,token_prefix,token_hash,status,expires_at,created_by
  ) values (p_organization_id,p_identity_connection_id,p_token_prefix,p_token_hash,'active',p_expires_at,p_actor_user_id)
  returning * into v_token;

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.scim_token_created','enterprise_scim_token',v_token.id::text,
    jsonb_build_object('token_prefix',v_token.token_prefix,'expires_at',v_token.expires_at,'identity_connection_id',v_token.identity_connection_id));

  return query select 'created'::text,v_token.id,v_token.expires_at;
end;
$$;

create or replace function public.authenticate_enterprise_scim_token(p_token_prefix text,p_token_hash text)
returns table (outcome text,token_id uuid,organization_id uuid,identity_connection_id uuid)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_token public.enterprise_scim_tokens%rowtype;
  v_snapshot record;
begin
  if coalesce(p_token_prefix,'') !~ '^scim_[a-zA-Z0-9]{8}$' or coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$' then
    return query select 'invalid_token'::text,null::uuid,null::uuid,null::uuid; return;
  end if;
  select token.* into v_token from public.enterprise_scim_tokens token where token.token_prefix=p_token_prefix for update;
  if not found or v_token.status<>'active' or v_token.expires_at<=now() or v_token.token_hash<>p_token_hash then
    return query select 'invalid_token'::text,null::uuid,null::uuid,null::uuid; return;
  end if;
  select * into v_snapshot from public.resolve_organization_entitlements_v2(v_token.organization_id);
  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.contract_status is distinct from 'active'
     or v_snapshot.scim_enabled is distinct from true then
    return query select 'scim_not_entitled'::text,v_token.id,v_token.organization_id,v_token.identity_connection_id; return;
  end if;
  update public.enterprise_scim_tokens token set last_used_at=now() where token.id=v_token.id;
  return query select 'authenticated'::text,v_token.id,v_token.organization_id,v_token.identity_connection_id;
end;
$$;

create or replace function public.upsert_enterprise_scim_identity_atomic(
  p_organization_id uuid,p_identity_connection_id uuid,p_external_id text,p_user_id uuid,p_email text,p_role text,p_seat_type text
)
returns table (outcome text,identity_id uuid,user_id uuid,active boolean,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare
  v_identity public.enterprise_scim_identities%rowtype;
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_role text:=lower(trim(coalesce(p_role,'')));
  v_seat_type text:=lower(trim(coalesce(p_seat_type,'')));
begin
  if p_organization_id is null or p_user_id is null
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or v_role not in ('admin','editor','viewer') or v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_input'::text,null::uuid,null::uuid,false,null::timestamptz,null::timestamptz; return;
  end if;
  if p_identity_connection_id is not null and not exists (
    select 1 from public.enterprise_identity_connections connection
    where connection.id=p_identity_connection_id and connection.organization_id=p_organization_id
  ) then
    return query select 'identity_connection_not_found'::text,null::uuid,null::uuid,false,null::timestamptz,null::timestamptz; return;
  end if;
  insert into public.enterprise_scim_identities(
    organization_id,identity_connection_id,external_id,user_id,email,role,seat_type,active
  ) values (p_organization_id,p_identity_connection_id,nullif(trim(coalesce(p_external_id,'')),''),p_user_id,v_email,v_role,v_seat_type,true)
  on conflict (organization_id,user_id) do update set
    identity_connection_id=excluded.identity_connection_id,external_id=excluded.external_id,email=excluded.email,
    role=excluded.role,seat_type=excluded.seat_type,active=true,deprovisioned_at=null,updated_at=now()
  returning * into v_identity;
  return query select 'upserted'::text,v_identity.id,v_identity.user_id,v_identity.active,v_identity.created_at,v_identity.updated_at;
end;
$$;

create or replace function public.get_enterprise_scim_identity(p_organization_id uuid,p_identity_id uuid)
returns table (outcome text,identity_id uuid,external_id text,user_id uuid,membership_id uuid,email text,role text,seat_type text,active boolean,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=pg_catalog
as $$
  select 'resolved'::text,identity.id,identity.external_id,identity.user_id,member.id,identity.email,identity.role,
    identity.seat_type,identity.active,identity.created_at,identity.updated_at
  from public.enterprise_scim_identities identity
  left join public.organization_members member on member.organization_id=identity.organization_id and member.user_id=identity.user_id
  where identity.organization_id=p_organization_id and identity.id=p_identity_id;
$$;

create or replace function public.find_enterprise_scim_identity(p_organization_id uuid,p_external_id text,p_email text)
returns table (outcome text,identity_id uuid,external_id text,user_id uuid,membership_id uuid,email text,role text,seat_type text,active boolean,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=pg_catalog
as $$
  select 'resolved'::text,identity.id,identity.external_id,identity.user_id,member.id,identity.email,identity.role,
    identity.seat_type,identity.active,identity.created_at,identity.updated_at
  from public.enterprise_scim_identities identity
  left join public.organization_members member on member.organization_id=identity.organization_id and member.user_id=identity.user_id
  where identity.organization_id=p_organization_id
    and ((nullif(trim(coalesce(p_external_id,'')),'') is not null and identity.external_id=trim(p_external_id))
      or identity.email=lower(trim(coalesce(p_email,''))))
  order by case when identity.external_id=nullif(trim(coalesce(p_external_id,'')),'') then 0 else 1 end,identity.created_at
  limit 1;
$$;

create or replace function public.deactivate_enterprise_scim_identity_atomic(p_organization_id uuid,p_identity_id uuid)
returns table (outcome text,identity_id uuid,user_id uuid,active boolean,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare v_identity public.enterprise_scim_identities%rowtype;
begin
  select identity.* into v_identity from public.enterprise_scim_identities identity
  where identity.organization_id=p_organization_id and identity.id=p_identity_id for update;
  if not found then return query select 'not_found'::text,null::uuid,null::uuid,false,null::timestamptz; return; end if;
  if v_identity.active=false then return query select 'unchanged'::text,v_identity.id,v_identity.user_id,false,v_identity.updated_at; return; end if;
  update public.enterprise_scim_identities identity set active=false,deprovisioned_at=now(),updated_at=now()
  where identity.id=v_identity.id returning * into v_identity;
  return query select 'deactivated'::text,v_identity.id,v_identity.user_id,v_identity.active,v_identity.updated_at;
end;
$$;

revoke all on function public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.authenticate_enterprise_scim_token(text,text) from public,anon,authenticated;
revoke all on function public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.get_enterprise_scim_identity(uuid,uuid) from public,anon,authenticated;
revoke all on function public.find_enterprise_scim_identity(uuid,text,text) from public,anon,authenticated;
revoke all on function public.deactivate_enterprise_scim_identity_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid) to service_role;
grant execute on function public.authenticate_enterprise_scim_token(text,text) to service_role;
grant execute on function public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.get_enterprise_scim_identity(uuid,uuid) to service_role;
grant execute on function public.find_enterprise_scim_identity(uuid,text,text) to service_role;
grant execute on function public.deactivate_enterprise_scim_identity_atomic(uuid,uuid) to service_role;

do $verify$
declare
  forced_rls integer;
  browser_grants integer;
  tenant_fk_count integer;
  function_oid oid;
begin
  select count(*) into forced_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions','enterprise_webhook_deliveries',
    'enterprise_identity_connections','enterprise_scim_tokens','enterprise_integration_audit_events','enterprise_scim_identities'
  ) and c.relrowsecurity and c.relforcerowsecurity;
  if forced_rls<>8 then raise exception 'enterprise integrations RLS/FORCE RLS incomplete'; end if;

  select count(*) into browser_grants from information_schema.role_table_grants
  where table_schema='public' and table_name in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions','enterprise_webhook_deliveries',
    'enterprise_identity_connections','enterprise_scim_tokens','enterprise_integration_audit_events','enterprise_scim_identities'
  ) and grantee in ('anon','authenticated');
  if browser_grants<>0 then raise exception 'browser roles retain enterprise integration table privileges'; end if;

  select count(*) into tenant_fk_count from pg_constraint
  where conname in (
    'enterprise_api_keys_service_account_tenant_fk','enterprise_api_keys_rotation_tenant_fk',
    'enterprise_webhook_deliveries_subscription_tenant_fk','enterprise_scim_tokens_connection_tenant_fk',
    'enterprise_integration_audit_service_account_tenant_fk','enterprise_scim_identities_connection_tenant_fk'
  ) and contype='f' and convalidated;
  if tenant_fk_count<>6 then raise exception 'enterprise integration tenant foreign keys incomplete'; end if;

  for function_oid in
    select unnest(array[
      to_regprocedure('public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid)'),
      to_regprocedure('public.authenticate_enterprise_scim_token(text,text)'),
      to_regprocedure('public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text)'),
      to_regprocedure('public.get_enterprise_scim_identity(uuid,uuid)'),
      to_regprocedure('public.find_enterprise_scim_identity(uuid,text,text)'),
      to_regprocedure('public.deactivate_enterprise_scim_identity_atomic(uuid,uuid)')
    ]::oid[])
  loop
    if function_oid is null then raise exception 'enterprise SCIM RPC missing'; end if;
    if has_function_privilege('anon',function_oid,'EXECUTE') or has_function_privilege('authenticated',function_oid,'EXECUTE')
       or not has_function_privilege('service_role',function_oid,'EXECUTE') then
      raise exception 'enterprise SCIM RPC privileges are not canonical';
    end if;
    if not exists (
      select 1 from pg_proc p cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=function_oid and p.prosecdef and setting='search_path=pg_catalog'
    ) then raise exception 'enterprise SCIM RPC security configuration is not fixed'; end if;
  end loop;
end
$verify$;

notify pgrst,'reload schema';
commit;