-- Organization-scoped security settings that are only mutated by service-role APIs.
-- The write API requires RBAC plus enterprise step-up with action change_security_settings.

create table if not exists public.organization_security_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  require_step_up_for_critical_actions boolean not null default true,
  step_up_provider_mode text not null default 'supabase_mfa_or_enterprise_idp' check (step_up_provider_mode in ('supabase_mfa', 'enterprise_idp', 'supabase_mfa_or_enterprise_idp')),
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
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_organization_security_settings_updated_at on public.organization_security_settings;
create trigger trg_touch_organization_security_settings_updated_at
before update on public.organization_security_settings
for each row execute function public.touch_organization_security_settings_updated_at();

alter table public.organization_security_settings enable row level security;

drop policy if exists "organization_security_settings_client_select_deny" on public.organization_security_settings;
drop policy if exists "organization_security_settings_client_insert_deny" on public.organization_security_settings;
drop policy if exists "organization_security_settings_client_update_deny" on public.organization_security_settings;
drop policy if exists "organization_security_settings_client_delete_deny" on public.organization_security_settings;

create policy "organization_security_settings_client_select_deny" on public.organization_security_settings for select to authenticated using (false);
create policy "organization_security_settings_client_insert_deny" on public.organization_security_settings for insert to authenticated with check (false);
create policy "organization_security_settings_client_update_deny" on public.organization_security_settings for update to authenticated using (false) with check (false);
create policy "organization_security_settings_client_delete_deny" on public.organization_security_settings for delete to authenticated using (false);

revoke all on public.organization_security_settings from anon, authenticated;
grant all on public.organization_security_settings to service_role;
