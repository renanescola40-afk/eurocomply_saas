-- Enterprise Workflow & Automation Engine
create type public.enterprise_workflow_status as enum ('draft','active','paused','retired');
create type public.enterprise_workflow_instance_status as enum ('pending','running','waiting_approval','completed','failed','cancelled','expired');
create type public.enterprise_workflow_step_status as enum ('pending','ready','running','waiting_approval','approved','rejected','completed','failed','skipped','expired');
create type public.enterprise_approval_decision as enum ('approved','rejected','changes_requested');

create table public.enterprise_workflow_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null check (char_length(name) between 3 and 160),
  description text,
  version integer not null default 1 check (version > 0),
  status public.enterprise_workflow_status not null default 'draft',
  trigger_type text not null check (trigger_type in ('manual','event','schedule','sla')),
  trigger_config jsonb not null default '{}'::jsonb check (jsonb_typeof(trigger_config) = 'object'),
  max_duration_minutes integer not null default 10080 check (max_duration_minutes between 1 and 525600),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,key,version),
  check (approved_by is null or approved_by <> created_by),
  check ((status = 'active') = (approved_by is not null and approved_at is not null))
);

create table public.enterprise_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.enterprise_workflow_templates(id) on delete cascade,
  step_key text not null,
  name text not null,
  sequence integer not null check (sequence > 0),
  step_type text not null check (step_type in ('task','approval','notification','webhook','evidence','decision','delay')),
  assignee_role text,
  required_approvals integer not null default 1 check (required_approvals between 1 and 10),
  sla_minutes integer not null default 1440 check (sla_minutes between 1 and 525600),
  escalation_after_minutes integer check (escalation_after_minutes between 1 and 525600),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(),
  unique(template_id,step_key), unique(template_id,sequence)
);

create table public.enterprise_workflow_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.enterprise_workflow_templates(id),
  subject_type text not null,
  subject_id uuid,
  status public.enterprise_workflow_instance_status not null default 'pending',
  correlation_id uuid not null default gen_random_uuid(),
  started_by uuid not null references auth.users(id),
  started_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,correlation_id),
  check (completed_at is null or status in ('completed','failed','cancelled','expired'))
);

create table public.enterprise_workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instance_id uuid not null references public.enterprise_workflow_instances(id) on delete cascade,
  step_id uuid not null references public.enterprise_workflow_steps(id),
  status public.enterprise_workflow_step_status not null default 'pending',
  assigned_to uuid references auth.users(id),
  started_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 25),
  idempotency_key text not null,
  output jsonb not null default '{}'::jsonb check (jsonb_typeof(output)='object'),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,idempotency_key), unique(instance_id,step_id)
);

create table public.enterprise_workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_run_id uuid not null references public.enterprise_workflow_step_runs(id) on delete cascade,
  approver_id uuid not null references auth.users(id),
  decision public.enterprise_approval_decision not null,
  rationale text not null check (char_length(rationale) between 3 and 2000),
  evidence_sha256 text check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
  decided_at timestamptz not null default now(),
  unique(step_run_id,approver_id)
);

create table public.enterprise_workflow_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instance_id uuid not null references public.enterprise_workflow_instances(id) on delete cascade,
  step_run_id uuid references public.enterprise_workflow_step_runs(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id),
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data)='object'),
  previous_event_hash text,
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table public.enterprise_workflow_escalations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_run_id uuid not null references public.enterprise_workflow_step_runs(id) on delete cascade,
  escalation_level integer not null check (escalation_level between 1 and 5),
  target_role text not null,
  reason text not null,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique(step_run_id,escalation_level)
);

create index enterprise_workflow_instances_org_status_idx on public.enterprise_workflow_instances(organization_id,status,due_at);
create index enterprise_workflow_step_runs_due_idx on public.enterprise_workflow_step_runs(organization_id,status,due_at);
create index enterprise_workflow_events_instance_idx on public.enterprise_workflow_events(instance_id,id);

alter table public.enterprise_workflow_templates enable row level security; alter table public.enterprise_workflow_templates force row level security;
alter table public.enterprise_workflow_steps enable row level security; alter table public.enterprise_workflow_steps force row level security;
alter table public.enterprise_workflow_instances enable row level security; alter table public.enterprise_workflow_instances force row level security;
alter table public.enterprise_workflow_step_runs enable row level security; alter table public.enterprise_workflow_step_runs force row level security;
alter table public.enterprise_workflow_approvals enable row level security; alter table public.enterprise_workflow_approvals force row level security;
alter table public.enterprise_workflow_events enable row level security; alter table public.enterprise_workflow_events force row level security;
alter table public.enterprise_workflow_escalations enable row level security; alter table public.enterprise_workflow_escalations force row level security;

-- Reuse the repository's canonical tenant membership boundary.
create policy workflow_templates_tenant_all on public.enterprise_workflow_templates for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy workflow_steps_tenant_all on public.enterprise_workflow_steps for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy workflow_instances_tenant_all on public.enterprise_workflow_instances for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy workflow_step_runs_tenant_all on public.enterprise_workflow_step_runs for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy workflow_approvals_tenant_all on public.enterprise_workflow_approvals for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy workflow_events_tenant_read on public.enterprise_workflow_events for select using (public.is_organization_member(organization_id));
create policy workflow_events_tenant_insert on public.enterprise_workflow_events for insert with check (public.is_organization_member(organization_id));
create policy workflow_escalations_tenant_read on public.enterprise_workflow_escalations for select using (public.is_organization_member(organization_id));
create policy workflow_escalations_tenant_insert on public.enterprise_workflow_escalations for insert with check (public.is_organization_member(organization_id));
create policy workflow_escalations_tenant_acknowledge on public.enterprise_workflow_escalations for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));

revoke update, delete on public.enterprise_workflow_events from anon, authenticated;
revoke update, delete on public.enterprise_workflow_approvals from anon, authenticated;
revoke delete on public.enterprise_workflow_escalations from anon, authenticated;
