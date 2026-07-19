-- Prevent organization-scoped AI literacy records from referencing users
-- who are not members of the same organization.

create or replace function public.enforce_ai_literacy_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scoped_user_id uuid;
begin
  if tg_table_name = 'ai_literacy_programs' then
    scoped_user_id := new.owner_user_id;
  elsif tg_table_name = 'ai_literacy_assignments' then
    scoped_user_id := new.assignee_user_id;
  else
    raise exception 'unsupported_ai_literacy_member_scope_table'
      using errcode = 'check_violation';
  end if;

  if scoped_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = new.organization_id
      and membership.user_id = scoped_user_id
  ) then
    raise exception 'ai_literacy_user_not_organization_member'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_literacy_member_scope() from public;
revoke all on function public.enforce_ai_literacy_member_scope() from anon;
revoke all on function public.enforce_ai_literacy_member_scope() from authenticated;

drop trigger if exists enforce_ai_literacy_program_owner_scope
  on public.ai_literacy_programs;
create trigger enforce_ai_literacy_program_owner_scope
before insert or update of organization_id, owner_user_id
on public.ai_literacy_programs
for each row
execute function public.enforce_ai_literacy_member_scope();

drop trigger if exists enforce_ai_literacy_assignment_assignee_scope
  on public.ai_literacy_assignments;
create trigger enforce_ai_literacy_assignment_assignee_scope
before insert or update of organization_id, assignee_user_id
on public.ai_literacy_assignments
for each row
execute function public.enforce_ai_literacy_member_scope();
