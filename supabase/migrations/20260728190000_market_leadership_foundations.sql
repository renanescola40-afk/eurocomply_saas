begin;

create table if not exists public.ai_governance_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('system','model','agent','dataset','vendor','use_case')),
  external_key text,
  name text not null check (char_length(name) between 1 and 240),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','assessment','approved','restricted','suspended','retired')),
  intended_purpose text,
  owner_user_id text,
  jurisdiction_codes text[] not null default '{}',
  department_codes text[] not null default '{}',
  risk_tier text check (risk_tier is null or risk_tier in ('minimal','limited','high','prohibited','unclassified')),
  attributes jsonb not null default '{}'::jsonb,
  source_provenance jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, organization_id),
  unique (organization_id, entity_type, external_key)
);

create table if not exists public.ai_governance_entity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_entity_id uuid not null,
  target_entity_id uuid not null,
  relation_type text not null check (relation_type in ('uses','depends_on','provided_by','trained_on','deployed_by','owned_by','affects','replaces','calls','contains')),
  metadata jsonb not null default '{}'::jsonb,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (source_entity_id <> target_entity_id),
  check (valid_until is null or valid_until > valid_from),
  unique (organization_id, source_entity_id, target_entity_id, relation_type, valid_from),
  foreign key (source_entity_id, organization_id)
    references public.ai_governance_entities(id, organization_id) on delete cascade,
  foreign key (target_entity_id, organization_id)
    references public.ai_governance_entities(id, organization_id) on delete cascade
);

create table if not exists public.normalized_ai_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_key text not null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null,
  control_family text not null,
  applicability_expression jsonb not null default '{}'::jsonb,
  implementation_guidance text,
  evidence_requirements jsonb not null default '[]'::jsonb,
  owner_role text,
  review_frequency_days integer check (review_frequency_days is null or review_frequency_days between 1 and 3650),
  status text not null default 'draft' check (status in ('draft','active','deprecated','archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, control_key, version)
);

create table if not exists public.normalized_ai_control_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_id uuid not null,
  framework_key text not null,
  framework_version text not null,
  requirement_key text not null,
  mapping_strength text not null check (mapping_strength in ('partial','substantial','full')),
  rationale text not null,
  source_url text,
  verified_at timestamptz,
  reviewer_status text not null default 'unreviewed' check (reviewer_status in ('unreviewed','review_required','reviewed','rejected')),
  created_at timestamptz not null default now(),
  unique (organization_id, control_id, framework_key, framework_version, requirement_key),
  foreign key (control_id, organization_id)
    references public.normalized_ai_controls(id, organization_id) on delete cascade
);

create table if not exists public.governance_evidence_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid,
  control_id uuid,
  evidence_type text not null,
  title text not null check (char_length(title) between 1 and 240),
  source_kind text not null check (source_kind in ('application_event','integration','upload','api','ci','runtime','manual_review')),
  source_reference text not null,
  source_sha text,
  environment text not null check (environment in ('local','ci','staging','production','external')),
  evidence_class text not null check (evidence_class in ('synthetic','customer','provider','qualified_review')),
  integrity_digest text not null check (integrity_digest ~ '^sha256:[a-f0-9]{64}$'),
  collected_at timestamptz not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  limitations text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  reviewed_by text,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','review_required','accepted','rejected','expired')),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  check (evidence_class <> 'synthetic' or environment <> 'production'),
  foreign key (entity_id, organization_id)
    references public.ai_governance_entities(id, organization_id) on delete set null (entity_id),
  foreign key (control_id, organization_id)
    references public.normalized_ai_controls(id, organization_id) on delete set null (control_id)
);

