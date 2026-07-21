begin;

create extension if not exists pgcrypto;

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
  unique (organization_id, name)
);

create table if not exists public.enterprise_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_account_id uuid not null references public.enterprise_service_accounts(id) on delete cascade,
  key_prefix text not null check (key_prefix ~ '^rc_live_[a-zA-Z0-9]{8}$'),
  secret_hash text not null check (char_length(secret_hash) = 64),
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
  unique (organization_id, key_prefix),
  check (expires_at > created_at),
  check (cardinality(scopes) between 1 and 32)
);

create table if not exists public.enterprise_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_url text not null check (endpoint_url ~ '^https://'),
  event_types text[] not null,
  secret_ciphertext text not null,
  secret_version integer not null default 1 check (secret_version > 0),
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
  payload_digest text not null check (char_length(payload_digest) = 64),
  status text not null default 'pending' check (status in ('pending','leased','delivered','retryable','dead_letter','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  response_status integer,
  response_digest text,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, event_id),
  unique (organization_id, idempotency_key)
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
  unique (organization_id, protocol, issuer),
  check (not enforce_sso or status = 'active')
);

create table if not exists public.enterprise_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_connection_id uuid references public.enterprise_identity_connections(id) on delete cascade,
  token_prefix text not null check (token_prefix ~ '^scim_[a-zA-Z0-9]{8}$'),
  token_hash text not null check (char_length(token_hash) = 64),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, token_prefix),
  check (expires_at > created_at)
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
  event_hash text not null check (char_length(event_hash) = 64),
  created_at timestamptz not null default now(),
  check (actor_user_id is not null or actor_service_account_id is not null)
);

create index if not exists enterprise_api_keys_lookup_idx on public.enterprise_api_keys (key_prefix, status, expires_at);
create index if not exists enterprise_webhook_due_idx on public.enterprise_webhook_deliveries (status, next_attempt_at) where status in ('pending','retryable');
create index if not exists enterprise_webhook_org_idx on public.enterprise_webhook_deliveries (organization_id, created_at desc);
create index if not exists enterprise_identity_org_idx on public.enterprise_identity_connections (organization_id, status);
create index if not exists enterprise_audit_chain_idx on public.enterprise_integration_audit_events (organization_id, created_at, id);

alter table public.enterprise_service_accounts enable row level security;
alter table public.enterprise_service_accounts force row level security;
alter table public.enterprise_api_keys enable row level security;
alter table public.enterprise_api_keys force row level security;
alter table public.enterprise_webhook_subscriptions enable row level security;
alter table public.enterprise_webhook_subscriptions force row level security;
alter table public.enterprise_webhook_deliveries enable row level security;
alter table public.enterprise_webhook_deliveries force row level security;
alter table public.enterprise_identity_connections enable row level security;
alter table public.enterprise_identity_connections force row level security;
alter table public.enterprise_scim_tokens enable row level security;
alter table public.enterprise_scim_tokens force row level security;
alter table public.enterprise_integration_audit_events enable row level security;
alter table public.enterprise_integration_audit_events force row level security;

create or replace function public.is_enterprise_integration_admin(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
      and coalesce(om.status, 'active') = 'active'
  );
$$;

revoke all on function public.is_enterprise_integration_admin(uuid) from public;
grant execute on function public.is_enterprise_integration_admin(uuid) to authenticated;

create policy enterprise_service_accounts_admin on public.enterprise_service_accounts for all to authenticated
using (public.is_enterprise_integration_admin(organization_id))
with check (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_api_keys_admin on public.enterprise_api_keys for all to authenticated
using (public.is_enterprise_integration_admin(organization_id))
with check (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_webhook_subscriptions_admin on public.enterprise_webhook_subscriptions for all to authenticated
using (public.is_enterprise_integration_admin(organization_id))
with check (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_webhook_deliveries_read on public.enterprise_webhook_deliveries for select to authenticated
using (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_identity_connections_admin on public.enterprise_identity_connections for all to authenticated
using (public.is_enterprise_integration_admin(organization_id))
with check (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_scim_tokens_admin on public.enterprise_scim_tokens for all to authenticated
using (public.is_enterprise_integration_admin(organization_id))
with check (public.is_enterprise_integration_admin(organization_id));
create policy enterprise_integration_audit_read on public.enterprise_integration_audit_events for select to authenticated
using (public.is_enterprise_integration_admin(organization_id));

revoke update, delete on public.enterprise_integration_audit_events from authenticated;

commit;