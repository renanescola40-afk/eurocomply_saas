-- Prevent organization-scoped AI incidents from referencing AI systems
-- that belong to a different organization, including after system moves.

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

create or replace function public.prevent_referenced_ai_system_scope_move()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is not distinct from old.organization_id then
    return new;
  end if;

  if exists (
    select 1
    from public.ai_incidents incident
    where incident.ai_system_id = old.id
      and incident.organization_id is distinct from new.organization_id
  ) then
    raise exception 'referenced_ai_system_organization_change_forbidden'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_referenced_ai_system_scope_move() from public;
revoke all on function public.prevent_referenced_ai_system_scope_move() from anon;
revoke all on function public.prevent_referenced_ai_system_scope_move() from authenticated;

drop trigger if exists prevent_referenced_ai_system_scope_move
  on public.ai_systems;
create trigger prevent_referenced_ai_system_scope_move
before update of organization_id
on public.ai_systems
for each row
execute function public.prevent_referenced_ai_system_scope_move();