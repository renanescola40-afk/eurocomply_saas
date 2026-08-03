-- Article 50 operational workspace.
-- Server-only writes, append-only assessment versions and tenant-scoped reads.

create table if not exists public.ai_article50_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid not null references public.ai_systems(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('BLOCKED', 'NEEDS_REVIEW', 'READY')),
  placed_on_market_at date,
  provider_machine_readable_marking boolean not null default false,
  deployer_disclosure boolean not null default false,
  final_amending_act_verified boolean not null default false,
  official_journal_evidence_id text,
  disclosure_copy text,
  disclosure_language text,
  disclosure_channel text,
  display_evidence_reference text,
  marking_evidence_reference text,
  legal_source_version text not null,
  evaluation jsonb not null default '{}'::jsonb,
  blockers text[] not null default '{}',
  warnings text[] not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, ai_system_id, version),
  check (char_length(coalesce(official_journal_evidence_id, '')) <= 512),
  check (char_length(coalesce(disclosure_copy, '')) <= 8000),
  check (char_length(coalesce(display_evidence_reference, '')) <= 1024),
  check (char_length(coalesce(marking_evidence_reference, '')) <= 1024),
  check (
    not final_amending_act_verified
    or nullif(btrim(coalesce(official_journal_evidence_id, '')), '') is not null
  )
);

create table if not exists public.ai_article50_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.ai_article50_assessments(id) on delete cascade,
  evidence_type text not null check (
    evidence_type in (
      'placement_date',
      'machine_readable_marking',
      'human_readable_disclosure',
      'official_journal_source',
      'proof_of_display',
      'accessibility_validation',
      'translation_review'
    )
  ),
  storage_reference text,
  sha256_digest text,
  source_url text,
  environment text not null default 'customer' check (
    environment in ('local', 'ci', 'staging', 'production', 'customer')
  ),
  status text not null default 'submitted' check (
    status in ('submitted', 'accepted', 'rejected', 'expired')
  ),
  limitations text[] not null default '{}',
  valid_until timestamptz,
  submitted_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (storage_reference is not null or sha256_digest is not null or source_url is not null),
  check (sha256_digest is null or sha256_digest ~ '^[a-f0-9]{64}$'),
  check (char_length(coalesce(storage_reference, '')) <= 1024),
  check (char_length(coalesce(source_url, '')) <= 2048)
);

create table if not exists public.ai_article50_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.ai_article50_assessments(id) on delete cascade,
  event_type text not null check (
    event_type in ('assessment_created', 'evidence_submitted', 'review_requested', 'source_changed')
  ),
  actor_user_id uuid not null references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_article50_assessments_org_updated_idx
  on public.ai_article50_assessments (organization_id, created_at desc);
create index if not exists ai_article50_assessments_system_version_idx
  on public.ai_article50_assessments (organization_id, ai_system_id, version desc);
create index if not exists ai_article50_evidence_assessment_idx
  on public.ai_article50_evidence (organization_id, assessment_id, created_at desc);
create index if not exists ai_article50_events_assessment_idx
  on public.ai_article50_events (organization_id, assessment_id, created_at desc);

alter table public.ai_article50_assessments enable row level security;
alter table public.ai_article50_assessments force row level security;
alter table public.ai_article50_evidence enable row level security;
alter table public.ai_article50_evidence force row level security;
alter table public.ai_article50_events enable row level security;
alter table public.ai_article50_events force row level security;

create policy article50_assessments_member_read
  on public.ai_article50_assessments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = ai_article50_assessments.organization_id
        and member.user_id = auth.uid()
    )
  );

create policy article50_evidence_member_read
  on public.ai_article50_evidence
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = ai_article50_evidence.organization_id
        and member.user_id = auth.uid()
    )
  );

create policy article50_events_member_read
  on public.ai_article50_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = ai_article50_events.organization_id
        and member.user_id = auth.uid()
    )
  );

revoke insert, update, delete on public.ai_article50_assessments from anon, authenticated;
revoke insert, update, delete on public.ai_article50_evidence from anon, authenticated;
revoke insert, update, delete on public.ai_article50_events from anon, authenticated;

