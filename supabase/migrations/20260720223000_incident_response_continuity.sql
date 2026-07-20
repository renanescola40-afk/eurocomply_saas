begin;

create table if not exists public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  severity text not null check (severity in ('sev1','sev2','sev3','sev4')),
  status text not null default 'detected' check (status in ('detected','triaged','contained','eradicated','recovered','closed')),
  category text not null check (category in ('availability','confidentiality','integrity','authentication','provider','payment','privacy','other')),
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  contained_at timestamptz,
  recovered_at timestamptz,
  closed_at timestamptz,
  incident_commander_id uuid references auth.users(id),
  legal_review_required boolean not null default false,
  regulator_notification_required boolean not null default false,
  customer_notification_required boolean not null default false,
  postmortem_due_at timestamptz not null default (now() + interval '10 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed' and closed_at is not null) or status <> 'closed'),
  check (acknowledged_at is null or acknowledged_at >= detected_at),
  check (contained_at is null or contained_at >= detected_at),
  check (recovered_at is null or recovered_at >= detected_at)
);

create table if not exists public.incident_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.security_incidents(id) on delete cascade,
  event_type text not null check (event_type in ('detection','triage','containment','eradication','recovery','communication','decision','evidence','postmortem')),
  summary text not null check (char_length(summary) between 3 and 1000),
  occurred_at timestamptz not null,
  recorded_by uuid references auth.users(id),
  evidence_digest_sha256 text check (evidence_digest_sha256 is null or evidence_digest_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.continuity_exercises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exercise_type text not null check (exercise_type in ('tabletop','failover','rollback','backup_restore','provider_outage','security_incident')),
  status text not null default 'planned' check (status in ('planned','running','passed','failed','cancelled')),
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  rto_target_minutes integer not null check (rto_target_minutes between 1 and 10080),
  rto_actual_minutes integer check (rto_actual_minutes is null or rto_actual_minutes >= 0),
  rpo_target_minutes integer not null check (rpo_target_minutes between 0 and 10080),
  rpo_actual_minutes integer check (rpo_actual_minutes is null or rpo_actual_minutes >= 0),
  owner_id uuid references auth.users(id),
  independent_reviewer_id uuid references auth.users(id),
  findings_count integer not null default 0 check (findings_count >= 0),
  evidence_digest_sha256 text check (evidence_digest_sha256 is null or evidence_digest_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id is null or independent_reviewer_id is null or owner_id <> independent_reviewer_id),
  check ((status in ('passed','failed') and completed_at is not null) or status not in ('passed','failed'))
);

alter table public.security_incidents enable row level security;
alter table public.security_incidents force row level security;
alter table public.incident_timeline_events enable row level security;
alter table public.incident_timeline_events force row level security;
alter table public.continuity_exercises enable row level security;
alter table public.continuity_exercises force row level security;

create policy "incident members read" on public.security_incidents for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = security_incidents.organization_id and m.user_id = auth.uid()));
create policy "incident admins insert" on public.security_incidents for insert to authenticated with check (exists (select 1 from public.organization_members m where m.organization_id = security_incidents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "incident admins update" on public.security_incidents for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = security_incidents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))) with check (exists (select 1 from public.organization_members m where m.organization_id = security_incidents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "incident owners delete" on public.security_incidents for delete to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = security_incidents.organization_id and m.user_id = auth.uid() and m.role = 'owner'));

create policy "timeline members read" on public.incident_timeline_events for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = incident_timeline_events.organization_id and m.user_id = auth.uid()));
create policy "timeline admins insert" on public.incident_timeline_events for insert to authenticated with check (exists (select 1 from public.organization_members m where m.organization_id = incident_timeline_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')) and exists (select 1 from public.security_incidents i where i.id = incident_timeline_events.incident_id and i.organization_id = incident_timeline_events.organization_id));
create policy "timeline admins update" on public.incident_timeline_events for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = incident_timeline_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))) with check (exists (select 1 from public.organization_members m where m.organization_id = incident_timeline_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "timeline owners delete" on public.incident_timeline_events for delete to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = incident_timeline_events.organization_id and m.user_id = auth.uid() and m.role = 'owner'));

create policy "continuity members read" on public.continuity_exercises for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = continuity_exercises.organization_id and m.user_id = auth.uid()));
create policy "continuity admins insert" on public.continuity_exercises for insert to authenticated with check (exists (select 1 from public.organization_members m where m.organization_id = continuity_exercises.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "continuity admins update" on public.continuity_exercises for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = continuity_exercises.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))) with check (exists (select 1 from public.organization_members m where m.organization_id = continuity_exercises.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "continuity owners delete" on public.continuity_exercises for delete to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = continuity_exercises.organization_id and m.user_id = auth.uid() and m.role = 'owner'));

create index if not exists security_incidents_org_status_severity_idx on public.security_incidents (organization_id, status, severity, detected_at desc);
create index if not exists incident_timeline_incident_time_idx on public.incident_timeline_events (incident_id, occurred_at);
create index if not exists continuity_exercises_org_schedule_idx on public.continuity_exercises (organization_id, scheduled_at desc);

commit;
