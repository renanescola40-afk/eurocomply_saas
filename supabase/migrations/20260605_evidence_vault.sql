-- EuroComply AI - Evidence Vault schema
-- Stores audit evidence linked to EU AI Act articles, findings and remediation tasks.

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete set null,
  task_id uuid references public.compliance_tasks(id) on delete set null,
  title text not null,
  description text,
  evidence_type text not null default 'document' check (evidence_type in ('policy', 'procedure', 'risk_assessment', 'training', 'vendor_review', 'technical_documentation', 'log', 'document', 'other')),
  status text not null default 'draft' check (status in ('draft', 'valid', 'needs_review', 'expired', 'archived')),
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

create index if not exists evidence_items_user_status_idx
  on public.evidence_items(user_id, status, created_at desc);

create index if not exists evidence_items_workspace_status_idx
  on public.evidence_items(workspace_id, status, created_at desc);

create index if not exists evidence_items_finding_idx
  on public.evidence_items(finding_id);

create index if not exists evidence_items_task_idx
  on public.evidence_items(task_id);

alter table public.evidence_items enable row level security;

create policy if not exists "users can read own evidence items"
  on public.evidence_items for select
  using (user_id = auth.uid());

create policy if not exists "users can insert own evidence items"
  on public.evidence_items for insert
  with check (user_id = auth.uid());

create policy if not exists "users can update own evidence items"
  on public.evidence_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "users can delete own evidence items"
  on public.evidence_items for delete
  using (user_id = auth.uid());
