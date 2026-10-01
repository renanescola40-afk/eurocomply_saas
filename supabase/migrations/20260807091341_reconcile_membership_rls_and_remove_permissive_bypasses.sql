-- Reconcile the deployed membership policy chain with the private-helper model.
--
-- The original backend-only migration predates moving SECURITY DEFINER helpers
-- into app_private. Replaying that historical migration on a partially migrated
-- environment would recreate privileged helpers in public. This repair is
-- idempotent and only rebuilds policies against the already-hardened private
-- helper, then removes the observed permissive bypass policies.
--
-- Applied to the linked production project before publication because the
-- permissive membership policies were confirmed live. No rows are modified.

begin;

alter table public.organization_members enable row level security;

drop policy if exists "Members can view memberships" on public.organization_members;
drop policy if exists "Members can manage memberships" on public.organization_members;
drop policy if exists "Users can manage memberships" on public.organization_members;
drop policy if exists "Organization members can view memberships" on public.organization_members;
drop policy if exists "Organization members can manage memberships" on public.organization_members;
drop policy if exists "Owners can manage memberships" on public.organization_members;
drop policy if exists "Admins can manage memberships" on public.organization_members;

drop policy if exists "rls_organization_members_select_member" on public.organization_members;
drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;
drop policy if exists "rls_organization_members_insert_backend_only" on public.organization_members;
drop policy if exists "rls_organization_members_update_backend_only" on public.organization_members;
drop policy if exists "rls_organization_members_delete_backend_only" on public.organization_members;

create policy "rls_organization_members_select_member"
  on public.organization_members
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

create policy "rls_organization_members_insert_backend_only"
  on public.organization_members
  for insert
  to authenticated
  with check (false);

create policy "rls_organization_members_update_backend_only"
  on public.organization_members
  for update
  to authenticated
  using (false)
  with check (false);

create policy "rls_organization_members_delete_backend_only"
  on public.organization_members
  for delete
  to authenticated
  using (false);

drop policy if exists "Users can insert their own memberships" on public.organization_members;
drop policy if exists "Admins can add members" on public.organization_members;
drop policy if exists "Admins can update members" on public.organization_members;
drop policy if exists "Admins can remove members" on public.organization_members;

drop policy if exists "Authenticated can insert audit logs" on public.audit_logs;
drop policy if exists "Authenticated can read audit logs" on public.audit_logs;
drop policy if exists "Authenticated can read compliance tasks" on public.compliance_tasks;
drop policy if exists "Authenticated can write compliance tasks" on public.compliance_tasks;
drop policy if exists "Authenticated can read documents" on public.documents;
drop policy if exists "Authenticated can write documents" on public.documents;
drop policy if exists "Authenticated can read risks" on public.risks;
drop policy if exists "Authenticated can write risks" on public.risks;
drop policy if exists "Authenticated can read vendors" on public.vendors;
drop policy if exists "Authenticated can write vendors" on public.vendors;
drop policy if exists "Authenticated can read subscriptions" on public.subscriptions;
drop policy if exists "Authenticated can write subscriptions" on public.subscriptions;

-- Fail closed on the membership policy chain this reconciliation owns directly.
-- Other table-specific canonical policy families are reconciled by their own
-- forward-only migrations; this historical migration only removes their legacy
-- permissive bypasses. Asserting future policy names here makes clean replay
-- impossible even though the final state remains fail-closed.
do $migration_guard$
declare
  required_policy record;
begin
  for required_policy in
    select *
    from (values
      ('organization_members', 'rls_organization_members_select_member'),
      ('organization_members', 'rls_organization_members_insert_backend_only'),
      ('organization_members', 'rls_organization_members_update_backend_only'),
      ('organization_members', 'rls_organization_members_delete_backend_only')
    ) as expected(table_name, policy_name)
  loop
    if not exists (
      select 1
      from pg_catalog.pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = required_policy.table_name
        and policy.policyname = required_policy.policy_name
    ) then
      raise exception 'Required tenant-safe RLS policy %.% is missing',
        required_policy.table_name, required_policy.policy_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'public'
      and (
        (policy.tablename = 'organization_members'
          and policy.policyname in (
            'Users can insert their own memberships',
            'Admins can add members',
            'Admins can update members',
            'Admins can remove members'
          ))
        or policy.policyname in (
          'Authenticated can insert audit logs',
          'Authenticated can read audit logs',
          'Authenticated can read compliance tasks',
          'Authenticated can write compliance tasks',
          'Authenticated can read documents',
          'Authenticated can write documents',
          'Authenticated can read risks',
          'Authenticated can write risks',
          'Authenticated can read vendors',
          'Authenticated can write vendors',
          'Authenticated can read subscriptions',
          'Authenticated can write subscriptions'
        )
      )
  ) then
    raise exception 'A permissive tenant RLS bypass policy remains after cleanup';
  end if;
end
$migration_guard$;

notify pgrst, 'reload schema';

commit;
