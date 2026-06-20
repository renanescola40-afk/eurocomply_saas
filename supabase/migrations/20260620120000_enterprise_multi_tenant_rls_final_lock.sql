-- Enterprise multi-tenant RLS final lock.
-- Proves tenant isolation with strict table-aware policies for the live A/B validator.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.has_org_write_role(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner','admin','editor']);
$$;

revoke all on function public.has_org_write_role(uuid) from public;
grant execute on function public.has_org_write_role(uuid) to authenticated;

create or replace function public.app_rls_org_scoped_enterprise(table_name text)
returns void
language plpgsql
set search_path = public
as $$
declare
  legacy_policy_name text;
begin
  if to_regclass(format('public.%I', table_name)) is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = app_rls_org_scoped_enterprise.table_name
      and column_name = 'organization_id'
  ) then
    return;
  end if;

  execute format('alter table public.%I enable row level security', table_name);

  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_select_member', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_member', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_writer', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_member', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_writer', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_admin', table_name);

  foreach legacy_policy_name in array array[
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
  ] loop
    execute format('drop policy if exists %I on public.%I', legacy_policy_name, table_name);
  end loop;

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
    'rls_' || table_name || '_select_member',
    table_name
  );
  execute format(
    'create policy %I on public.%I for insert to authenticated with check (public.has_org_write_role(organization_id))',
    'rls_' || table_name || '_insert_writer',
    table_name
  );
  execute format(
    'create policy %I on public.%I for update to authenticated using (public.has_org_write_role(organization_id)) with check (public.has_org_write_role(organization_id))',
    'rls_' || table_name || '_update_writer',
    table_name
  );
  execute format(
    'create policy %I on public.%I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']))',
    'rls_' || table_name || '_delete_admin',
    table_name
  );
end;
$$;

create or replace function public.app_rls_backend_only_enterprise(table_name text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', table_name)) is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = app_rls_backend_only_enterprise.table_name
      and column_name = 'organization_id'
  ) then
    return;
  end if;

  execute format('alter table public.%I enable row level security', table_name);

  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_select_member', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_backend_only', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_backend_only', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_backend_only', table_name);

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
    'rls_' || table_name || '_select_member',
    table_name
  );
  execute format(
    'create policy %I on public.%I for insert to authenticated with check (false)',
    'rls_' || table_name || '_insert_backend_only',
    table_name
  );
  execute format(
    'create policy %I on public.%I for update to authenticated using (false) with check (false)',
    'rls_' || table_name || '_update_backend_only',
    table_name
  );
  execute format(
    'create policy %I on public.%I for delete to authenticated using (false)',
    'rls_' || table_name || '_delete_backend_only',
    table_name
  );
end;
$$;

do $$
begin
  if to_regclass('public.organizations') is not null then
    alter table public.organizations enable row level security;
    drop policy if exists "rls_organizations_select_member" on public.organizations;
    drop policy if exists "rls_organizations_insert_self" on public.organizations;
    drop policy if exists "rls_organizations_insert_backend_only" on public.organizations;
    drop policy if exists "rls_organizations_update_admin" on public.organizations;
    drop policy if exists "rls_organizations_delete_owner" on public.organizations;

    create policy "rls_organizations_select_member"
      on public.organizations
      for select
      to authenticated
      using (public.is_org_member(id));

    create policy "rls_organizations_insert_backend_only"
      on public.organizations
      for insert
      to authenticated
      with check (false);

    create policy "rls_organizations_update_admin"
      on public.organizations
      for update
      to authenticated
      using (public.has_org_role(id, array['owner','admin']))
      with check (public.has_org_role(id, array['owner','admin']));

    create policy "rls_organizations_delete_owner"
      on public.organizations
      for delete
      to authenticated
      using (public.has_org_role(id, array['owner']));
  end if;

  if to_regclass('public.organization_members') is not null then
    alter table public.organization_members enable row level security;
    drop policy if exists "Members can view memberships" on public.organization_members;
    drop policy if exists "rls_organization_members_select_member" on public.organization_members;
    drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
    drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
    drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;

    create policy "rls_organization_members_select_member"
      on public.organization_members
      for select
      to authenticated
      using (public.is_org_member(organization_id));

    create policy "rls_organization_members_insert_admin"
      on public.organization_members
      for insert
      to authenticated
      with check (public.has_org_role(organization_id, array['owner','admin']));

    create policy "rls_organization_members_update_admin"
      on public.organization_members
      for update
      to authenticated
      using (public.has_org_role(organization_id, array['owner','admin']))
      with check (public.has_org_role(organization_id, array['owner','admin']));

    create policy "rls_organization_members_delete_admin"
      on public.organization_members
      for delete
      to authenticated
      using (public.has_org_role(organization_id, array['owner','admin']));
  end if;
end $$;

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
    'ai_incidents'
  ] loop
    perform public.app_rls_org_scoped_enterprise(table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations'] loop
    perform public.app_rls_backend_only_enterprise(table_name);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.notifications') is not null then
    alter table public.notifications enable row level security;
    drop policy if exists "Users can read own notifications" on public.notifications;
    drop policy if exists "Users can update own notifications" on public.notifications;
    drop policy if exists "Organization members can read notifications" on public.notifications;
    drop policy if exists "Organization members can manage notifications" on public.notifications;
    drop policy if exists "rls_notifications_select_recipient" on public.notifications;
    drop policy if exists "rls_notifications_insert_backend_only" on public.notifications;
    drop policy if exists "rls_notifications_update_recipient" on public.notifications;
    drop policy if exists "rls_notifications_delete_recipient" on public.notifications;

    create policy "rls_notifications_select_recipient"
      on public.notifications
      for select
      to authenticated
      using (user_id = auth.uid() and public.is_org_member(organization_id));

    create policy "rls_notifications_insert_backend_only"
      on public.notifications
      for insert
      to authenticated
      with check (false);

    create policy "rls_notifications_update_recipient"
      on public.notifications
      for update
      to authenticated
      using (user_id = auth.uid() and public.is_org_member(organization_id))
      with check (user_id = auth.uid() and public.is_org_member(organization_id));

    create policy "rls_notifications_delete_recipient"
      on public.notifications
      for delete
      to authenticated
      using (user_id = auth.uid() and public.is_org_member(organization_id));
  end if;
end $$;

drop function if exists public.app_rls_backend_only_enterprise(text);
drop function if exists public.app_rls_org_scoped_enterprise(text);
