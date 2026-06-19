-- Complete multi-tenant RLS policy coverage for EuroComply.
-- This migration is intentionally idempotent and table-aware: optional tables are
-- hardened when present, and absent tables are skipped without failing deploys.

create extension if not exists pgcrypto;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
    );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
        and lower(om.role) = any(allowed_roles)
    );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

create or replace function public.app_rls_enable(table_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', table_name)) is not null then
    execute format('alter table public.%I enable row level security', table_name);
  end if;
end;
$$;

create or replace function public.app_rls_drop_policy(table_name text, policy_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', table_name)) is not null then
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
  end if;
end;
$$;

create or replace function public.app_rls_exec_if_table(table_name text, sql_template text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', table_name)) is not null then
    execute format(sql_template, table_name);
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.organizations') is not null then
    alter table public.organizations enable row level security;
    drop policy if exists "rls_organizations_select_member" on public.organizations;
    drop policy if exists "rls_organizations_insert_self" on public.organizations;
    drop policy if exists "rls_organizations_update_admin" on public.organizations;
    drop policy if exists "rls_organizations_delete_owner" on public.organizations;
    create policy "rls_organizations_select_member" on public.organizations for select to authenticated using (public.is_org_member(id));
    create policy "rls_organizations_insert_self" on public.organizations for insert to authenticated with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));
    create policy "rls_organizations_update_admin" on public.organizations for update to authenticated using (public.has_org_role(id, array['owner','admin'])) with check (public.has_org_role(id, array['owner','admin']));
    create policy "rls_organizations_delete_owner" on public.organizations for delete to authenticated using (public.has_org_role(id, array['owner']));
  end if;

  if to_regclass('public.organization_members') is not null then
    alter table public.organization_members enable row level security;
    drop policy if exists "Members can view memberships" on public.organization_members;
    drop policy if exists "rls_organization_members_select_member" on public.organization_members;
    drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
    drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
    drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;
    create policy "rls_organization_members_select_member" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
    create policy "rls_organization_members_insert_admin" on public.organization_members for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin']));
    create policy "rls_organization_members_update_admin" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['owner','admin'])) with check (public.has_org_role(organization_id, array['owner','admin']));
    create policy "rls_organization_members_delete_admin" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']));
  end if;

  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    drop policy if exists "rls_profiles_select_self" on public.profiles;
    drop policy if exists "rls_profiles_insert_self" on public.profiles;
    drop policy if exists "rls_profiles_update_self" on public.profiles;
    create policy "rls_profiles_select_self" on public.profiles for select to authenticated using (id = auth.uid() or user_id = auth.uid());
    create policy "rls_profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid() or user_id = auth.uid());
    create policy "rls_profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid() or user_id = auth.uid()) with check (id = auth.uid() or user_id = auth.uid());
  end if;
end $$;

-- Generic tenant-owned tables: members can read; admins/members can mutate only rows in their own organization.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'documents',
    'risks',
    'vendors',
    'tasks',
    'compliance_tasks',
    'ai_systems',
    'ai_incidents',
    'organization_invites',
    'invitations'
  ] loop
    perform public.app_rls_enable(table_name);
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_select_member');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_insert_member');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_update_member');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_delete_admin');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_select_member" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_insert_member" on public.%1$I for insert to authenticated with check (public.is_org_member(organization_id))');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_update_member" on public.%1$I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_delete_admin" on public.%1$I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']))');
  end loop;
end $$;

-- Audit and subscription tables are tenant-readable but client-append/mutation is denied.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['audit_events', 'audit_logs', 'subscriptions'] loop
    perform public.app_rls_enable(table_name);
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_select_member');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_insert_backend_only');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_update_backend_only');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_delete_backend_only');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_select_member" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_insert_backend_only" on public.%1$I for insert to authenticated with check (false)');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_update_backend_only" on public.%1$I for update to authenticated using (false) with check (false)');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_delete_backend_only" on public.%1$I for delete to authenticated using (false)');
  end loop;
end $$;

-- Notifications must match both tenant and recipient user for reads/mutations.
do $$
begin
  if to_regclass('public.notifications') is not null then
    alter table public.notifications enable row level security;
    drop policy if exists "rls_notifications_select_recipient" on public.notifications;
    drop policy if exists "rls_notifications_insert_backend_only" on public.notifications;
    drop policy if exists "rls_notifications_update_recipient" on public.notifications;
    drop policy if exists "rls_notifications_delete_recipient" on public.notifications;
    create policy "rls_notifications_select_recipient" on public.notifications for select to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id));
    create policy "rls_notifications_insert_backend_only" on public.notifications for insert to authenticated with check (false);
    create policy "rls_notifications_update_recipient" on public.notifications for update to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id)) with check (user_id = auth.uid() and public.is_org_member(organization_id));
    create policy "rls_notifications_delete_recipient" on public.notifications for delete to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id));
  end if;
end $$;

-- Administrative/background tables must not be client-accessible.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'webhook_events',
    'stripe_webhook_events',
    'billing_webhook_events',
    'security_events',
    'system_jobs',
    'maintenance_jobs',
    'rate_limits'
  ] loop
    perform public.app_rls_enable(table_name);
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_client_read_deny');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_client_insert_deny');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_client_update_deny');
    perform public.app_rls_drop_policy(table_name, 'rls_' || table_name || '_client_delete_deny');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_client_read_deny" on public.%1$I for select to authenticated using (false)');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_client_insert_deny" on public.%1$I for insert to authenticated with check (false)');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_client_update_deny" on public.%1$I for update to authenticated using (false) with check (false)');
    perform public.app_rls_exec_if_table(table_name, 'create policy "rls_%1$I_client_delete_deny" on public.%1$I for delete to authenticated using (false)');
  end loop;
end $$;

drop function if exists public.app_rls_enable(text);
drop function if exists public.app_rls_drop_policy(text, text);
drop function if exists public.app_rls_exec_if_table(text, text);
