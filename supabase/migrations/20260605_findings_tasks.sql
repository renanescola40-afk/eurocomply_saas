-- EuroComply AI - Findings and Compliance Tasks schema
-- Converts Gap Analysis outputs into persistent remediation work.

create table if not exists public.compliance_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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

create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'blocked')),
  owner_id uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compliance_findings_workspace_status_idx
  on public.compliance_findings(workspace_id, status, severity, created_at desc);

create index if not exists compliance_findings_assessment_idx
  on public.compliance_findings(assessment_id);

create index if not exists compliance_tasks_workspace_status_idx
  on public.compliance_tasks(workspace_id, status, priority, due_date);

create index if not exists compliance_tasks_finding_idx
  on public.compliance_tasks(finding_id);

alter table public.compliance_findings enable row level security;
alter table public.compliance_tasks enable row level security;

create policy if not exists "workspace members can read compliance findings"
  on public.compliance_findings for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_findings.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can insert compliance findings"
  on public.compliance_findings for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_findings.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can update compliance findings"
  on public.compliance_findings for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_findings.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_findings.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can read compliance tasks"
  on public.compliance_tasks for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can insert compliance tasks"
  on public.compliance_tasks for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can update compliance tasks"
  on public.compliance_tasks for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = compliance_tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );
