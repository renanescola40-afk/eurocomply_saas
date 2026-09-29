-- Preserve the exact OR semantics of the two permissive SELECT policies while removing duplicate policy evaluation.
drop policy if exists rls_compliance_tasks_select_member on public.compliance_tasks;
drop policy if exists rls_compliance_tasks_select_personal on public.compliance_tasks;
create policy rls_compliance_tasks_select_scope on public.compliance_tasks
  for select to authenticated
  using (
    app_private.is_org_member(organization_id)
    or ((organization_id is null) and (user_id = (select auth.uid())))
  );
