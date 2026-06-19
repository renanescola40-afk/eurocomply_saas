-- Runtime persistence for enterprise step-up tokens.
-- Tokens remain HMAC signed, but the nonce is stored server-side and consumed once.

create extension if not exists pgcrypto;

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
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_step_up_tokens_updated_at on public.step_up_tokens;
create trigger trg_touch_step_up_tokens_updated_at
before update on public.step_up_tokens
for each row execute function public.touch_step_up_tokens_updated_at();

alter table public.step_up_tokens enable row level security;

drop policy if exists "step_up_tokens_client_select_deny" on public.step_up_tokens;
drop policy if exists "step_up_tokens_client_insert_deny" on public.step_up_tokens;
drop policy if exists "step_up_tokens_client_update_deny" on public.step_up_tokens;
drop policy if exists "step_up_tokens_client_delete_deny" on public.step_up_tokens;

create policy "step_up_tokens_client_select_deny" on public.step_up_tokens for select to authenticated using (false);
create policy "step_up_tokens_client_insert_deny" on public.step_up_tokens for insert to authenticated with check (false);
create policy "step_up_tokens_client_update_deny" on public.step_up_tokens for update to authenticated using (false) with check (false);
create policy "step_up_tokens_client_delete_deny" on public.step_up_tokens for delete to authenticated using (false);

revoke all on public.step_up_tokens from anon, authenticated;
grant all on public.step_up_tokens to service_role;
