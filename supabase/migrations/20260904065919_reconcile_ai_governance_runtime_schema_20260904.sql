begin;

-- Reconcile audit_log writer contract used by the current server runtime.
alter table public.audit_logs add column if not exists actor_user_id uuid;
update public.audit_logs
set actor_user_id = coalesce(actor_user_id, actor_id, user_id)
where actor_user_id is null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.audit_logs'::regclass
      and conname = 'audit_logs_actor_user_id_fkey'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_actor_user_id_fkey
      foreign key (actor_user_id) references auth.users(id) on delete set null not valid;
  end if;
end $$;

-- Current AI inventory read/write contract.
alter table public.ai_systems
  add column if not exists category text,
  add column if not exists country_market text,
  add column if not exists processed_data text,
  add column if not exists model_name text,
  add column if not exists last_reassessed_at timestamptz;

create index if not exists ai_systems_country_market_idx on public.ai_systems(organization_id, country_market);
create index if not exists ai_systems_category_idx on public.ai_systems(organization_id, category);
create index if not exists ai_systems_last_reassessed_idx on public.ai_systems(organization_id, last_reassessed_at desc);
update public.ai_systems
set last_reassessed_at = coalesce(last_reassessed_at, updated_at, created_at)
where last_reassessed_at is null;

create table if not exists public.ai_system_history (
  id uuid primary key default gen_random_uuid(),
  ai_system_id uuid not null references public.ai_systems(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created','reassessed')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_system_history_system_idx on public.ai_system_history(ai_system_id, created_at desc);
create index if not exists ai_system_history_org_idx on public.ai_system_history(organization_id, created_at desc);
alter table public.ai_system_history enable row level security;
alter table public.ai_system_history force row level security;
drop policy if exists rls_ai_system_history_select_member on public.ai_system_history;
create policy rls_ai_system_history_select_member on public.ai_system_history
for select to authenticated using (app_private.is_org_member(organization_id));
revoke insert, update, delete on public.ai_system_history from anon, authenticated;
grant select on public.ai_system_history to authenticated;
grant select, insert, update, delete on public.ai_system_history to service_role;

-- Article 4 AI Literacy runtime tables. Browser writes remain fail-closed.
create table if not exists public.ai_literacy_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text,
  article_reference text not null default 'Article 4',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  owner_user_id uuid references auth.users(id) on delete set null,
  review_due_at timestamptz,
  activated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create table if not exists public.ai_literacy_courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  title text not null check (char_length(title) between 3 and 180),
  description text,
  version text not null check (char_length(version) between 1 and 40),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  audience_roles text[] not null default '{}'::text[],
  risk_levels text[] not null default '{}'::text[],
  departments text[] not null default '{}'::text[],
  modules jsonb not null default '[]'::jsonb check (jsonb_typeof(modules)='array'),
  passing_score integer check (passing_score between 0 and 100),
  validity_days integer check (validity_days is null or validity_days between 1 and 3650),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, program_id, title, version),
  constraint ai_literacy_courses_program_org_fk foreign key (program_id, organization_id)
    references public.ai_literacy_programs(id, organization_id) on delete cascade
);
create table if not exists public.ai_literacy_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_email text,
  assignee_type text not null default 'employee' check (assignee_type in ('employee','contractor','other')),
  role_title text,
  department text,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','expired','waived','revoked')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  score integer check (score between 0 and 100),
  acknowledgement boolean not null default false,
  valid_until timestamptz,
  waiver_rationale text,
  waiver_approved_by uuid references auth.users(id) on delete set null,
  waiver_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint ai_literacy_assignments_course_org_fk foreign key (course_id, organization_id)
    references public.ai_literacy_courses(id, organization_id) on delete cascade,
  constraint ai_literacy_assignment_assignee_required check (assignee_user_id is not null or nullif(btrim(assignee_email),'') is not null),
  constraint ai_literacy_assignment_completion_consistent check (status <> 'completed' or (completed_at is not null and acknowledgement=true)),
  constraint ai_literacy_assignment_waiver_consistent check (status <> 'waived' or (nullif(btrim(waiver_rationale),'') is not null and waiver_approved_by is not null and waiver_approved_at is not null))
);
create table if not exists public.ai_literacy_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  evidence_type text not null check (evidence_type in ('completion_record','assessment_result','attendance','acknowledgement','certificate','other')),
  title text not null check (char_length(title) between 3 and 180),
  storage_path text,
  external_url text,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text,
  issued_at timestamptz,
  valid_until timestamptz,
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','expired','superseded')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint ai_literacy_evidence_assignment_org_fk foreign key (assignment_id, organization_id)
    references public.ai_literacy_assignments(id, organization_id) on delete cascade,
  constraint ai_literacy_evidence_location_required check (nullif(btrim(storage_path),'') is not null or nullif(btrim(external_url),'') is not null),
  constraint ai_literacy_evidence_review_consistent check (status not in ('approved','rejected') or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists ai_literacy_programs_org_status_idx on public.ai_literacy_programs(organization_id,status,review_due_at);
create index if not exists ai_literacy_courses_org_program_idx on public.ai_literacy_courses(organization_id,program_id,status);
create index if not exists ai_literacy_assignments_org_status_idx on public.ai_literacy_assignments(organization_id,status,due_at);
create index if not exists ai_literacy_assignments_assignee_idx on public.ai_literacy_assignments(organization_id,assignee_user_id,status);
create index if not exists ai_literacy_evidence_assignment_idx on public.ai_literacy_evidence(organization_id,assignment_id,status);

-- FRIA read domain expected by the current runtime.
create table if not exists public.ai_fria_assessments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, ai_system_id uuid not null,
  version integer not null default 1 check (version>0), applicability text not null check (applicability in ('required','not_required','uncertain')),
  stage text not null check (stage in ('draft','applicability_review','assessment','mitigation','approval','approved','blocked','retired')),
  context jsonb not null default '{}'::jsonb, affected_groups jsonb not null default '[]'::jsonb,
  rights_map jsonb not null default '[]'::jsonb, impact_analysis jsonb not null default '{}'::jsonb,
  mitigation_plan jsonb not null default '{}'::jsonb, oversight_plan jsonb not null default '{}'::jsonb,
  complaints_redress jsonb not null default '{}'::jsonb, monitoring_plan_id uuid,
  highest_residual_impact text not null default 'unknown' check (highest_residual_impact in ('none','low','medium','high','critical','unknown')),
  owner_id uuid not null, reviewer_id uuid, approver_id uuid, legal_reviewer_id uuid,
  legal_review_required boolean not null default false, legal_review_completed_at timestamptz,
  approved_at timestamptz, review_due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, ai_system_id, version),
  check (reviewer_id is null or reviewer_id<>owner_id),
  check (approver_id is null or (approver_id<>owner_id and approver_id is distinct from reviewer_id)),
  check (stage<>'approved' or (approver_id is not null and approved_at is not null))
);
create unique index if not exists ai_fria_assessments_org_id_id on public.ai_fria_assessments(organization_id,id);
create table if not exists public.ai_fria_evidence (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, assessment_id uuid not null,
  control_id text not null, evidence_type text not null, storage_reference text, sha256_digest text,
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected','expired')),
  submitted_by uuid not null, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now(),
  check (sha256_digest is null or sha256_digest ~ '^[0-9a-f]{64}$'),
  foreign key (organization_id,assessment_id) references public.ai_fria_assessments(organization_id,id)
);
create table if not exists public.ai_fria_decisions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, assessment_id uuid not null,
  decision text not null check (decision in ('applicability_confirmed','mitigation_required','approved','rejected','reassessment_required','retired')),
  rationale text not null, actor_id uuid not null, evidence_digest text, created_at timestamptz not null default now(),
  check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  foreign key (organization_id,assessment_id) references public.ai_fria_assessments(organization_id,id)
);
create index if not exists ai_fria_assessments_due_idx on public.ai_fria_assessments(organization_id,stage,review_due_at);
create index if not exists ai_fria_evidence_assessment_idx on public.ai_fria_evidence(organization_id,assessment_id,control_id);
create index if not exists ai_fria_decisions_assessment_idx on public.ai_fria_decisions(organization_id,assessment_id,created_at desc);

