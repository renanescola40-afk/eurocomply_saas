begin;

-- V29 bounded forward-only Enterprise Step-Up runtime reconciliation.
--
-- Production already has the hardened step_up_challenges store, but the
-- step_up_tokens and organization_security_settings runtime stores are absent.
-- This migration adds only those missing server-side persistence boundaries and
-- verifies the existing challenge-store boundary. It does not rewrite or repair
-- Supabase migration history and it does not broaden browser-role access.

do $v29_prerequisites$
declare
  challenge_rls boolean;
  challenge_force_rls boolean;
begin
  if to_regclass('public.organizations') is null then
    raise exception 'V29: organizations table is required';
  end if;

  if to_regclass('public.step_up_challenges') is null then
    raise exception 'V29: step_up_challenges runtime store is required';
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
    into challenge_rls, challenge_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'step_up_challenges';

  if challenge_rls is distinct from true or challenge_force_rls is distinct from true then
    raise exception 'V29: step_up_challenges must keep RLS and FORCE RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('anon', 'public.step_up_challenges', 'DELETE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'DELETE')
     or not has_table_privilege('service_role', 'public.step_up_challenges', 'SELECT')
     or not has_table_privilege('service_role', 'public.step_up_challenges', 'INSERT')
     or not has_table_privilege('service_role', 'public.step_up_challenges', 'UPDATE')
     or not has_table_privilege('service_role', 'public.step_up_challenges', 'DELETE') then
    raise exception 'V29: step_up_challenges privilege boundary drifted';
  end if;
end
$v29_prerequisites$;

create table if not exists public.step_up_tokens (
  nonce text primary key,
  token_hash text not null,
  user_id uuid not null,
  organization_id uuid not null,
  action text not null check (action in (
    'export_data',
    'manage_billing',
    'manage_team',
    'gdpr_delete',
    'audit_chain_verify',
    'audit_chain_export',
    'change_security_settings'
  )),
  verification_method text not null check (verification_method in ('supabase_mfa', 'enterprise_idp')),
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired')),
  issued_at timestamptz not null,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_up_tokens_short_lived check (expires_at <= verified_at + interval '5 minutes'),
  constraint step_up_tokens_not_preverified check (issued_at >= verified_at - interval '10 seconds'),
  constraint step_up_tokens_consumed_after_issue check (consumed_at is null or consumed_at >= issued_at),
  constraint step_up_tokens_revoked_after_issue check (revoked_at is null or revoked_at >= issued_at)
);

create unique index if not exists step_up_tokens_active_nonce_idx
  on public.step_up_tokens (nonce)
  where status = 'active' and consumed_at is null and revoked_at is null;

create index if not exists step_up_tokens_scope_idx
  on public.step_up_tokens (organization_id, user_id, action, expires_at desc);

create index if not exists step_up_tokens_expiry_idx
  on public.step_up_tokens (expires_at)
  where status = 'active';

create or replace function public.touch_step_up_tokens_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_step_up_tokens_updated_at() from public, anon, authenticated;
grant execute on function public.touch_step_up_tokens_updated_at() to service_role;

drop trigger if exists trg_touch_step_up_tokens_updated_at on public.step_up_tokens;
create trigger trg_touch_step_up_tokens_updated_at
before update on public.step_up_tokens
for each row execute function public.touch_step_up_tokens_updated_at();

alter table public.step_up_tokens enable row level security;
alter table public.step_up_tokens force row level security;
revoke all on public.step_up_tokens from public, anon, authenticated;
grant all on public.step_up_tokens to service_role;

create table if not exists public.organization_security_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  require_step_up_for_critical_actions boolean not null default true,
  step_up_provider_mode text not null default 'supabase_mfa_or_enterprise_idp'
    check (step_up_provider_mode in ('supabase_mfa', 'enterprise_idp', 'supabase_mfa_or_enterprise_idp')),
  allowed_idp_acr_values text[] not null default '{}'::text[],
  allowed_idp_amr_values text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_security_settings_idp_policy_required check (
    step_up_provider_mode <> 'enterprise_idp'
    or cardinality(allowed_idp_acr_values) > 0
    or cardinality(allowed_idp_amr_values) > 0
  )
);

create or replace function public.touch_organization_security_settings_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_organization_security_settings_updated_at() from public, anon, authenticated;
grant execute on function public.touch_organization_security_settings_updated_at() to service_role;

drop trigger if exists trg_touch_organization_security_settings_updated_at on public.organization_security_settings;
create trigger trg_touch_organization_security_settings_updated_at
before update on public.organization_security_settings
for each row execute function public.touch_organization_security_settings_updated_at();

alter table public.organization_security_settings enable row level security;
alter table public.organization_security_settings force row level security;
revoke all on public.organization_security_settings from public, anon, authenticated;
grant all on public.organization_security_settings to service_role;

