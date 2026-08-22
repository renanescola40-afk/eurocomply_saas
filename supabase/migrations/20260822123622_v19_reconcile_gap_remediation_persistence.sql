begin;

-- Forward-only reconciliation for the unapplied 20260605 gap/remediation/evidence lineage.
--
-- The historical 20260605 duplicate-version files are preserved byte-for-byte and
-- remain excluded from migration-history repair. Production inspection on
-- 2026-08-16 proved that version 20260605 is not recorded in the migration ledger,
-- while the current application still reads/writes the tables reconciled here.
-- This migration materializes the required schema against the current organization
-- model without recreating the removed public.workspaces dependency.

create extension if not exists pgcrypto;

create table if not exists public.gap_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'EU AI Act Gap Analysis',
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  locale text not null default 'en',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gap_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.gap_assessments(id) on delete cascade,
  workspace_id uuid,
  question_id text not null,
  article text not null,
  category text not null,
  answer text not null check (answer in ('yes', 'partial', 'no')),
  score integer not null check (score in (0, 50, 100)),
  recommendation text,
  created_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create table if not exists public.compliance_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  assessment_id uuid references public.gap_assessments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  article text not null,
  title text not null,
  description text,
  recommendation text,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'accepted_risk')),
  source text not null default 'gap_analysis',
  due_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- public.compliance_tasks is already part of the canonical organization-scoped
-- schema. Add only the compatibility columns required by the current user-scoped
-- Gap Analysis flow. Organization policies remain intact and personal policies
-- below are explicitly restricted to organization_id IS NULL.
do $guard$
begin
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required canonical table public.compliance_tasks is missing';
  end if;
end
$guard$;

-- Historical replay can still materialize compliance_tasks with organization_id
-- NOT NULL even though the live canonical table is already nullable. Personal Gap
-- Analysis rows intentionally use organization_id = NULL and must be representable
-- before the dual-scope tenant constraint below is validated.
alter table public.compliance_tasks
  alter column organization_id drop not null;

alter table public.compliance_tasks
  add column if not exists workspace_id uuid,
  add column if not exists finding_id uuid references public.compliance_findings(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $scope_constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.compliance_tasks'::regclass
      and conname = 'compliance_tasks_requires_tenant_scope'
  ) then
    alter table public.compliance_tasks
      add constraint compliance_tasks_requires_tenant_scope
      check (organization_id is not null or user_id is not null) not valid;
  end if;
end
$scope_constraint$;

alter table public.compliance_tasks
  validate constraint compliance_tasks_requires_tenant_scope;

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete set null,
  task_id uuid references public.compliance_tasks(id) on delete set null,
  title text not null,
  description text,
  evidence_type text not null default 'document'
    check (evidence_type in ('policy', 'procedure', 'risk_assessment', 'training', 'vendor_review', 'technical_documentation', 'log', 'document', 'other')),
  status text not null default 'draft'
    check (status in ('draft', 'valid', 'needs_review', 'expired', 'archived')),
  article_refs text[] not null default '{}'::text[],
  owner_name text,
  file_name text,
  file_path text,
  file_mime_type text,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete set null,
  task_id uuid references public.compliance_tasks(id) on delete set null,
  article text,
  title text not null,
  description text,
  file_name text,
  file_path text,
  file_url text,
  file_type text,
  file_size bigint,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gap_assessments_user_created_idx
  on public.gap_assessments(user_id, created_at desc);
create index if not exists gap_answers_assessment_idx
  on public.gap_answers(assessment_id);
create index if not exists compliance_findings_user_status_idx
  on public.compliance_findings(user_id, status, severity, created_at desc);
create index if not exists compliance_findings_assessment_idx
  on public.compliance_findings(assessment_id);
create index if not exists compliance_tasks_personal_status_idx
  on public.compliance_tasks(user_id, status, priority, due_date)
  where organization_id is null and user_id is not null;
create index if not exists compliance_tasks_finding_idx
  on public.compliance_tasks(finding_id)
  where finding_id is not null;
create index if not exists evidence_items_user_status_idx
  on public.evidence_items(user_id, status, created_at desc);
create index if not exists evidence_items_finding_idx
  on public.evidence_items(finding_id) where finding_id is not null;
create index if not exists evidence_items_task_idx
  on public.evidence_items(task_id) where task_id is not null;
create index if not exists compliance_evidence_user_status_idx
  on public.compliance_evidence(user_id, status, created_at desc);
create index if not exists compliance_evidence_finding_idx
  on public.compliance_evidence(finding_id) where finding_id is not null;
