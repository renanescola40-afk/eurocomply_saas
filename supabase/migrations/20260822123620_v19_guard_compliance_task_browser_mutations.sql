begin;

-- Transitional fail-closed guard for the multi-migration Gap Analysis
-- reconciliation. Supabase may commit each migration independently, so the
-- following RESTRICTIVE policies must exist before the compatibility migration
-- temporarily grants authenticated DML. They ensure a partial rollout can never
-- reopen organization-scoped browser mutations.

do $guard$
begin
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required canonical table public.compliance_tasks is missing';
  end if;
end
$guard$;

alter table public.compliance_tasks enable row level security;
alter table public.compliance_tasks force row level security;

drop policy if exists "restrict_authenticated_compliance_task_insert_during_reconciliation" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_update_during_reconciliation" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_delete_during_reconciliation" on public.compliance_tasks;

create policy "restrict_authenticated_compliance_task_insert_during_reconciliation"
  on public.compliance_tasks
  as restrictive
  for insert
  to authenticated
  with check (false);

create policy "restrict_authenticated_compliance_task_update_during_reconciliation"
  on public.compliance_tasks
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

create policy "restrict_authenticated_compliance_task_delete_during_reconciliation"
  on public.compliance_tasks
  as restrictive
  for delete
  to authenticated
  using (false);

-- Verify the rollout guard before allowing the next migration to execute.
do $verify$
declare
  restrictive_guard_count integer;
begin
  select count(*)
    into restrictive_guard_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_tasks'
    and policyname in (
      'restrict_authenticated_compliance_task_insert_during_reconciliation',
      'restrict_authenticated_compliance_task_update_during_reconciliation',
      'restrict_authenticated_compliance_task_delete_during_reconciliation'
    )
    and permissive = 'RESTRICTIVE'
    and roles = array['authenticated']::name[];

  if restrictive_guard_count <> 3 then
    raise exception 'authenticated compliance_tasks reconciliation guard is incomplete';
  end if;
end
$verify$;

commit;