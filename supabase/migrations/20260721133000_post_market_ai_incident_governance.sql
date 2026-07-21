create table if not exists public.ai_post_market_plans (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid not null, status text not null default 'draft' check (status in ('draft','approved','active','suspended','retired')),
  metrics jsonb not null default '[]'::jsonb, thresholds jsonb not null default '[]'::jsonb,
  review_cadence_days integer not null check (review_cadence_days between 1 and 3650),
  owner_user_id uuid not null, reviewer_user_id uuid, approver_user_id uuid, approved_at timestamptz,
  version integer not null default 1 check (version > 0), next_review_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, ai_system_id, version),
  check (reviewer_user_id is null or reviewer_user_id <> owner_user_id),
  check (approver_user_id is null or (approver_user_id <> owner_user_id and approver_user_id is distinct from reviewer_user_id)),
  check ((status not in ('approved','active')) or (approver_user_id is not null and approved_at is not null))
);

create table if not exists public.ai_post_market_signals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null, signal_type text not null check (signal_type in ('performance_drift','accuracy_degradation','robustness_failure','cybersecurity_event','complaint','rights_impact','serious_incident','provider_change','other')),
  severity text not null check (severity in ('low','medium','high','critical','unknown')),
  detected_at timestamptz not null, source text not null, evidence_digest text,
  triage_status text not null default 'new' check (triage_status in ('new','triaged','investigating','corrective_action','closed','dismissed')),
  created_by uuid not null, created_at timestamptz not null default now(),
  constraint ai_post_market_signals_digest check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  constraint ai_post_market_signals_plan_fk foreign key (organization_id, plan_id) references public.ai_post_market_plans(organization_id, id) deferrable initially deferred
);

create table if not exists public.ai_incident_cases (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  signal_id uuid not null, status text not null default 'intake' check (status in ('intake','triage','contained','investigating','corrective_action','approval_required','closed','blocked')),
  containment_summary text, root_cause_summary text, affected_people_possible boolean not null default false,
  rights_impact_possible boolean not null default false, reporting_assessment_status text not null default 'not_started' check (reporting_assessment_status in ('not_started','required_review','in_review','completed','not_applicable')),
  legal_review_status text not null default 'not_started' check (legal_review_status in ('not_started','required','in_review','completed','not_applicable')),
  owner_user_id uuid not null, reviewer_user_id uuid, approver_user_id uuid, approved_at timestamptz, closed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_incident_cases_signal_fk foreign key (organization_id, signal_id) references public.ai_post_market_signals(organization_id, id) deferrable initially deferred,
  check (reviewer_user_id is null or reviewer_user_id <> owner_user_id),
  check (approver_user_id is null or (approver_user_id <> owner_user_id and approver_user_id is distinct from reviewer_user_id)),
  check (status <> 'closed' or (approved_at is not null and approver_user_id is not null and closed_at is not null))
);

create table if not exists public.ai_incident_actions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null, action_type text not null check (action_type in ('containment','investigation','corrective','preventive','monitoring','communication','reporting_review')),
  description text not null, owner_user_id uuid not null, due_at timestamptz, completed_at timestamptz,
  effectiveness_status text not null default 'not_reviewed' check (effectiveness_status in ('not_reviewed','effective','partially_effective','ineffective')),
  evidence_digest text, created_at timestamptz not null default now(),
  constraint ai_incident_actions_digest check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  constraint ai_incident_actions_case_fk foreign key (organization_id, incident_id) references public.ai_incident_cases(organization_id, id) deferrable initially deferred
);

create unique index if not exists ai_post_market_plans_org_id_id on public.ai_post_market_plans(organization_id,id);
create unique index if not exists ai_post_market_signals_org_id_id on public.ai_post_market_signals(organization_id,id);
create unique index if not exists ai_incident_cases_org_id_id on public.ai_incident_cases(organization_id,id);
create index if not exists ai_post_market_signals_queue on public.ai_post_market_signals(organization_id,triage_status,severity,detected_at);
create index if not exists ai_incident_cases_queue on public.ai_incident_cases(organization_id,status,updated_at);
create index if not exists ai_incident_actions_due on public.ai_incident_actions(organization_id,due_at) where completed_at is null;

alter table public.ai_post_market_plans enable row level security; alter table public.ai_post_market_plans force row level security;
alter table public.ai_post_market_signals enable row level security; alter table public.ai_post_market_signals force row level security;
alter table public.ai_incident_cases enable row level security; alter table public.ai_incident_cases force row level security;
alter table public.ai_incident_actions enable row level security; alter table public.ai_incident_actions force row level security;

create policy ai_post_market_plans_member_read on public.ai_post_market_plans for select to authenticated using (public.is_organization_member(organization_id));
create policy ai_post_market_plans_admin_write on public.ai_post_market_plans for all to authenticated using (public.has_organization_role(organization_id,array['owner','admin'])) with check (public.has_organization_role(organization_id,array['owner','admin']));
create policy ai_post_market_signals_member_read on public.ai_post_market_signals for select to authenticated using (public.is_organization_member(organization_id));
create policy ai_post_market_signals_member_insert on public.ai_post_market_signals for insert to authenticated with check (public.is_organization_member(organization_id));
create policy ai_incident_cases_member_read on public.ai_incident_cases for select to authenticated using (public.is_organization_member(organization_id));
create policy ai_incident_cases_admin_write on public.ai_incident_cases for all to authenticated using (public.has_organization_role(organization_id,array['owner','admin'])) with check (public.has_organization_role(organization_id,array['owner','admin']));
create policy ai_incident_actions_member_read on public.ai_incident_actions for select to authenticated using (public.is_organization_member(organization_id));
create policy ai_incident_actions_admin_write on public.ai_incident_actions for all to authenticated using (public.has_organization_role(organization_id,array['owner','admin'])) with check (public.has_organization_role(organization_id,array['owner','admin']));
