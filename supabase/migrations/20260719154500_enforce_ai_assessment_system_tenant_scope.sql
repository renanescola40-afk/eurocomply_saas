-- Enforce that an organization-scoped AI assessment can only reference an
-- AI system owned by the same organization.

create or replace function public.enforce_ai_assessment_system_tenant_scope()
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
    from public.ai_systems as scoped_system
    where scoped_system.id = new.ai_system_id
      and scoped_system.organization_id = new.organization_id
  ) then
    raise exception 'ai_assessment_system_not_in_organization'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_assessment_system_tenant_scope() from public;
revoke all on function public.enforce_ai_assessment_system_tenant_scope() from anon;
revoke all on function public.enforce_ai_assessment_system_tenant_scope() from authenticated;

drop trigger if exists enforce_ai_assessment_system_tenant_scope on public.ai_assessments;
create trigger enforce_ai_assessment_system_tenant_scope
before insert or update of organization_id, ai_system_id
on public.ai_assessments
for each row
execute function public.enforce_ai_assessment_system_tenant_scope();
