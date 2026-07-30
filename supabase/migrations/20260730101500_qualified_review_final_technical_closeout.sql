begin;

create table if not exists public.qualified_review_technical_closeouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  target_sha text not null check (target_sha ~ '^[a-f0-9]{40,64}$'),
  technical_complete boolean not null,
  human_status text not null check (human_status in ('HUMAN_EXECUTION_PENDING','HUMAN_EXECUTION_COMPLETE')),
  closeout_digest text not null check (closeout_digest ~ '^[a-f0-9]{64}$'),
  snapshot jsonb not null,
  finalized_by uuid not null references auth.users(id),
  finalized_at timestamptz not null default now(),
  superseded_at timestamptz,
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete cascade
);

create unique index if not exists qualified_review_technical_closeouts_current_idx
  on public.qualified_review_technical_closeouts(campaign_id)
  where superseded_at is null;

alter table public.qualified_review_technical_closeouts enable row level security;
alter table public.qualified_review_technical_closeouts force row level security;
revoke all on public.qualified_review_technical_closeouts from anon, authenticated;
grant select on public.qualified_review_technical_closeouts to authenticated;

create policy qualified_review_technical_closeouts_member_read
  on public.qualified_review_technical_closeouts for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.persist_qualified_review_technical_closeout(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_target_sha text,
  p_technical_complete boolean,
  p_human_status text,
  p_closeout_digest text,
  p_snapshot jsonb,
  p_finalized_by uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_human_status not in ('HUMAN_EXECUTION_PENDING','HUMAN_EXECUTION_COMPLETE') then raise exception 'invalid_human_status'; end if;
  update public.qualified_review_technical_closeouts set superseded_at = now()
    where campaign_id = p_campaign_id and organization_id = p_organization_id and superseded_at is null;
  insert into public.qualified_review_technical_closeouts(
    organization_id,campaign_id,target_sha,technical_complete,human_status,closeout_digest,snapshot,finalized_by
  ) values (
    p_organization_id,p_campaign_id,p_target_sha,p_technical_complete,p_human_status,p_closeout_digest,p_snapshot,p_finalized_by
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.persist_qualified_review_technical_closeout(uuid,uuid,text,boolean,text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.persist_qualified_review_technical_closeout(uuid,uuid,text,boolean,text,text,jsonb,uuid) to service_role;

commit;
