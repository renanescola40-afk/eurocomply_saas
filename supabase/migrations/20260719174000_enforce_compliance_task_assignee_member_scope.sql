-- Prevent organization-scoped compliance tasks from being assigned to users
-- who are not members of the same organization.

create or replace function public.enforce_compliance_task_assignee_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_to is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.assigned_to
  ) then
    raise exception 'compliance_task_assignee_not_organization_member'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_compliance_task_assignee_member_scope() from public;
revoke all on function public.enforce_compliance_task_assignee_member_scope() from anon;
revoke all on function public.enforce_compliance_task_assignee_member_scope() from authenticated;

drop trigger if exists enforce_compliance_task_assignee_scope
  on public.compliance_tasks;
create trigger enforce_compliance_task_assignee_scope
before insert or update of organization_id, assigned_to
on public.compliance_tasks
for each row
execute function public.enforce_compliance_task_assignee_member_scope();
