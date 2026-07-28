-- Remove temporary/live validation policies and replace legacy permissive
-- authenticated policies with deterministic tenant isolation.
-- Idempotent and self-contained for production reconciliation.

begin;

-- Temporary live-validation policies must never remain in production.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'live_val_%'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

-- Writable tenant-scoped resources.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'compliance_tasks',
    'documents',
    'risks',
    'vendors'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    -- Remove legacy permissive and previously generated canonical policies.
    execute format('drop policy if exists %I on public.%I', 'Authenticated can read ' || replace(table_name, '_', ' '), table_name);
    execute format('drop policy if exists %I on public.%I', 'Authenticated can write ' || replace(table_name, '_', ' '), table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_select_member', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_writer', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_writer', table_name);
    execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_admin', table_name);

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
  end loop;
end
$$;

-- Backend-owned tenant-scoped resources: members may read their tenant only;
-- browser/authenticated clients may not mutate them.
do $$
declare
  table_name text;
  legacy_read_policy text;
  legacy_write_policy text;
begin
  foreach table_name in array array[
    'audit_logs',
    'compliance_metric_snapshots',
    'subscriptions'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    legacy_read_policy := case table_name
      when 'audit_logs' then 'Authenticated can read audit logs'
      when 'compliance_metric_snapshots' then 'Authenticated can read metric snapshots'
      when 'subscriptions' then 'Authenticated can read subscriptions'
    end;

    legacy_write_policy := case table_name
      when 'audit_logs' then 'Authenticated can insert audit logs'
      when 'subscriptions' then 'Authenticated can write subscriptions'
      else null
    end;

    execute format('drop policy if exists %I on public.%I', legacy_read_policy, table_name);
    if legacy_write_policy is not null then
      execute format('drop policy if exists %I on public.%I', legacy_write_policy, table_name);
    end if;

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

    execute format('revoke insert, update, delete on table public.%I from anon, authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
  end loop;
end
$$;

-- Global authorization catalogs remain authenticated-read-only.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['permissions', 'role_permissions']
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    policy_name := case table_name
      when 'permissions' then 'permissions_authenticated_read'
      else 'role_permissions_authenticated_read'
    end;

    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() is not null)',
      policy_name,
      table_name
    );

    execute format('revoke insert, update, delete on table public.%I from anon, authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
  end loop;
end
$$;

commit;
