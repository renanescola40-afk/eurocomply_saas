begin;

-- Explicit, idempotent RLS coverage for billing tenant tables. These policies
-- keep reads organization-scoped and reserve writes for the privileged backend.
-- Dynamic SQL is used so legacy customer_add_ons installations are hardened
-- when present without breaking newer installations that only use
-- organization_add_ons.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customer_add_ons',
    'storage_usage',
    'billing_limits',
    'feature_flags'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

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
  end loop;
end
$$;

commit;
