begin;

create or replace function app_private.enforce_compliance_tasks_reference_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.finding_id is not null and not exists (
    select 1
    from public.compliance_findings finding
    where finding.id = new.finding_id
      and (
        (
          new.organization_id is not null
          and finding.organization_id is not distinct from new.organization_id
        )
        or
        (
          new.organization_id is null
          and new.user_id is not null
          and finding.user_id = new.user_id
        )
      )
  ) then
    raise exception 'cross_tenant_reference: compliance_tasks.finding_id'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function app_private.enforce_compliance_tasks_reference_integrity()
  from public, anon, authenticated;
grant execute on function app_private.enforce_compliance_tasks_reference_integrity()
  to service_role;

drop trigger if exists enforce_compliance_tasks_same_tenant_reference
  on public.compliance_tasks;

create trigger enforce_compliance_tasks_same_tenant_reference
before insert or update of organization_id, user_id, finding_id
on public.compliance_tasks
for each row
execute function app_private.enforce_compliance_tasks_reference_integrity();

notify pgrst, 'reload schema';

commit;
