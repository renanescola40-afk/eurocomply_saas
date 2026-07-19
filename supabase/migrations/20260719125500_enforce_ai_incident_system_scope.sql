-- Prevent organization-scoped AI incidents from referencing AI systems
-- that belong to a different organization.

create or replace function public.enforce_ai_incident_system_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ai_system_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.ai_systems system
    where system.id = new.ai_system_id
      and system.organization_id = new.organization_id
  ) then
    raise exception 'ai_incident_system_not_in_organization'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_incident_system_scope() from public;
revoke all on function public.enforce_ai_incident_system_scope() from anon;
revoke all on function public.enforce_ai_incident_system_scope() from authenticated;

drop trigger if exists enforce_ai_incident_system_scope
  on public.ai_incidents;
create trigger enforce_ai_incident_system_scope
before insert or update of organization_id, ai_system_id
on public.ai_incidents
for each row
execute function public.enforce_ai_incident_system_scope();