create table if not exists public.regulatory_change_impacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  regulatory_source_key text not null,
  regulatory_version text not null,
  change_key text not null,
  title text not null,
  effective_at timestamptz,
  binding_status text not null check (binding_status in ('binding','guidance','code','standard','draft','unknown')),
  affected_entity_ids uuid[] not null default '{}',
  affected_control_ids uuid[] not null default '{}',
  impact_summary text not null,
  required_actions jsonb not null default '[]'::jsonb,
  uncertainty text,
  status text not null default 'identified' check (status in ('identified','triaged','action_required','mitigated','not_applicable','review_required')),
  owner_user_id text,
  due_at timestamptz,
  source_url text not null,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, regulatory_source_key, regulatory_version, change_key)
);

create table if not exists public.governance_value_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id text,
  event_name text not null check (event_name in ('workspace_created','first_inventory_created','first_classification_completed','first_control_activated','first_evidence_accepted','first_report_exported','first_vendor_reviewed','first_regulatory_impact_resolved')),
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  source text not null default 'application',
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, event_name),
  foreign key (entity_id, organization_id)
    references public.ai_governance_entities(id, organization_id) on delete set null (entity_id)
);

create index if not exists ai_governance_entities_org_type_idx on public.ai_governance_entities (organization_id, entity_type, lifecycle_status);
create index if not exists ai_governance_entity_links_org_source_idx on public.ai_governance_entity_links (organization_id, source_entity_id);
create index if not exists ai_governance_entity_links_org_target_idx on public.ai_governance_entity_links (organization_id, target_entity_id);
create index if not exists normalized_ai_controls_org_status_idx on public.normalized_ai_controls (organization_id, status, control_family);
create index if not exists normalized_ai_control_mappings_framework_idx on public.normalized_ai_control_mappings (organization_id, framework_key, framework_version);
create index if not exists governance_evidence_objects_org_validity_idx on public.governance_evidence_objects (organization_id, review_status, valid_until);
create index if not exists regulatory_change_impacts_org_status_idx on public.regulatory_change_impacts (organization_id, status, due_at);
create index if not exists governance_value_events_org_time_idx on public.governance_value_events (organization_id, occurred_at);

alter table public.ai_governance_entities enable row level security;
alter table public.ai_governance_entities force row level security;
alter table public.ai_governance_entity_links enable row level security;
alter table public.ai_governance_entity_links force row level security;
alter table public.normalized_ai_controls enable row level security;
alter table public.normalized_ai_controls force row level security;
alter table public.normalized_ai_control_mappings enable row level security;
alter table public.normalized_ai_control_mappings force row level security;
alter table public.governance_evidence_objects enable row level security;
alter table public.governance_evidence_objects force row level security;
alter table public.regulatory_change_impacts enable row level security;
alter table public.regulatory_change_impacts force row level security;
alter table public.governance_value_events enable row level security;
alter table public.governance_value_events force row level security;

create policy ai_governance_entities_member_read on public.ai_governance_entities for select to authenticated using (public.is_organization_member(organization_id));
create policy ai_governance_entity_links_member_read on public.ai_governance_entity_links for select to authenticated using (public.is_organization_member(organization_id));
create policy normalized_ai_controls_member_read on public.normalized_ai_controls for select to authenticated using (public.is_organization_member(organization_id));
create policy normalized_ai_control_mappings_member_read on public.normalized_ai_control_mappings for select to authenticated using (public.is_organization_member(organization_id));
create policy governance_evidence_objects_member_read on public.governance_evidence_objects for select to authenticated using (public.is_organization_member(organization_id));
create policy regulatory_change_impacts_member_read on public.regulatory_change_impacts for select to authenticated using (public.is_organization_member(organization_id));
create policy governance_value_events_member_read on public.governance_value_events for select to authenticated using (public.is_organization_member(organization_id));

