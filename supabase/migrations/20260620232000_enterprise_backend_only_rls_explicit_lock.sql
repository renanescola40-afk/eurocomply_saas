-- Enterprise backend-only RLS explicit lock.
-- Keeps static RLS evidence deterministic by applying backend-only helper calls per table.

create or replace function public.app_rls_backend_only_enterprise_explicit(table_name text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', table_name)) is null then
    return;
  end if;

  execute format('alter table public.%I enable row level security', table_name);

  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_insert_backend_only', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_update_backend_only', table_name);
  execute format('drop policy if exists %I on public.%I', 'rls_' || table_name || '_delete_backend_only', table_name);

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
  perform public.app_rls_backend_only_enterprise_explicit('audit_events');
  perform public.app_rls_backend_only_enterprise_explicit('subscriptions');
  perform public.app_rls_backend_only_enterprise_explicit('audit_logs');
  perform public.app_rls_backend_only_enterprise_explicit('organization_invites');
  perform public.app_rls_backend_only_enterprise_explicit('invitations');
end $$;

drop function if exists public.app_rls_backend_only_enterprise_explicit(text);
