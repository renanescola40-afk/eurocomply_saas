-- Minimal live RLS policy patch required by the Supabase Live RLS Validation workflow.
-- This keeps the live proof focused on the validator's reviewed tables instead of
-- replaying all historical application migrations into the target project.
-- Helper functions use v2 names so repeated live runs do not need to mutate
-- existing helper function parameter names in the target database.

create or replace function public.live_rls_validation_has_column_v2(target_table_name text, target_column_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = target_table_name
      and c.column_name = target_column_name
  );
$$;

create or replace function public.live_rls_validation_is_org_member_v2(target_organization_id uuid)
returns boolean
language sql
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

create or replace function public.live_rls_validation_apply_org_scoped_v2(target_table_name text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', target_table_name)) is null
     or not public.live_rls_validation_has_column_v2(target_table_name, 'organization_id') then
    return;
  end if;

  execute format('alter table public.%I enable row level security', target_table_name);

  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_insert_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_update_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_delete_member', target_table_name);

  execute format('create policy %I on public.%I for select to authenticated using (public.live_rls_validation_is_org_member_v2(organization_id))', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.live_rls_validation_is_org_member_v2(organization_id))', 'live_rls_' || target_table_name || '_insert_member', target_table_name);
  execute format('create policy %I on public.%I for update to authenticated using (public.live_rls_validation_is_org_member_v2(organization_id)) with check (public.live_rls_validation_is_org_member_v2(organization_id))', 'live_rls_' || target_table_name || '_update_member', target_table_name);
  execute format('create policy %I on public.%I for delete to authenticated using (public.live_rls_validation_is_org_member_v2(organization_id))', 'live_rls_' || target_table_name || '_delete_member', target_table_name);
end;
$$;

create or replace function public.live_rls_validation_apply_backend_only_v2(target_table_name text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', target_table_name)) is null
     or not public.live_rls_validation_has_column_v2(target_table_name, 'organization_id') then
    return;
  end if;

  execute format('alter table public.%I enable row level security', target_table_name);

  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_insert_deny', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_update_deny', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_delete_deny', target_table_name);

  execute format('create policy %I on public.%I for select to authenticated using (public.live_rls_validation_is_org_member_v2(organization_id))', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('create policy %I on public.%I for insert to authenticated with check (false)', 'live_rls_' || target_table_name || '_insert_deny', target_table_name);
  execute format('create policy %I on public.%I for update to authenticated using (false) with check (false)', 'live_rls_' || target_table_name || '_update_deny', target_table_name);
  execute format('create policy %I on public.%I for delete to authenticated using (false)', 'live_rls_' || target_table_name || '_delete_deny', target_table_name);
end;
$$;

select public.live_rls_validation_apply_backend_only_v2('audit_events');
select public.live_rls_validation_apply_org_scoped_v2('tasks');
select public.live_rls_validation_apply_org_scoped_v2('notifications');

notify pgrst, 'reload schema';
