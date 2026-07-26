begin;

create table if not exists public.qualified_reviewer_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  reviewer_id uuid not null,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token_hash),
  unique (assignment_id, reviewer_id),
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade,
  foreign key (reviewer_id, organization_id) references public.qualified_reviewers(id, organization_id) on delete cascade
);

create table if not exists public.qualified_reviewer_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  reviewer_id uuid not null,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  unique (session_hash),
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade,
  foreign key (reviewer_id, organization_id) references public.qualified_reviewers(id, organization_id) on delete cascade
);

create table if not exists public.qualified_reviewer_attestations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null,
  reviewer_id uuid not null,
  independence_confirmed boolean not null,
  conflict_details text,
  scope_acknowledged boolean not null,
  attestation_digest text not null check (attestation_digest ~ '^[a-f0-9]{64}$'),
  attested_at timestamptz not null default now(),
  unique (assignment_id, reviewer_id),
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade,
  foreign key (reviewer_id, organization_id) references public.qualified_reviewers(id, organization_id) on delete cascade
);

create index if not exists qualified_reviewer_invites_expiry_idx on public.qualified_reviewer_invites (expires_at) where accepted_at is null and revoked_at is null;
create index if not exists qualified_reviewer_sessions_expiry_idx on public.qualified_reviewer_sessions (expires_at) where revoked_at is null;

alter table public.qualified_reviewer_invites enable row level security;
alter table public.qualified_reviewer_invites force row level security;
alter table public.qualified_reviewer_sessions enable row level security;
alter table public.qualified_reviewer_sessions force row level security;
alter table public.qualified_reviewer_attestations enable row level security;
alter table public.qualified_reviewer_attestations force row level security;

revoke all on public.qualified_reviewer_invites, public.qualified_reviewer_sessions, public.qualified_reviewer_attestations from anon, authenticated;
grant select on public.qualified_reviewer_invites, public.qualified_reviewer_sessions, public.qualified_reviewer_attestations to authenticated;

create policy qualified_reviewer_invites_member_read on public.qualified_reviewer_invites for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_reviewer_sessions_member_read on public.qualified_reviewer_sessions for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_reviewer_attestations_member_read on public.qualified_reviewer_attestations for select to authenticated using (public.is_organization_member(organization_id));

create or replace function public.accept_qualified_reviewer_invite(
  p_token_hash text,
  p_session_hash text,
  p_session_expires_at timestamptz
)
returns table (assignment_id uuid, reviewer_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.qualified_reviewer_invites;
begin
  select * into v_invite from public.qualified_reviewer_invites
  where token_hash = p_token_hash for update;
  if not found then raise exception 'invite_not_found'; end if;
  if v_invite.revoked_at is not null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then raise exception 'invite_unavailable'; end if;
  update public.qualified_reviewer_invites set accepted_at = now() where id = v_invite.id;
  insert into public.qualified_reviewer_sessions(organization_id, assignment_id, reviewer_id, session_hash, expires_at)
  values (v_invite.organization_id, v_invite.assignment_id, v_invite.reviewer_id, p_session_hash, p_session_expires_at);
  insert into public.qualified_review_events(organization_id, campaign_id, assignment_id, event_type, payload)
  select a.organization_id, a.campaign_id, a.id, 'reviewer_invite_accepted', jsonb_build_object('reviewerId', v_invite.reviewer_id)
  from public.qualified_review_assignments a where a.id = v_invite.assignment_id;
  return query select v_invite.assignment_id, v_invite.reviewer_id, v_invite.organization_id;
end;
$$;

revoke all on function public.accept_qualified_reviewer_invite(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.accept_qualified_reviewer_invite(text, text, timestamptz) to service_role;

commit;