grant select on public.ai_article50_assessments to authenticated;
grant select on public.ai_article50_evidence to authenticated;
grant select on public.ai_article50_events to authenticated;

create or replace function public.create_article50_assessment_version(
  p_organization_id uuid,
  p_ai_system_id uuid,
  p_actor_user_id uuid,
  p_status text,
  p_placed_on_market_at date,
  p_provider_machine_readable_marking boolean,
  p_deployer_disclosure boolean,
  p_final_amending_act_verified boolean,
  p_official_journal_evidence_id text,
  p_disclosure_copy text,
  p_disclosure_language text,
  p_disclosure_channel text,
  p_display_evidence_reference text,
  p_marking_evidence_reference text,
  p_legal_source_version text,
  p_evaluation jsonb,
  p_blockers text[],
  p_warnings text[]
)
returns public.ai_article50_assessments
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  created public.ai_article50_assessments;
begin
  if p_status not in ('BLOCKED', 'NEEDS_REVIEW', 'READY') then
    raise exception 'invalid_article50_status';
  end if;

  if not exists (
    select 1 from public.ai_systems system
    where system.id = p_ai_system_id
      and system.organization_id = p_organization_id
  ) then
    raise exception 'article50_ai_system_not_found';
  end if;

  if not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_actor_user_id
  ) then
    raise exception 'article50_actor_not_member';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_ai_system_id::text, 0));

  select coalesce(max(version), 0) + 1
    into next_version
  from public.ai_article50_assessments
  where organization_id = p_organization_id
    and ai_system_id = p_ai_system_id;

  insert into public.ai_article50_assessments (
    organization_id,
    ai_system_id,
    version,
    status,
    placed_on_market_at,
    provider_machine_readable_marking,
    deployer_disclosure,
    final_amending_act_verified,
    official_journal_evidence_id,
    disclosure_copy,
    disclosure_language,
    disclosure_channel,
    display_evidence_reference,
    marking_evidence_reference,
    legal_source_version,
    evaluation,
    blockers,
    warnings,
    created_by
  ) values (
    p_organization_id,
    p_ai_system_id,
    next_version,
    p_status,
    p_placed_on_market_at,
    p_provider_machine_readable_marking,
    p_deployer_disclosure,
    p_final_amending_act_verified,
    nullif(btrim(p_official_journal_evidence_id), ''),
    nullif(btrim(p_disclosure_copy), ''),
    nullif(btrim(p_disclosure_language), ''),
    nullif(btrim(p_disclosure_channel), ''),
    nullif(btrim(p_display_evidence_reference), ''),
    nullif(btrim(p_marking_evidence_reference), ''),
    p_legal_source_version,
    coalesce(p_evaluation, '{}'::jsonb),
    coalesce(p_blockers, '{}'),
    coalesce(p_warnings, '{}'),
    p_actor_user_id
  ) returning * into created;

  insert into public.ai_article50_events (
    organization_id,
    assessment_id,
    event_type,
    actor_user_id,
    payload
  ) values (
    p_organization_id,
    created.id,
    'assessment_created',
    p_actor_user_id,
    jsonb_build_object('version', created.version, 'status', created.status)
  );

  return created;
end;
$$;

revoke all on function public.create_article50_assessment_version(
  uuid, uuid, uuid, text, date, boolean, boolean, boolean, text, text, text,
  text, text, text, text, jsonb, text[], text[]
) from public, anon, authenticated;
grant execute on function public.create_article50_assessment_version(
  uuid, uuid, uuid, text, date, boolean, boolean, boolean, text, text, text,
  text, text, text, text, jsonb, text[], text[]
) to service_role;

comment on table public.ai_article50_assessments is
  'Append-only Article 50 assessment versions. A READY state is workflow readiness, not legal certification.';
comment on table public.ai_article50_evidence is
  'Tenant-scoped Article 50 evidence metadata. Templates and local files do not prove production operation.';
comment on table public.ai_article50_events is
  'Append-only lifecycle events for Article 50 assessments.';