-- Browser writes remain explicitly denied. Trusted server-side operations use the
-- privileged backend client, which bypasses RLS and remains the only write path.
create policy ai_governance_entities_insert_backend_only on public.ai_governance_entities for insert to authenticated with check (false);
create policy ai_governance_entities_update_backend_only on public.ai_governance_entities for update to authenticated using (false) with check (false);
create policy ai_governance_entities_delete_backend_only on public.ai_governance_entities for delete to authenticated using (false);
create policy ai_governance_entity_links_insert_backend_only on public.ai_governance_entity_links for insert to authenticated with check (false);
create policy ai_governance_entity_links_update_backend_only on public.ai_governance_entity_links for update to authenticated using (false) with check (false);
create policy ai_governance_entity_links_delete_backend_only on public.ai_governance_entity_links for delete to authenticated using (false);
create policy normalized_ai_controls_insert_backend_only on public.normalized_ai_controls for insert to authenticated with check (false);
create policy normalized_ai_controls_update_backend_only on public.normalized_ai_controls for update to authenticated using (false) with check (false);
create policy normalized_ai_controls_delete_backend_only on public.normalized_ai_controls for delete to authenticated using (false);
create policy normalized_ai_control_mappings_insert_backend_only on public.normalized_ai_control_mappings for insert to authenticated with check (false);
create policy normalized_ai_control_mappings_update_backend_only on public.normalized_ai_control_mappings for update to authenticated using (false) with check (false);
create policy normalized_ai_control_mappings_delete_backend_only on public.normalized_ai_control_mappings for delete to authenticated using (false);
create policy governance_evidence_objects_insert_backend_only on public.governance_evidence_objects for insert to authenticated with check (false);
create policy governance_evidence_objects_update_backend_only on public.governance_evidence_objects for update to authenticated using (false) with check (false);
create policy governance_evidence_objects_delete_backend_only on public.governance_evidence_objects for delete to authenticated using (false);
create policy regulatory_change_impacts_insert_backend_only on public.regulatory_change_impacts for insert to authenticated with check (false);
create policy regulatory_change_impacts_update_backend_only on public.regulatory_change_impacts for update to authenticated using (false) with check (false);
create policy regulatory_change_impacts_delete_backend_only on public.regulatory_change_impacts for delete to authenticated using (false);
create policy governance_value_events_insert_backend_only on public.governance_value_events for insert to authenticated with check (false);
create policy governance_value_events_update_backend_only on public.governance_value_events for update to authenticated using (false) with check (false);
create policy governance_value_events_delete_backend_only on public.governance_value_events for delete to authenticated using (false);

revoke all on public.ai_governance_entities from anon;
revoke all on public.ai_governance_entity_links from anon;
revoke all on public.normalized_ai_controls from anon;
revoke all on public.normalized_ai_control_mappings from anon;
revoke all on public.governance_evidence_objects from anon;
revoke all on public.regulatory_change_impacts from anon;
revoke all on public.governance_value_events from anon;

revoke insert, update, delete on public.ai_governance_entities from authenticated;
revoke insert, update, delete on public.ai_governance_entity_links from authenticated;
revoke insert, update, delete on public.normalized_ai_controls from authenticated;
revoke insert, update, delete on public.normalized_ai_control_mappings from authenticated;
revoke insert, update, delete on public.governance_evidence_objects from authenticated;
revoke insert, update, delete on public.regulatory_change_impacts from authenticated;
revoke insert, update, delete on public.governance_value_events from authenticated;

grant select on public.ai_governance_entities to authenticated;
grant select on public.ai_governance_entity_links to authenticated;
grant select on public.normalized_ai_controls to authenticated;
grant select on public.normalized_ai_control_mappings to authenticated;
grant select on public.governance_evidence_objects to authenticated;
grant select on public.regulatory_change_impacts to authenticated;
grant select on public.governance_value_events to authenticated;

comment on table public.ai_governance_entities is 'Tenant-scoped digital twin entities for AI systems, models, agents, datasets, vendors and use cases.';
comment on table public.normalized_ai_controls is 'Canonical organization controls designed for reuse across regulatory and assurance frameworks.';
comment on table public.governance_evidence_objects is 'Integrity-bound evidence objects. Generated documents and synthetic evidence do not imply legal approval or production proof.';
comment on table public.regulatory_change_impacts is 'Organization-specific impact decisions for versioned regulatory changes.';
comment on table public.governance_value_events is 'First-value milestones used to measure onboarding outcomes without storing sensitive event payloads.';

commit;