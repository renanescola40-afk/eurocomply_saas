create table if not exists public.compliance_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_date date not null default current_date,
  compliance_score integer not null default 0 check (compliance_score >= 0 and compliance_score <= 100),
  open_tasks integer not null default 0 check (open_tasks >= 0),
  open_risks integer not null default 0 check (open_risks >= 0),
  critical_risks integer not null default 0 check (critical_risks >= 0),
  high_risk_vendors integer not null default 0 check (high_risk_vendors >= 0),
  missing_documents integer not null default 0 check (missing_documents >= 0),
  total_tasks integer not null default 0 check (total_tasks >= 0),
  total_risks integer not null default 0 check (total_risks >= 0),
  total_vendors integer not null default 0 check (total_vendors >= 0),
  total_documents integer not null default 0 check (total_documents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, snapshot_date)
);

create index if not exists compliance_metric_snapshots_org_date_idx
  on public.compliance_metric_snapshots (organization_id, snapshot_date desc);

alter table public.compliance_metric_snapshots enable row level security;

create policy "Organization members can read compliance metric snapshots"
  on public.compliance_metric_snapshots
  for select
  using (
    exists (
      select 1
      from public.organization_members members
      where members.organization_id = compliance_metric_snapshots.organization_id
        and members.user_id = auth.uid()
    )
  );

create policy "Organization admins can manage compliance metric snapshots"
  on public.compliance_metric_snapshots
  for all
  using (
    exists (
      select 1
      from public.organization_members members
      where members.organization_id = compliance_metric_snapshots.organization_id
        and members.user_id = auth.uid()
        and members.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members members
      where members.organization_id = compliance_metric_snapshots.organization_id
        and members.user_id = auth.uid()
        and members.role in ('owner', 'admin')
    )
  );
