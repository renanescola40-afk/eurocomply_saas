-- Supabase production/staging RLS proof hardening.
-- Self-contained and idempotent: creates missing evidence tables and hardens the
-- requested customer tables without exposing service-role or tenant data.

create extension if not exists pgcrypto;

create table if not exists public.monitoring_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  regulatory_change_alerts boolean not null default true,
  monthly_review_reminders boolean not null default true,
  low_score_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table if exists public.monitoring_preferences
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email text,
  add column if not exists regulatory_change_alerts boolean not null default true,
  add column if not exists monthly_review_reminders boolean not null default true,
  add column if not exists low_score_alerts boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.regulatory_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  severity text,
  source_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.regulatory_updates
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists severity text,
  add column if not exists source_url text,
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.app_rls_table_exists(p_table_name text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select to_regclass(format('public.%I', p_table_name)) is not null;
$$;

create or replace function public.app_rls_has_column(p_table_name text, p_column_name text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = p_column_name
  );
$$;

create or replace function public.app_rls_drop_known_policies(p_table_name text, p_policy_names text[])
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  p_policy_name text;
begin
  if not public.app_rls_table_exists(p_table_name) then
    return;
  end if;

  foreach p_policy_name in array p_policy_names loop
    execute format('drop policy if exists %I on public.%I', p_policy_name, p_table_name);
  end loop;
end;
$$;

create or replace function public.app_rls_harden_org_writable_table(p_table_name text, p_manager_roles_sql text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.app_rls_table_exists(p_table_name) or not public.app_rls_has_column(p_table_name, 'organization_id') then
    return;
  end if;

  execute format('alter table public.%I enable row level security', p_table_name);
  execute format('alter table public.%I force row level security', p_table_name);

  perform public.app_rls_drop_known_policies(p_table_name, array[
    'rls_' || p_table_name || '_select_member',
    'rls_' || p_table_name || '_insert_member',
    'rls_' || p_table_name || '_insert_writer',
    'rls_' || p_table_name || '_insert_admin',
    'rls_' || p_table_name || '_update_member',
    'rls_' || p_table_name || '_update_writer',
    'rls_' || p_table_name || '_update_admin',
    'rls_' || p_table_name || '_delete_member',
    'rls_' || p_table_name || '_delete_writer',
    'rls_' || p_table_name || '_delete_admin',
    'Members can read onboarding activation runs',
    'Managers can create onboarding activation runs',
    'Managers can update onboarding activation runs',
    'Managers can delete onboarding activation runs',
    'Org members can read activation tasks',
    'Org managers can create activation tasks',
    'Org managers can update activation tasks',
    'Members can read documents',
    'Managers can create documents',
    'Managers can update documents',
    'Members can read risks',
    'Managers can manage risks',
    'Members can read vendors',
    'Managers can manage vendors',
    'Members can read compliance tasks',
    'Managers can create compliance tasks',
    'Managers can update compliance tasks'
  ]);

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
    'rls_' || p_table_name || '_select_member',
    p_table_name
  );

  execute format(
    'create policy %I on public.%I for insert to authenticated with check (public.has_org_role(organization_id, %s))',
    'rls_' || p_table_name || '_insert_writer',
    p_table_name,
    p_manager_roles_sql
  );

  execute format(
    'create policy %I on public.%I for update to authenticated using (public.has_org_role(organization_id, %s)) with check (public.has_org_role(organization_id, %s))',
    'rls_' || p_table_name || '_update_writer',
    p_table_name,
    p_manager_roles_sql,
    p_manager_roles_sql
  );

  execute format(
    'create policy %I on public.%I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']))',
    'rls_' || p_table_name || '_delete_admin',
    p_table_name
  );
end;
$$;

create or replace function public.app_rls_harden_backend_only_table(p_table_name text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.app_rls_table_exists(p_table_name) or not public.app_rls_has_column(p_table_name, 'organization_id') then
    return;
  end if;

  execute format('alter table public.%I enable row level security', p_table_name);
  execute format('alter table public.%I force row level security', p_table_name);

  perform public.app_rls_drop_known_policies(p_table_name, array[
    'Admins can manage invitations',
    'rls_' || p_table_name || '_select_member',
    'rls_' || p_table_name || '_insert_member',
    'rls_' || p_table_name || '_insert_writer',
    'rls_' || p_table_name || '_insert_admin',
    'rls_' || p_table_name || '_insert_backend_only',
    'rls_' || p_table_name || '_update_member',
    'rls_' || p_table_name || '_update_writer',
    'rls_' || p_table_name || '_update_admin',
    'rls_' || p_table_name || '_update_backend_only',
    'rls_' || p_table_name || '_delete_member',
    'rls_' || p_table_name || '_delete_writer',
    'rls_' || p_table_name || '_delete_admin',
    'rls_' || p_table_name || '_delete_backend_only',
    'Members can read subscriptions',
    'Managers can manage subscriptions',
    'Members can read audit logs',
    'Managers can manage audit logs'
  ]);

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
    'rls_' || p_table_name || '_select_member',
    p_table_name
  );

  execute format(
    'create policy %I on public.%I for insert to authenticated with check (false)',
    'rls_' || p_table_name || '_insert_backend_only',
    p_table_name
  );

  execute format(
    'create policy %I on public.%I for update to authenticated using (false) with check (false)',
    'rls_' || p_table_name || '_update_backend_only',
    p_table_name
  );

  execute format(
    'create policy %I on public.%I for delete to authenticated using (false)',
    'rls_' || p_table_name || '_delete_backend_only',
    p_table_name
  );

  execute format('revoke insert, update, delete on table public.%I from anon, authenticated', p_table_name);
  execute format('grant select on table public.%I to authenticated', p_table_name);