create index if not exists compliance_evidence_task_idx
  on public.compliance_evidence(task_id) where task_id is not null;

alter table public.gap_assessments enable row level security;
alter table public.gap_assessments force row level security;
alter table public.gap_answers enable row level security;
alter table public.gap_answers force row level security;
alter table public.compliance_findings enable row level security;
alter table public.compliance_findings force row level security;
alter table public.compliance_tasks enable row level security;
alter table public.compliance_tasks force row level security;
alter table public.evidence_items enable row level security;
alter table public.evidence_items force row level security;
alter table public.compliance_evidence enable row level security;
alter table public.compliance_evidence force row level security;

revoke all on table public.gap_assessments from anon;
revoke all on table public.gap_answers from anon;
revoke all on table public.compliance_findings from anon;
revoke all on table public.evidence_items from anon;
revoke all on table public.compliance_evidence from anon;
revoke all on table public.compliance_tasks from anon;

grant select, insert, update on table public.gap_assessments to authenticated;
grant select, insert, update on table public.gap_answers to authenticated;
grant select, insert, update on table public.compliance_findings to authenticated;
grant select, insert, update, delete on table public.evidence_items to authenticated;
grant select, insert, update, delete on table public.compliance_evidence to authenticated;
grant select, insert, update, delete on table public.compliance_tasks to authenticated;

grant all on table public.gap_assessments to service_role;
grant all on table public.gap_answers to service_role;
grant all on table public.compliance_findings to service_role;
grant all on table public.evidence_items to service_role;
grant all on table public.compliance_evidence to service_role;

-- Remove only the legacy policy names for this historical feature set. The
-- canonical organization-scoped compliance_tasks policies are deliberately not
-- dropped or broadened.
drop policy if exists "workspace members can read gap assessments" on public.gap_assessments;
drop policy if exists "workspace members can insert gap assessments" on public.gap_assessments;
drop policy if exists "workspace members can update own gap assessments" on public.gap_assessments;
drop policy if exists "users can read own gap assessments" on public.gap_assessments;
drop policy if exists "users can insert own gap assessments" on public.gap_assessments;
drop policy if exists "users can update own gap assessments" on public.gap_assessments;

drop policy if exists "rls_gap_assessments_select_owner" on public.gap_assessments;
drop policy if exists "rls_gap_assessments_insert_owner" on public.gap_assessments;
drop policy if exists "rls_gap_assessments_update_owner" on public.gap_assessments;
create policy "rls_gap_assessments_select_owner"
  on public.gap_assessments for select to authenticated
  using (user_id = auth.uid());
create policy "rls_gap_assessments_insert_owner"
  on public.gap_assessments for insert to authenticated
  with check (user_id = auth.uid());
create policy "rls_gap_assessments_update_owner"
  on public.gap_assessments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "workspace members can read gap answers" on public.gap_answers;
drop policy if exists "workspace members can insert gap answers" on public.gap_answers;
drop policy if exists "workspace members can update gap answers" on public.gap_answers;
drop policy if exists "users can read own gap answers" on public.gap_answers;
drop policy if exists "users can insert own gap answers" on public.gap_answers;
drop policy if exists "users can update gap answers" on public.gap_answers;

drop policy if exists "rls_gap_answers_select_owner" on public.gap_answers;
drop policy if exists "rls_gap_answers_insert_owner" on public.gap_answers;
drop policy if exists "rls_gap_answers_update_owner" on public.gap_answers;
create policy "rls_gap_answers_select_owner"
  on public.gap_answers for select to authenticated
  using (exists (
    select 1 from public.gap_assessments ga
    where ga.id = gap_answers.assessment_id
      and ga.user_id = auth.uid()
  ));
create policy "rls_gap_answers_insert_owner"
  on public.gap_answers for insert to authenticated
  with check (exists (
    select 1 from public.gap_assessments ga
    where ga.id = gap_answers.assessment_id
      and ga.user_id = auth.uid()
      and gap_answers.workspace_id is not distinct from ga.workspace_id
  ));
create policy "rls_gap_answers_update_owner"
  on public.gap_answers for update to authenticated
  using (exists (
    select 1 from public.gap_assessments ga
    where ga.id = gap_answers.assessment_id
      and ga.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.gap_assessments ga
    where ga.id = gap_answers.assessment_id
      and ga.user_id = auth.uid()
      and gap_answers.workspace_id is not distinct from ga.workspace_id
  ));

