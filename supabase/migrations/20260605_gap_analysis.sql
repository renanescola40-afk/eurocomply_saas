-- EuroComply AI - Gap Analysis schema
-- Run this migration in Supabase SQL editor or your migration pipeline.

create table if not exists public.gap_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'EU AI Act Gap Analysis',
  score integer not null default 0 check (score >= 0 and score <= 100),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  locale text not null default 'en',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gap_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.gap_assessments(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  question_id text not null,
  article text not null,
  category text not null,
  answer text not null check (answer in ('yes', 'partial', 'no')),
  score integer not null check (score in (0, 50, 100)),
  recommendation text,
  created_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create index if not exists gap_assessments_workspace_idx on public.gap_assessments(workspace_id, created_at desc);
create index if not exists gap_answers_assessment_idx on public.gap_answers(assessment_id);

alter table public.gap_assessments enable row level security;
alter table public.gap_answers enable row level security;

create policy if not exists "workspace members can read gap assessments"
  on public.gap_assessments for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_assessments.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can insert gap assessments"
  on public.gap_assessments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_assessments.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can update own gap assessments"
  on public.gap_assessments for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_assessments.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_assessments.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can read gap answers"
  on public.gap_answers for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_answers.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can insert gap answers"
  on public.gap_answers for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_answers.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

create policy if not exists "workspace members can update gap answers"
  on public.gap_answers for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_answers.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = gap_answers.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );
