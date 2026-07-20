-- Enforce tenant-consistent actor attribution for AI incidents.
-- Prospective only: existing rows are not rewritten or asserted as production-clean.

create or replace function public.enforce_ai_incident_creator_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  if new.organization_id is null or not exists (
    select 1
      from public.organization_members as membership
     where membership.organization_id = new.organization_id
       and membership.user_id = new.created_by
  ) then
    raise exception using
      errcode = '23514',
      message = 'AI incident creator must belong to the incident organization';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_incident_creator_member_scope() from public;
revoke all on function public.enforce_ai_incident_creator_member_scope() from anon;
revoke all on function public.enforce_ai_incident_creator_member_scope() from authenticated;

drop trigger if exists enforce_ai_incident_creator_member_scope on public.ai_incidents;

create trigger enforce_ai_incident_creator_member_scope
before insert or update of organization_id, created_by
on public.ai_incidents
for each row
execute function public.enforce_ai_incident_creator_member_scope();

notify pgrst, 'reload schema';
