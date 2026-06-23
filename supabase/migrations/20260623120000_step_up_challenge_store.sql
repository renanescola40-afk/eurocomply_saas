-- Runtime persistence for enterprise step-up MFA/IdP challenges.
-- HMAC step-up tokens are only created after these provider challenges verify successfully.

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
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_step_up_challenges_updated_at on public.step_up_challenges;
create trigger trg_touch_step_up_challenges_updated_at
before update on public.step_up_challenges
for each row execute function public.touch_step_up_challenges_updated_at();

alter table public.step_up_challenges enable row level security;

drop policy if exists "step_up_challenges_client_select_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_insert_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_update_deny" on public.step_up_challenges;
drop policy if exists "step_up_challenges_client_delete_deny" on public.step_up_challenges;

create policy "step_up_challenges_client_select_deny" on public.step_up_challenges for select to authenticated using (false);
create policy "step_up_challenges_client_insert_deny" on public.step_up_challenges for insert to authenticated with check (false);
create policy "step_up_challenges_client_update_deny" on public.step_up_challenges for update to authenticated using (false) with check (false);
create policy "step_up_challenges_client_delete_deny" on public.step_up_challenges for delete to authenticated using (false);

revoke all on public.step_up_challenges from anon, authenticated;
grant all on public.step_up_challenges to service_role;