-- Harden all newly reconciled governance reads to active tenant membership; browser writes fail closed.
do $$
declare t text;
begin
  foreach t in array array['ai_literacy_programs','ai_literacy_courses','ai_literacy_assignments','ai_literacy_evidence','ai_fria_assessments','ai_fria_evidence','ai_fria_decisions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
end $$;

drop policy if exists rls_ai_literacy_programs_select_member on public.ai_literacy_programs;
create policy rls_ai_literacy_programs_select_member on public.ai_literacy_programs for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_literacy_courses_select_member on public.ai_literacy_courses;
create policy rls_ai_literacy_courses_select_member on public.ai_literacy_courses for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_literacy_assignments_select_member on public.ai_literacy_assignments;
create policy rls_ai_literacy_assignments_select_member on public.ai_literacy_assignments for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_literacy_evidence_select_member on public.ai_literacy_evidence;
create policy rls_ai_literacy_evidence_select_member on public.ai_literacy_evidence for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_fria_assessments_select_member on public.ai_fria_assessments;
create policy rls_ai_fria_assessments_select_member on public.ai_fria_assessments for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_fria_evidence_select_member on public.ai_fria_evidence;
create policy rls_ai_fria_evidence_select_member on public.ai_fria_evidence for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists rls_ai_fria_decisions_select_member on public.ai_fria_decisions;
create policy rls_ai_fria_decisions_select_member on public.ai_fria_decisions for select to authenticated using (app_private.is_org_member(organization_id));

notify pgrst, 'reload schema';
commit;