do $v29_verify$
declare
  token_rls boolean;
  token_force_rls boolean;
  settings_rls boolean;
  settings_force_rls boolean;
  required_column text;
begin
  if to_regclass('public.step_up_tokens') is null
     or to_regclass('public.organization_security_settings') is null then
    raise exception 'V29: required Enterprise Step-Up runtime tables are missing';
  end if;

  foreach required_column in array array[
    'nonce', 'token_hash', 'user_id', 'organization_id', 'action',
    'verification_method', 'status', 'issued_at', 'verified_at', 'expires_at',
    'consumed_at', 'revoked_at', 'metadata', 'created_at', 'updated_at'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'step_up_tokens'
        and column_name = required_column
    ) then
      raise exception 'V29: step_up_tokens column % is missing', required_column;
    end if;
  end loop;

  foreach required_column in array array[
    'organization_id', 'require_step_up_for_critical_actions', 'step_up_provider_mode',
    'allowed_idp_acr_values', 'allowed_idp_amr_values', 'created_at', 'updated_at'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'organization_security_settings'
        and column_name = required_column
    ) then
      raise exception 'V29: organization_security_settings column % is missing', required_column;
    end if;
  end loop;

  if to_regclass('public.step_up_tokens_active_nonce_idx') is null
     or to_regclass('public.step_up_tokens_scope_idx') is null
     or to_regclass('public.step_up_tokens_expiry_idx') is null then
    raise exception 'V29: step_up_tokens indexes are missing';
  end if;

  if not exists (
       select 1 from pg_constraint
       where conname = 'step_up_tokens_short_lived'
         and conrelid = 'public.step_up_tokens'::regclass
     )
     or not exists (
       select 1 from pg_constraint
       where conname = 'organization_security_settings_idp_policy_required'
         and conrelid = 'public.organization_security_settings'::regclass
     ) then
    raise exception 'V29: Enterprise Step-Up validation constraints are missing';
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
    into token_rls, token_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'step_up_tokens';

  select c.relrowsecurity, c.relforcerowsecurity
    into settings_rls, settings_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'organization_security_settings';

  if token_rls is distinct from true or token_force_rls is distinct from true
     or settings_rls is distinct from true or settings_force_rls is distinct from true then
    raise exception 'V29: Enterprise Step-Up RLS/FORCE RLS boundary is not enforced';
  end if;

  if has_table_privilege('anon', 'public.step_up_tokens', 'SELECT')
     or has_table_privilege('anon', 'public.step_up_tokens', 'INSERT')
     or has_table_privilege('anon', 'public.step_up_tokens', 'UPDATE')
     or has_table_privilege('anon', 'public.step_up_tokens', 'DELETE')
     or has_table_privilege('authenticated', 'public.step_up_tokens', 'SELECT')
     or has_table_privilege('authenticated', 'public.step_up_tokens', 'INSERT')
     or has_table_privilege('authenticated', 'public.step_up_tokens', 'UPDATE')
     or has_table_privilege('authenticated', 'public.step_up_tokens', 'DELETE')
     or not has_table_privilege('service_role', 'public.step_up_tokens', 'SELECT')
     or not has_table_privilege('service_role', 'public.step_up_tokens', 'INSERT')
     or not has_table_privilege('service_role', 'public.step_up_tokens', 'UPDATE')
     or not has_table_privilege('service_role', 'public.step_up_tokens', 'DELETE') then
    raise exception 'V29: step_up_tokens privilege boundary drifted';
  end if;

  if has_table_privilege('anon', 'public.organization_security_settings', 'SELECT')
     or has_table_privilege('anon', 'public.organization_security_settings', 'INSERT')
     or has_table_privilege('anon', 'public.organization_security_settings', 'UPDATE')
     or has_table_privilege('anon', 'public.organization_security_settings', 'DELETE')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'SELECT')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'INSERT')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'UPDATE')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'DELETE')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'SELECT')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'INSERT')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'UPDATE')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'DELETE') then
    raise exception 'V29: organization_security_settings privilege boundary drifted';
  end if;

  if to_regprocedure('public.touch_step_up_tokens_updated_at()') is null
     or to_regprocedure('public.touch_organization_security_settings_updated_at()') is null then
    raise exception 'V29: hardened updated_at trigger functions are missing';
  end if;

  if exists (
       select 1 from pg_proc p
       where p.oid in (
         'public.touch_step_up_tokens_updated_at()'::regprocedure,
         'public.touch_organization_security_settings_updated_at()'::regprocedure
       )
       and not ('search_path=pg_catalog, public' = any(coalesce(p.proconfig, array[]::text[])))
     ) then
    raise exception 'V29: trigger-function search_path boundary drifted';
  end if;
end
$v29_verify$;

select pg_notify('pgrst', 'reload schema');

commit;
