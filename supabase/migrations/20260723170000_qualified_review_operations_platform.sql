begin;

create table if not exists public.qualified_review_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_sha text not null check (target_sha ~ '^[a-f0-9]{40}$'),
  status text not null default 'draft' check (status in ('draft','active','blocked','ready_for_closeout','closed')),
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  version integer not null default 1,
  unique (organization_id, target_sha),
  unique (id, organization_id)
);

create table if not exists public.qualified_reviewers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  display_name text not null,
  qualification_summary text not null,
  qualification_evidence jsonb not null default '[]'::jsonb,
  independence_declared boolean not null default false,
  conflict_details text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index if not exists qualified_reviewers_org_email_unique
  on public.qualified_reviewers (organization_id, lower(email));

create table if not exists public.qualified_review_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  reviewer_id uuid not null,
  workstream_id text not null check (workstream_id in ('LEGAL-RULES','PROHIBITED-PRACTICES','ARTICLE-50','FRIA','DEPLOYER','HIGH-RISK-PROVIDER','CONFORMITY','GPAI')),
  weight integer not null check (weight > 0 and weight <= 100),
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','in_review','changes_requested','submitted','accepted','rejected','expired','revoked')),
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  version integer not null default 1,
  unique (campaign_id, workstream_id),
  unique (id, organization_id),
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete cascade,
  foreign key (reviewer_id, organization_id) references public.qualified_reviewers(id, organization_id) on delete restrict
);

create table if not exists public.qualified_review_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  target_sha text not null check (target_sha ~ '^[a-f0-9]{40}$'),
  opinion text not null check (char_length(opinion) between 40 and 20000),
  conclusion text not null check (conclusion in ('accepted','accepted_with_conditions','changes_required','rejected')),
  scope jsonb not null,
  evidence_locations jsonb not null,
  limitations jsonb not null default '[]'::jsonb,
  valid_until timestamptz not null,
  integrity_sha256 text not null check (integrity_sha256 ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (id, organization_id),
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade
);

create table if not exists public.qualified_review_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  submission_id uuid not null,
  decision text not null check (decision in ('accepted','rejected','changes_requested','revoked')),
  reason text not null check (char_length(reason) between 20 and 4000),
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  unique (assignment_id, submission_id),
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade,
  foreign key (submission_id, organization_id) references public.qualified_review_submissions(id, organization_id) on delete restrict
);

create table if not exists public.qualified_review_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  assignment_id uuid,
  actor_id uuid references auth.users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete cascade,
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade
);

create index if not exists qualified_review_assignments_campaign_status_idx on public.qualified_review_assignments(campaign_id, status);
create index if not exists qualified_review_submissions_assignment_idx on public.qualified_review_submissions(assignment_id, submitted_at desc);
create index if not exists qualified_review_events_campaign_created_idx on public.qualified_review_events(campaign_id, created_at desc);

alter table public.qualified_review_campaigns enable row level security;
alter table public.qualified_review_campaigns force row level security;
alter table public.qualified_reviewers enable row level security;
alter table public.qualified_reviewers force row level security;
alter table public.qualified_review_assignments enable row level security;
alter table public.qualified_review_assignments force row level security;
alter table public.qualified_review_submissions enable row level security;
alter table public.qualified_review_submissions force row level security;
alter table public.qualified_review_decisions enable row level security;
alter table public.qualified_review_decisions force row level security;
alter table public.qualified_review_events enable row level security;
alter table public.qualified_review_events force row level security;

revoke all on public.qualified_review_campaigns, public.qualified_reviewers, public.qualified_review_assignments, public.qualified_review_submissions, public.qualified_review_decisions, public.qualified_review_events from anon, authenticated;
grant select on public.qualified_review_campaigns, public.qualified_reviewers, public.qualified_review_assignments, public.qualified_review_submissions, public.qualified_review_decisions, public.qualified_review_events to authenticated;

create policy qualified_review_campaigns_read on public.qualified_review_campaigns for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_reviewers_read on public.qualified_reviewers for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_review_assignments_read on public.qualified_review_assignments for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_review_submissions_read on public.qualified_review_submissions for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_review_decisions_read on public.qualified_review_decisions for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_review_events_read on public.qualified_review_events for select to authenticated using (public.is_organization_member(organization_id));

create policy qualified_review_campaigns_insert_backend_only on public.qualified_review_campaigns for insert to authenticated with check (false);
create policy qualified_review_campaigns_update_backend_only on public.qualified_review_campaigns for update to authenticated using (false) with check (false);
create policy qualified_review_campaigns_delete_backend_only on public.qualified_review_campaigns for delete to authenticated using (false);
create policy qualified_reviewers_insert_backend_only on public.qualified_reviewers for insert to authenticated with check (false);
create policy qualified_reviewers_update_backend_only on public.qualified_reviewers for update to authenticated using (false) with check (false);
create policy qualified_reviewers_delete_backend_only on public.qualified_reviewers for delete to authenticated using (false);
create policy qualified_review_assignments_insert_backend_only on public.qualified_review_assignments for insert to authenticated with check (false);
create policy qualified_review_assignments_update_backend_only on public.qualified_review_assignments for update to authenticated using (false) with check (false);
create policy qualified_review_assignments_delete_backend_only on public.qualified_review_assignments for delete to authenticated using (false);
create policy qualified_review_submissions_insert_backend_only on public.qualified_review_submissions for insert to authenticated with check (false);
create policy qualified_review_submissions_update_backend_only on public.qualified_review_submissions for update to authenticated using (false) with check (false);
create policy qualified_review_submissions_delete_backend_only on public.qualified_review_submissions for delete to authenticated using (false);
create policy qualified_review_decisions_insert_backend_only on public.qualified_review_decisions for insert to authenticated with check (false);
create policy qualified_review_decisions_update_backend_only on public.qualified_review_decisions for update to authenticated using (false) with check (false);
create policy qualified_review_decisions_delete_backend_only on public.qualified_review_decisions for delete to authenticated using (false);
create policy qualified_review_events_insert_backend_only on public.qualified_review_events for insert to authenticated with check (false);
create policy qualified_review_events_update_backend_only on public.qualified_review_events for update to authenticated using (false) with check (false);
create policy qualified_review_events_delete_backend_only on public.qualified_review_events for delete to authenticated using (false);

comment on table public.qualified_review_campaigns is 'Tenant-scoped exact-SHA campaigns for real qualified legal and methodology review.';
comment on table public.qualified_review_events is 'Append-only audit trail for qualified review operations.';

commit;
