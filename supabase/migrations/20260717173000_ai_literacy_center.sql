-- EU AI Act Article 4 AI literacy operations.
-- Additive migration: creates versioned programmes, courses, assignments and evidence.

create table if not exists public.ai_literacy_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text,
  article_reference text not null default 'Article 4',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
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
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  audience_roles text[] not null default '{}'::text[],
  risk_levels text[] not null default '{}'::text[],
  departments text[] not null default '{}'::text[],
  modules jsonb not null default '[]'::jsonb check (jsonb_typeof(modules) = 'array'),
  passing_score integer check (passing_score between 0 and 100),
  validity_days integer check (validity_days is null or validity_days between 1 and 3650),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, program_id, title, version),
  constraint ai_literacy_courses_program_org_fk
    foreign key (program_id, organization_id)
    references public.ai_literacy_programs(id, organization_id)
    on delete cascade
);

create table if not exists public.ai_literacy_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_email text,
  assignee_type text not null default 'employee' check (assignee_type in ('employee', 'contractor', 'other')),
  role_title text,
  department text,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'expired', 'waived', 'revoked')),
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
  constraint ai_literacy_assignments_course_org_fk
    foreign key (course_id, organization_id)
    references public.ai_literacy_courses(id, organization_id)
    on delete cascade,
  constraint ai_literacy_assignment_assignee_required
    check (assignee_user_id is not null or nullif(btrim(assignee_email), '') is not null),
  constraint ai_literacy_assignment_completion_consistent
    check (
      status <> 'completed'
      or (completed_at is not null and acknowledgement = true)
    ),
  constraint ai_literacy_assignment_waiver_consistent
    check (
      status <> 'waived'
      or (
        nullif(btrim(waiver_rationale), '') is not null
        and waiver_approved_by is not null
        and waiver_approved_at is not null
      )
    )
);

create table if not exists public.ai_literacy_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  evidence_type text not null check (evidence_type in ('completion_record', 'assessment_result', 'attendance', 'acknowledgement', 'certificate', 'other')),
  title text not null check (char_length(title) between 3 and 180),
  storage_path text,
  external_url text,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text,
  issued_at timestamptz,
  valid_until timestamptz,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected', 'expired', 'superseded')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint ai_literacy_evidence_assignment_org_fk
    foreign key (assignment_id, organization_id)
    references public.ai_literacy_assignments(id, organization_id)
    on delete cascade,
  constraint ai_literacy_evidence_location_required
    check (nullif(btrim(storage_path), '') is not null or nullif(btrim(external_url), '') is not null),
  constraint ai_literacy_evidence_review_consistent
    check (
      status not in ('approved', 'rejected')
      or (reviewed_by is not null and reviewed_at is not null)
    )
);

create index if not exists ai_literacy_programs_org_status_idx
  on public.ai_literacy_programs(organization_id, status, review_due_at);
create index if not exists ai_literacy_courses_org_program_idx
  on public.ai_literacy_courses(organization_id, program_id, status);
create index if not exists ai_literacy_assignments_org_status_idx
  on public.ai_literacy_assignments(organization_id, status, due_at);
create index if not exists ai_literacy_assignments_assignee_idx
  on public.ai_literacy_assignments(organization_id, assignee_user_id, status);
create index if not exists ai_literacy_evidence_assignment_idx
  on public.ai_literacy_evidence(organization_id, assignment_id, status);

alter table public.ai_literacy_programs enable row level security;
alter table public.ai_literacy_courses enable row level security;
alter table public.ai_literacy_assignments enable row level security;
alter table public.ai_literacy_evidence enable row level security;

-- Reuse the tenant membership helpers introduced by the enterprise evidence platform.
drop policy if exists "Members can read AI literacy programmes" on public.ai_literacy_programs;
create policy "Members can read AI literacy programmes"
  on public.ai_literacy_programs for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can manage AI literacy programmes" on public.ai_literacy_programs;
create policy "Managers can manage AI literacy programmes"
  on public.ai_literacy_programs for all
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Members can read AI literacy courses" on public.ai_literacy_courses;
create policy "Members can read AI literacy courses"
  on public.ai_literacy_courses for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can manage AI literacy courses" on public.ai_literacy_courses;
create policy "Managers can manage AI literacy courses"
  on public.ai_literacy_courses for all
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Members can read AI literacy assignments" on public.ai_literacy_assignments;
create policy "Members can read AI literacy assignments"
  on public.ai_literacy_assignments for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can manage AI literacy assignments" on public.ai_literacy_assignments;
create policy "Managers can manage AI literacy assignments"
  on public.ai_literacy_assignments for all
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Members can read AI literacy evidence" on public.ai_literacy_evidence;
create policy "Members can read AI literacy evidence"
  on public.ai_literacy_evidence for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can manage AI literacy evidence" on public.ai_literacy_evidence;
create policy "Managers can manage AI literacy evidence"
  on public.ai_literacy_evidence for all
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

revoke all on public.ai_literacy_programs from anon;
revoke all on public.ai_literacy_courses from anon;
revoke all on public.ai_literacy_assignments from anon;
revoke all on public.ai_literacy_evidence from anon;

grant select, insert, update, delete on public.ai_literacy_programs to authenticated;
grant select, insert, update, delete on public.ai_literacy_courses to authenticated;
grant select, insert, update, delete on public.ai_literacy_assignments to authenticated;
grant select, insert, update, delete on public.ai_literacy_evidence to authenticated;
