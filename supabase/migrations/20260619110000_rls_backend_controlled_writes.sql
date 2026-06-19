do $$
begin
  if to_regclass('public.organizations') is not null then
    alter table public.organizations enable row level security;
    drop policy if exists "rls_organizations_insert_self" on public.organizations;
    drop policy if exists "rls_organizations_insert_backend_only" on public.organizations;
    create policy "rls_organizations_insert_backend_only" on public.organizations
      for insert to authenticated
      with check (false);
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['invitations', 'organization_invites'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_select_member', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_insert_member', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_update_member', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_delete_admin', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_select_admin', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_insert_backend_only', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_update_backend_only', t);
      execute format('drop policy if exists %I on public.%I', 'rls_' || t || '_delete_backend_only', t);
      execute format('create policy %I on public.%I for select to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']))', 'rls_' || t || '_select_admin', t);
      execute format('create policy %I on public.%I for insert to authenticated with check (false)', 'rls_' || t || '_insert_backend_only', t);
      execute format('create policy %I on public.%I for update to authenticated using (false) with check (false)', 'rls_' || t || '_update_backend_only', t);
      execute format('create policy %I on public.%I for delete to authenticated using (false)', 'rls_' || t || '_delete_backend_only', t);
    end if;
  end loop;
end $$;
