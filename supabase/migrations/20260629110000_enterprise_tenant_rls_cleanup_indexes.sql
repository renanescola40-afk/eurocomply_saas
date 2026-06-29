-- Enterprise tenant RLS cleanup and performance indexes.
-- Idempotent, additive, and designed to remove stale permissive policies that
-- can remain effective through Postgres RLS OR semantics.

create extension if not exists pgcrypto;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
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
set search_path = public, pg_temp
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

create or replace function public.has_org_write_role(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.has_org_role(target_organization_id, array['owner','admin','editor']);
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
revoke all on function public.has_org_write_role(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.has_org_write_role(uuid) to authenticated;

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
    'Members can read invitations',
    'Managers can create invitations',
    'Managers can update invitations',
    'Managers can delete invitations',
    'Members can read organization invites',
    'Managers can create organization invites',
    'Managers can update organization invites',
    'Managers can delete organization invites',
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
    'Org managers can update activation tasks'
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

create or replace function public.app_rls_create_org_indexes(p_table_name text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  safe_table_name text := left(regexp_replace(p_table_name, '[^a-zA-Z0-9_]', '_', 'g'), 40);
begin
  if not public.app_rls_table_exists(p_table_name) or not public.app_rls_has_column(p_table_name, 'organization_id') then
    return;
  end if;

  execute format('create index if not exists %I on public.%I (organization_id)', safe_table_name || '_organization_id_idx', p_table_name);

  if public.app_rls_has_column(p_table_name, 'created_at') then
    execute format('create index if not exists %I on public.%I (organization_id, created_at desc)', safe_table_name || '_org_created_at_idx', p_table_name);
  end if;

  if public.app_rls_has_column(p_table_name, 'updated_at') then
    execute format('create index if not exists %I on public.%I (organization_id, updated_at desc)', safe_table_name || '_org_updated_at_idx', p_table_name);
  end if;

  if public.app_rls_has_column(p_table_name, 'status') then
    execute format('create index if not exists %I on public.%I (organization_id, status)', safe_table_name || '_org_status_idx', p_table_name);
  end if;

  if public.app_rls_has_column(p_table_name, 'user_id') then
    execute format('create index if not exists %I on public.%I (organization_id, user_id)', safe_table_name || '_org_user_id_idx', p_table_name);
  end if;
end;
$$;

-- Backend-owned tables: readable by org members where useful, never client-writable.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations'] loop
    perform public.app_rls_harden_backend_only_table(table_name);
  end loop;
end $$;

-- Onboarding activation stores tenant setup state and should be org-scoped with manager writes.
do $$
begin
  perform public.app_rls_harden_org_writable_table(
    'onboarding_activation_runs',
    'array[''owner'',''admin'',''compliance_manager'']'
  );
end $$;

-- The onboarding migration added extra compliance_tasks policies after the final lock. Remove them and rely on the strict writer-role policies.
do $$
begin
  if public.app_rls_table_exists('compliance_tasks') then
    perform public.app_rls_drop_known_policies('compliance_tasks', array[
      'Org members can read activation tasks',
      'Org managers can create activation tasks',
      'Org managers can update activation tasks'
    ]);
    execute 'alter table public.compliance_tasks enable row level security';
    execute 'alter table public.compliance_tasks force row level security';
  end if;
end $$;

-- Notifications are both user-scoped and org-scoped. Clients may mark their own notifications read,
-- but they must not be able to move a notification to another user or organization.
do $$
begin
  if public.app_rls_table_exists('notifications')
     and public.app_rls_has_column('notifications', 'organization_id')
     and public.app_rls_has_column('notifications', 'user_id') then
    alter table public.notifications enable row level security;
    alter table public.notifications force row level security;

    perform public.app_rls_drop_known_policies('notifications', array[
      'Users can read own notifications',
      'Users can update own notifications',
      'Organization members can read notifications',
      'Organization members can manage notifications',
      'rls_notifications_select_recipient',
      'rls_notifications_insert_backend_only',
      'rls_notifications_update_recipient',
      'rls_notifications_delete_recipient'
    ]);

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

    revoke insert on table public.notifications from anon, authenticated;
  end if;
end $$;

create or replace function public.prevent_client_notification_scope_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'authenticated'
     and (new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id) then
    raise exception 'notification scope cannot be changed by authenticated clients' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_client_notification_scope_change() from public;
grant execute on function public.prevent_client_notification_scope_change() to authenticated;

do $$
begin
  if public.app_rls_table_exists('notifications') then
    drop trigger if exists prevent_client_notification_scope_change on public.notifications;
    create trigger prevent_client_notification_scope_change
      before update on public.notifications
      for each row
      execute function public.prevent_client_notification_scope_change();
  end if;
end $$;

-- Organization-scoped indexes for isolation checks and common tenant dashboard queries.
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
    'audit_events',
    'audit_logs',
    'subscriptions',
    'organization_members',
    'organization_invites',
    'invitations',
    'notifications',
    'onboarding_activation_runs'
  ] loop
    perform public.app_rls_create_org_indexes(table_name);
  end loop;
end $$;

-- Keep organization membership lookups fast for security definer helpers.
do $$
begin
  if public.app_rls_table_exists('organization_members') then
    create index if not exists organization_members_org_user_role_idx
      on public.organization_members (organization_id, user_id, lower(role));
  end if;
end $$;

drop function if exists public.app_rls_create_org_indexes(text);
drop function if exists public.app_rls_harden_org_writable_table(text, text);
drop function if exists public.app_rls_harden_backend_only_table(text);
drop function if exists public.app_rls_drop_known_policies(text, text[]);
drop function if exists public.app_rls_has_column(text, text);
drop function if exists public.app_rls_table_exists(text);

notify pgrst, 'reload schema';
