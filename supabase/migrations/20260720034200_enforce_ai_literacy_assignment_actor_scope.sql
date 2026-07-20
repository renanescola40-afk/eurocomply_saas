-- Enforce same-organization membership for user references on AI literacy
-- assignments while preserving email-only external assignments.

create or replace function public.enforce_ai_literacy_assignment_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_user_id is not null and not exists (
    select 1
    from public.organization_members as assignee_membership
    where assignee_membership.organization_id = new.organization_id
      and assignee_membership.user_id = new.assignee_user_id
  ) then
    raise exception 'ai_literacy_assignee_not_in_organization'
      using errcode = 'check_violation';
  end if;

  if new.assigned_by is not null and not exists (
    select 1
    from public.organization_members as assigner_membership
    where assigner_membership.organization_id = new.organization_id
      and assigner_membership.user_id = new.assigned_by
  ) then
    raise exception 'ai_literacy_assigner_not_in_organization'
      using errcode = 'check_violation';
  end if;

  if new.waiver_approved_by is not null and not exists (
    select 1
    from public.organization_members as approver_membership
    where approver_membership.organization_id = new.organization_id
      and approver_membership.user_id = new.waiver_approved_by
  ) then
    raise exception 'ai_literacy_waiver_approver_not_in_organization'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from public;
revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from anon;
revoke all on function public.enforce_ai_literacy_assignment_actor_scope() from authenticated;

drop trigger if exists enforce_ai_literacy_assignment_actor_scope
  on public.ai_literacy_assignments;
create trigger enforce_ai_literacy_assignment_actor_scope
before insert or update of organization_id, assignee_user_id, assigned_by, waiver_approved_by
on public.ai_literacy_assignments
for each row
execute function public.enforce_ai_literacy_assignment_actor_scope();
