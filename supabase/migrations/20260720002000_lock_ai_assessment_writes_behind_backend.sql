-- Keep AI assessment mutations behind reviewed server-side boundaries.
-- Authenticated users retain tenant-scoped reads, while browser/PostgREST DML is
-- denied even when an older permissive policy or grant exists in a prior migration.

do $$
begin
  if to_regclass('public.ai_assessments') is null then
    raise exception 'required table public.ai_assessments is missing';
  end if;
end
$$;

alter table public.ai_assessments enable row level security;
alter table public.ai_assessments force row level security;

-- Remove every known authenticated write policy from the historical schema.
drop policy if exists "Workspace managers can manage ai assessments" on public.ai_assessments;
drop policy if exists "Managers can create ai assessments" on public.ai_assessments;
drop policy if exists "Managers can update ai assessments" on public.ai_assessments;
drop policy if exists "Managers can delete ai assessments" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_insert_writer" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_update_writer" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_delete_admin" on public.ai_assessments;

-- Privileges and policies both fail closed for direct client mutation attempts.
revoke insert, update, delete on table public.ai_assessments from anon;
revoke insert, update, delete on table public.ai_assessments from authenticated;
grant select on table public.ai_assessments to authenticated;
grant select, insert, update, delete on table public.ai_assessments to service_role;

create policy "deny_authenticated_ai_assessment_insert"
  on public.ai_assessments
  for insert
  to authenticated
  with check (false);

create policy "deny_authenticated_ai_assessment_update"
  on public.ai_assessments
  for update
  to authenticated
  using (false)
  with check (false);

create policy "deny_authenticated_ai_assessment_delete"
  on public.ai_assessments
  for delete
  to authenticated
  using (false);

notify pgrst, 'reload schema';
