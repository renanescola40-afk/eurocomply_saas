-- Keep backend-owned Supabase write paths on the server side.

do $$
begin
  if to_regclass('public.organizations') is not null then
    alter table public.organizations enable row level security;

    drop policy if exists "rls_organizations_insert_self" on public.organizations;
    drop policy if exists "rls_organizations_insert_backend_only" on public.organizations;

    create policy "rls_organizations_insert_backend_only"
      on public.organizations
      for insert
      to authenticated
      with check (false);
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['organization_invites', 'invitations'] loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_member', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_member', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_admin', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_backend_only', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_backend_only', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_backend_only', table_name);

    execute format('create policy %I on public.%I for insert to authenticated with check (false)', 'rls_' || table_name || '_insert_backend_only', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (false) with check (false)', 'rls_' || table_name || '_update_backend_only', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (false)', 'rls_' || table_name || '_delete_backend_only', table_name);
  end loop;
end $$;