end;
$$;

create or replace function public.app_rls_harden_monitoring_preferences()
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.app_rls_table_exists('monitoring_preferences') then
    return;
  end if;

  alter table public.monitoring_preferences enable row level security;
  alter table public.monitoring_preferences force row level security;

  perform public.app_rls_drop_known_policies('monitoring_preferences', array[
    'Users can read own monitoring preferences',
    'Users can manage own monitoring preferences',
    'Workspace members can read monitoring preferences',
    'Workspace members can manage monitoring preferences',
    'rls_monitoring_preferences_select_member_or_owner',
    'rls_monitoring_preferences_insert_self_or_admin',
    'rls_monitoring_preferences_update_self_or_admin',
    'rls_monitoring_preferences_delete_self_or_admin'
  ]);

  create policy "rls_monitoring_preferences_select_member_or_owner"
    on public.monitoring_preferences
    for select
    to authenticated
    using (public.is_org_member(organization_id));

  create policy "rls_monitoring_preferences_insert_self_or_admin"
    on public.monitoring_preferences
    for insert
    to authenticated
    with check (
      public.is_org_member(organization_id)
      and (
        public.current_app_user_matches(user_id)
        or public.has_org_role(organization_id, array['owner','admin'])
      )
    );

  create policy "rls_monitoring_preferences_update_self_or_admin"
    on public.monitoring_preferences
    for update
    to authenticated
    using (
      public.is_org_member(organization_id)
      and (
        public.current_app_user_matches(user_id)
        or public.has_org_role(organization_id, array['owner','admin'])
      )
    )
    with check (
      public.is_org_member(organization_id)
      and (
        public.current_app_user_matches(user_id)
        or public.has_org_role(organization_id, array['owner','admin'])
      )
    );

  create policy "rls_monitoring_preferences_delete_self_or_admin"
    on public.monitoring_preferences
    for delete
    to authenticated
    using (
      public.is_org_member(organization_id)
      and (
        public.current_app_user_matches(user_id)
        or public.has_org_role(organization_id, array['owner','admin'])
      )
    );
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_systems',
    'compliance_tasks',
    'documents',
    'risks',
    'vendors',
    'onboarding_activation_runs'
  ] loop
    perform public.app_rls_harden_org_writable_table(
      table_name,
      'array[''owner'',''admin'',''editor'',''compliance_manager'']'
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['subscriptions', 'audit_logs', 'invitations'] loop
    perform public.app_rls_harden_backend_only_table(table_name);
  end loop;
end $$;

select public.app_rls_harden_monitoring_preferences();

do $$
begin
  if public.app_rls_table_exists('regulatory_updates') then
    alter table public.regulatory_updates enable row level security;
    alter table public.regulatory_updates force row level security;

    perform public.app_rls_drop_known_policies('regulatory_updates', array[
      'Authenticated users can read regulatory updates',
      'Regulatory updates are backend writable only',
      'rls_regulatory_updates_select_authenticated',
      'rls_regulatory_updates_insert_backend_only',
      'rls_regulatory_updates_update_backend_only',
      'rls_regulatory_updates_delete_backend_only'
    ]);

    create policy "rls_regulatory_updates_select_authenticated"
      on public.regulatory_updates
      for select
      to authenticated
      using (auth.uid() is not null);

    create policy "rls_regulatory_updates_insert_backend_only"
      on public.regulatory_updates
      for insert
      to authenticated
      with check (false);

    create policy "rls_regulatory_updates_update_backend_only"
      on public.regulatory_updates
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_regulatory_updates_delete_backend_only"
      on public.regulatory_updates
      for delete
      to authenticated
      using (false);

    revoke insert, update, delete on table public.regulatory_updates from anon, authenticated;
    grant select on table public.regulatory_updates to authenticated;
  end if;
end $$;

create index if not exists monitoring_preferences_org_user_idx
  on public.monitoring_preferences(organization_id, user_id);

create index if not exists regulatory_updates_published_at_idx
  on public.regulatory_updates(published_at desc);

create index if not exists regulatory_updates_severity_published_idx
  on public.regulatory_updates(severity, published_at desc);

drop function if exists public.app_rls_harden_monitoring_preferences();
drop function if exists public.app_rls_harden_backend_only_table(text);
drop function if exists public.app_rls_harden_org_writable_table(text, text);
drop function if exists public.app_rls_drop_known_policies(text, text[]);
drop function if exists public.app_rls_has_column(text, text);
drop function if exists public.app_rls_table_exists(text);

notify pgrst, 'reload schema';
