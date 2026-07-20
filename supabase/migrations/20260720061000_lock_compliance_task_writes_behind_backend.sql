do $$
begin
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required table public.compliance_tasks is missing';
  end if;
end
$$;

alter table public.compliance_tasks enable row level security;
alter table public.compliance_tasks force row level security;

drop policy if exists "Managers can create compliance tasks" on public.compliance_tasks;
drop policy if exists "Managers can update compliance tasks" on public.compliance_tasks;

revoke insert, update, delete on table public.compliance_tasks from anon;
revoke insert, update, delete on table public.compliance_tasks from authenticated;

grant select on table public.compliance_tasks to authenticated;
grant select, insert, update, delete on table public.compliance_tasks to service_role;

create policy "deny_authenticated_compliance_task_insert"
on public.compliance_tasks
for insert
to authenticated
with check (false);

create policy "deny_authenticated_compliance_task_update"
on public.compliance_tasks
for update
to authenticated
using (false)
with check (false);

create policy "deny_authenticated_compliance_task_delete"
on public.compliance_tasks
for delete
to authenticated
using (false);
