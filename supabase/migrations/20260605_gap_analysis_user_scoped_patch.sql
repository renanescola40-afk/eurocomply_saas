-- EuroComply AI - User-scoped compatibility patch
-- Use this when workspaces/workspace_members are not available yet.
-- It keeps the product multi-tenant-safe by isolating records by auth.uid().

alter table public.gap_assessments
  alter column workspace_id drop not null;

alter table public.gap_answers
  alter column workspace_id drop not null;

alter table public.compliance_findings
  alter column workspace_id drop not null;

alter table public.compliance_tasks
  alter column workspace_id drop not null;

-- Remove workspace-member based policies if they exist.
drop policy if exists "workspace members can read gap assessments" on public.gap_assessments;
drop policy if exists "workspace members can insert gap assessments" on public.gap_assessments;
drop policy if exists "workspace members can update own gap assessments" on public.gap_assessments;
drop policy if exists "workspace members can read gap answers" on public.gap_answers;
drop policy if exists "workspace members can insert gap answers" on public.gap_answers;
drop policy if exists "workspace members can update gap answers" on public.gap_answers;
drop policy if exists "workspace members can read compliance findings" on public.compliance_findings;
drop policy if exists "workspace members can insert compliance findings" on public.compliance_findings;
drop policy if exists "workspace members can update compliance findings" on public.compliance_findings;
drop policy if exists "workspace members can read compliance tasks" on public.compliance_tasks;
drop policy if exists "workspace members can insert compliance tasks" on public.compliance_tasks;
drop policy if exists "workspace members can update compliance tasks" on public.compliance_tasks;

-- User-scoped policies for current MVP.
create policy if not exists "users can read own gap assessments"
  on public.gap_assessments for select
  using (user_id = auth.uid());

create policy if not exists "users can insert own gap assessments"
  on public.gap_assessments for insert
  with check (user_id = auth.uid());

create policy if not exists "users can update own gap assessments"
  on public.gap_assessments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "users can read own gap answers"
  on public.gap_answers for select
  using (
    exists (
      select 1 from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.user_id = auth.uid()
    )
  );

create policy if not exists "users can insert own gap answers"
  on public.gap_answers for insert
  with check (
    exists (
      select 1 from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.user_id = auth.uid()
    )
  );

create policy if not exists "users can update own gap answers"
  on public.gap_answers for update
  using (
    exists (
      select 1 from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.user_id = auth.uid()
    )
  );

create policy if not exists "users can read own compliance findings"
  on public.compliance_findings for select
  using (user_id = auth.uid());

create policy if not exists "users can insert own compliance findings"
  on public.compliance_findings for insert
  with check (user_id = auth.uid());

create policy if not exists "users can update own compliance findings"
  on public.compliance_findings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "users can read own compliance tasks"
  on public.compliance_tasks for select
  using (user_id = auth.uid());

create policy if not exists "users can insert own compliance tasks"
  on public.compliance_tasks for insert
  with check (user_id = auth.uid());

create policy if not exists "users can update own compliance tasks"
  on public.compliance_tasks for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