drop policy if exists "workspace members can read compliance findings" on public.compliance_findings;
drop policy if exists "workspace members can insert compliance findings" on public.compliance_findings;
drop policy if exists "workspace members can update compliance findings" on public.compliance_findings;
drop policy if exists "users can read own compliance findings" on public.compliance_findings;
drop policy if exists "users can insert own compliance findings" on public.compliance_findings;
drop policy if exists "users can update compliance findings" on public.compliance_findings;

drop policy if exists "rls_compliance_findings_select_owner" on public.compliance_findings;
drop policy if exists "rls_compliance_findings_insert_owner" on public.compliance_findings;
drop policy if exists "rls_compliance_findings_update_owner" on public.compliance_findings;
create policy "rls_compliance_findings_select_owner"
  on public.compliance_findings for select to authenticated
  using (user_id = auth.uid());
create policy "rls_compliance_findings_insert_owner"
  on public.compliance_findings for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      assessment_id is null
      or exists (
        select 1 from public.gap_assessments ga
        where ga.id = compliance_findings.assessment_id
          and ga.user_id = auth.uid()
          and compliance_findings.workspace_id is not distinct from ga.workspace_id
      )
    )
  );
create policy "rls_compliance_findings_update_owner"
  on public.compliance_findings for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      assessment_id is null
      or exists (
        select 1 from public.gap_assessments ga
        where ga.id = compliance_findings.assessment_id
          and ga.user_id = auth.uid()
          and compliance_findings.workspace_id is not distinct from ga.workspace_id
      )
    )
  );

-- Personal compliance tasks are a separate scope from organization tasks. The
-- organization policies remain authoritative whenever organization_id is set.
drop policy if exists "users can read own compliance tasks" on public.compliance_tasks;
drop policy if exists "users can insert own compliance tasks" on public.compliance_tasks;
drop policy if exists "users can update own compliance tasks" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_select_personal" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_insert_personal" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_update_personal" on public.compliance_tasks;
create policy "rls_compliance_tasks_select_personal"
  on public.compliance_tasks for select to authenticated
  using (organization_id is null and user_id = auth.uid());
create policy "rls_compliance_tasks_insert_personal"
  on public.compliance_tasks for insert to authenticated
  with check (
    organization_id is null
    and user_id = auth.uid()
    and (
      finding_id is null
      or exists (
        select 1 from public.compliance_findings cf
        where cf.id = compliance_tasks.finding_id
          and cf.user_id = auth.uid()
      )
    )
  );
create policy "rls_compliance_tasks_update_personal"
  on public.compliance_tasks for update to authenticated
  using (organization_id is null and user_id = auth.uid())
  with check (
    organization_id is null
    and user_id = auth.uid()
    and (
      finding_id is null
      or exists (
        select 1 from public.compliance_findings cf
        where cf.id = compliance_tasks.finding_id
          and cf.user_id = auth.uid()
      )
    )
  );

drop policy if exists "users can read own evidence items" on public.evidence_items;
drop policy if exists "users can insert own evidence items" on public.evidence_items;
drop policy if exists "users can update own evidence items" on public.evidence_items;
drop policy if exists "users can delete own evidence items" on public.evidence_items;
drop policy if exists "rls_evidence_items_select_owner" on public.evidence_items;
drop policy if exists "rls_evidence_items_insert_owner" on public.evidence_items;
drop policy if exists "rls_evidence_items_update_owner" on public.evidence_items;
drop policy if exists "rls_evidence_items_delete_owner" on public.evidence_items;
create policy "rls_evidence_items_select_owner"
  on public.evidence_items for select to authenticated
  using (user_id = auth.uid());
create policy "rls_evidence_items_insert_owner"
  on public.evidence_items for insert to authenticated
  with check (
    user_id = auth.uid()
    and (finding_id is null or exists (
      select 1 from public.compliance_findings cf
      where cf.id = evidence_items.finding_id and cf.user_id = auth.uid()
    ))
    and (task_id is null or exists (
      select 1 from public.compliance_tasks ct
      where ct.id = evidence_items.task_id
        and (
          (ct.organization_id is null and ct.user_id = auth.uid())
          or (ct.organization_id is not null and app_private.is_org_member(ct.organization_id))
        )
    ))
  );
create policy "rls_evidence_items_update_owner"
  on public.evidence_items for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (finding_id is null or exists (
      select 1 from public.compliance_findings cf
      where cf.id = evidence_items.finding_id and cf.user_id = auth.uid()
    ))
    and (task_id is null or exists (
      select 1 from public.compliance_tasks ct
      where ct.id = evidence_items.task_id
        and (
          (ct.organization_id is null and ct.user_id = auth.uid())
          or (ct.organization_id is not null and app_private.is_org_member(ct.organization_id))
        )
    ))
  );
