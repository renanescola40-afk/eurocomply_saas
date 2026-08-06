-- Remove legacy permissive policies that are OR-combined with the current
-- tenant-scoped policies and therefore bypass organization isolation.
--
-- This migration is intentionally subtractive. It does not replace or broaden
-- access. It fails closed unless the expected tenant-safe policies already
-- exist, preventing an accidental lockout on an incomplete migration chain.

begin;

-- Membership writes are backend-only in the canonical policy model. These
-- legacy permissive policies otherwise remain OR-combined with the explicit
-- backend-only policies and allow direct authenticated mutations.
drop policy if exists "Users can insert their own memberships"
  on public.organization_members;
drop policy if exists "Admins can add members"
  on public.organization_members;
drop policy if exists "Admins can update members"
  on public.organization_members;
drop policy if exists "Admins can remove members"
  on public.organization_members;

-- Global authenticated read/write policies left over from the original schema.
drop policy if exists "Authenticated can insert audit logs"
  on public.audit_logs;
drop policy if exists "Authenticated can read audit logs"
  on public.audit_logs;

drop policy if exists "Authenticated can read compliance tasks"
  on public.compliance_tasks;
drop policy if exists "Authenticated can write compliance tasks"
  on public.compliance_tasks;

drop policy if exists "Authenticated can read documents"
  on public.documents;
drop policy if exists "Authenticated can write documents"
  on public.documents;

drop policy if exists "Authenticated can read risks"
  on public.risks;
drop policy if exists "Authenticated can write risks"
  on public.risks;

drop policy if exists "Authenticated can read vendors"
  on public.vendors;
drop policy if exists "Authenticated can write vendors"
  on public.vendors;

drop policy if exists "Authenticated can read subscriptions"
  on public.subscriptions;
drop policy if exists "Authenticated can write subscriptions"
  on public.subscriptions;

-- Fail closed if the tenant-safe policy chain is not present. Policy names are
-- checked together with their table so similarly named policies cannot satisfy
-- the guard accidentally.
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
      ('organization_members', 'rls_organization_members_delete_backend_only'),
      ('audit_logs', 'rls_audit_logs_select_member'),
      ('audit_logs', 'rls_audit_logs_insert_backend_only'),
      ('compliance_tasks', 'rls_compliance_tasks_select_member'),
      ('compliance_tasks', 'rls_compliance_tasks_insert_writer'),
      ('compliance_tasks', 'rls_compliance_tasks_update_writer'),
      ('compliance_tasks', 'rls_compliance_tasks_delete_admin'),
      ('documents', 'rls_documents_select_member'),
      ('documents', 'rls_documents_insert_writer'),
      ('documents', 'rls_documents_update_writer'),
      ('documents', 'rls_documents_delete_admin'),
      ('risks', 'rls_risks_select_member'),
      ('risks', 'rls_risks_insert_writer'),
      ('risks', 'rls_risks_update_writer'),
      ('risks', 'rls_risks_delete_admin'),
      ('vendors', 'rls_vendors_select_member'),
      ('vendors', 'rls_vendors_insert_writer'),
      ('vendors', 'rls_vendors_update_writer'),
      ('vendors', 'rls_vendors_delete_admin'),
      ('subscriptions', 'rls_subscriptions_select_member'),
      ('subscriptions', 'rls_subscriptions_insert_backend_only'),
      ('subscriptions', 'rls_subscriptions_update_backend_only'),
      ('subscriptions', 'rls_subscriptions_delete_backend_only')
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
        required_policy.table_name,
        required_policy.policy_name;
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

commit;
