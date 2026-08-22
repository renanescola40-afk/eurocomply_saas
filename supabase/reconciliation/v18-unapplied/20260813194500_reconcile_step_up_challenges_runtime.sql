begin;

-- Forward-only reconciliation for the runtime store used by
-- src/server/security/step-up-provider.ts. The historical 20260623120000
-- migration shares a duplicate version and is therefore not used as the
-- production execution identity.
create extension if not exists pgcrypto;

create table if not exists public.step_up_challenges (
  nonce text primary key,
  nonce_hash text not null unique,
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
  provider text not null check (provider in ('supabase_mfa', 'enterprise_idp')),
  status text not null default 'active' check (status in ('active', 'verified', 'revoked', 'expired')),
  provider_challenge_id text,
  provider_factor_id text,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_up_challenges_short_lived check (expires_at <= issued_at + interval '2 minutes'),
  constraint step_up_challenges_consumed_after_issue check (consumed_at is null or consumed_at >= issued_at)
);

create unique index if not exists step_up_challenges_active_nonce_hash_idx
  on public.step_up_challenges (nonce_hash)
  where status = 'active' and consumed_at is null;

create index if not exists step_up_challenges_scope_idx
  on public.step_up_challenges (organization_id, user_id, action, expires_at desc);

create index if not exists step_up_challenges_expiry_idx
  on public.step_up_challenges (expires_at)
  where status = 'active';

create or replace function public.touch_step_up_challenges_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_step_up_challenges_updated_at() from public;
revoke all on function public.touch_step_up_challenges_updated_at() from anon;
revoke all on function public.touch_step_up_challenges_updated_at() from authenticated;
grant execute on function public.touch_step_up_challenges_updated_at() to service_role;

drop trigger if exists trg_touch_step_up_challenges_updated_at on public.step_up_challenges;
create trigger trg_touch_step_up_challenges_updated_at
before update on public.step_up_challenges
for each row execute function public.touch_step_up_challenges_updated_at();

alter table public.step_up_challenges enable row level security;
alter table public.step_up_challenges force row level security;

-- The store is backend-only. Browser roles do not need table privileges or RLS
-- policies because every challenge mutation is performed through the admin
-- client after authenticated request/organization/permission checks.
revoke all on table public.step_up_challenges from public;
revoke all on table public.step_up_challenges from anon;
revoke all on table public.step_up_challenges from authenticated;
grant all on table public.step_up_challenges to service_role;

-- Remove the historical explicit browser-deny policies if the duplicate-version
-- migration was applied in a non-production environment. ACL denial remains the
-- authoritative boundary and avoids retaining redundant policy surface.
drop policy if exists "step_up_challenges_client_select_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_insert_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_update_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_delete_deny" on public.step_up_challenges;

do $verify$
declare
  trigger_function_oid oid := to_regprocedure('public.touch_step_up_challenges_updated_at()');
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'step_up_challenges'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'step_up_challenges must have RLS and FORCE RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('anon', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('anon', 'public.step_up_challenges', 'DELETE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'SELECT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'INSERT')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'UPDATE')
     or has_table_privilege('authenticated', 'public.step_up_challenges', 'DELETE') then
    raise exception 'browser roles unexpectedly retain step_up_challenges privileges';
  end if;

  if not has_table_privilege('service_role', 'public.step_up_challenges', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'service_role lacks required step_up_challenges privileges';
  end if;

  if trigger_function_oid is null then
    raise exception 'step_up challenge trigger function is missing';
  end if;

  if has_function_privilege('anon', trigger_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', trigger_function_oid, 'EXECUTE') then
    raise exception 'browser roles unexpectedly retain trigger function execution';
  end if;

  if not has_function_privilege('service_role', trigger_function_oid, 'EXECUTE') then
    raise exception 'service_role lacks trigger function execution';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = trigger_function_oid
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'step_up challenge trigger function search_path is not fixed';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'step_up_challenges'
      and indexname = 'step_up_challenges_scope_idx'
  ) then
    raise exception 'step_up challenge scope index is missing';
  end if;
end
$verify$;

commit;