create policy "rls_evidence_items_delete_owner"
  on public.evidence_items for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can read own compliance evidence" on public.compliance_evidence;
drop policy if exists "users can insert own compliance evidence" on public.compliance_evidence;
drop policy if exists "users can update own compliance evidence" on public.compliance_evidence;
drop policy if exists "users can delete own compliance evidence" on public.compliance_evidence;
drop policy if exists "rls_compliance_evidence_select_owner" on public.compliance_evidence;
drop policy if exists "rls_compliance_evidence_insert_owner" on public.compliance_evidence;
drop policy if exists "rls_compliance_evidence_update_owner" on public.compliance_evidence;
drop policy if exists "rls_compliance_evidence_delete_owner" on public.compliance_evidence;
create policy "rls_compliance_evidence_select_owner"
  on public.compliance_evidence for select to authenticated
  using (user_id = auth.uid());
create policy "rls_compliance_evidence_insert_owner"
  on public.compliance_evidence for insert to authenticated
  with check (
    user_id = auth.uid()
    and (finding_id is null or exists (
      select 1 from public.compliance_findings cf
      where cf.id = compliance_evidence.finding_id and cf.user_id = auth.uid()
    ))
    and (task_id is null or exists (
      select 1 from public.compliance_tasks ct
      where ct.id = compliance_evidence.task_id
        and (
          (ct.organization_id is null and ct.user_id = auth.uid())
          or (ct.organization_id is not null and app_private.is_org_member(ct.organization_id))
        )
    ))
  );
create policy "rls_compliance_evidence_update_owner"
  on public.compliance_evidence for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (finding_id is null or exists (
      select 1 from public.compliance_findings cf
      where cf.id = compliance_evidence.finding_id and cf.user_id = auth.uid()
    ))
    and (task_id is null or exists (
      select 1 from public.compliance_tasks ct
      where ct.id = compliance_evidence.task_id
        and (
          (ct.organization_id is null and ct.user_id = auth.uid())
          or (ct.organization_id is not null and app_private.is_org_member(ct.organization_id))
        )
    ))
  );
create policy "rls_compliance_evidence_delete_owner"
  on public.compliance_evidence for delete to authenticated
  using (user_id = auth.uid());

-- Private object storage for compliance evidence. Ownership is encoded as the
-- first path segment: <auth.uid()>/...
do $storage_guard$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase storage schema is required for compliance evidence reconciliation';
  end if;
end
$storage_guard$;

insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists "users can upload own compliance evidence files" on storage.objects;
drop policy if exists "users can read own compliance evidence files" on storage.objects;
drop policy if exists "users can update own compliance evidence files" on storage.objects;
drop policy if exists "users can delete own compliance evidence files" on storage.objects;
drop policy if exists "rls_compliance_evidence_objects_insert_owner" on storage.objects;
drop policy if exists "rls_compliance_evidence_objects_select_owner" on storage.objects;
drop policy if exists "rls_compliance_evidence_objects_update_owner" on storage.objects;
drop policy if exists "rls_compliance_evidence_objects_delete_owner" on storage.objects;

create policy "rls_compliance_evidence_objects_insert_owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "rls_compliance_evidence_objects_select_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "rls_compliance_evidence_objects_update_owner"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "rls_compliance_evidence_objects_delete_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Fail closed if the required schema or RLS posture is incomplete.
do $reconciliation_guard$
declare
  required_table text;
  required_column text;
begin
  foreach required_table in array array[
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'compliance_tasks',
    'evidence_items',
    'compliance_evidence'
  ]
  loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'required reconciled table public.% is missing', required_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = required_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'required RLS/FORCE RLS posture is missing on public.%', required_table;
    end if;
  end loop;

  foreach required_column in array array['workspace_id','finding_id','user_id','owner_id','completed_at','metadata']
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'compliance_tasks'
        and column_name = required_column
    ) then
      raise exception 'required compliance_tasks compatibility column % is missing', required_column;
    end if;
  end loop;

  if exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid in (
      'public.gap_assessments'::regclass,
      'public.gap_answers'::regclass,
      'public.compliance_findings'::regclass,
      'public.compliance_tasks'::regclass,
      'public.evidence_items'::regclass,
      'public.compliance_evidence'::regclass
    )
      and c.contype = 'f'
      and a.attname = 'workspace_id'
  ) then
    raise exception 'legacy workspace_id foreign key was recreated unexpectedly';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'compliance-evidence' and public = false
  ) then
    raise exception 'private compliance-evidence storage bucket is missing';
  end if;
end
$reconciliation_guard$;

notify pgrst, 'reload schema';

commit;