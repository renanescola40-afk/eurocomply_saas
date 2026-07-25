begin;

create table if not exists public.qualified_review_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  assignment_id uuid not null,
  stage text not null check (stage in ('invited','due_14d','due_7d','due_1d','overdue','expired','escalated')),
  recipient_email_hash text not null check (recipient_email_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null,
  delivery_status text not null check (delivery_status in ('pending','sent','skipped','failed')),
  provider_message_id text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, assignment_id, stage),
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete cascade,
  foreign key (assignment_id, organization_id) references public.qualified_review_assignments(id, organization_id) on delete cascade
);

create table if not exists public.qualified_review_promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  target_sha text not null check (target_sha ~ '^[a-f0-9]{40}$'),
  completed_weight integer not null check (completed_weight = 51),
  manifest jsonb not null,
  integrity_sha256 text not null check (integrity_sha256 ~ '^[a-f0-9]{64}$'),
  promoted_by uuid not null references auth.users(id),
  promoted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  unique (organization_id, campaign_id, target_sha),
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete restrict
);

alter table public.qualified_review_deliveries enable row level security;
alter table public.qualified_review_deliveries force row level security;
alter table public.qualified_review_promotions enable row level security;
alter table public.qualified_review_promotions force row level security;
revoke all on public.qualified_review_deliveries, public.qualified_review_promotions from anon, authenticated;
grant select on public.qualified_review_deliveries, public.qualified_review_promotions to authenticated;
create policy qualified_review_deliveries_read on public.qualified_review_deliveries for select to authenticated using (public.is_organization_member(organization_id));
create policy qualified_review_promotions_read on public.qualified_review_promotions for select to authenticated using (public.is_organization_member(organization_id));

create or replace function public.promote_qualified_review_campaign(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_actor_id uuid,
  p_manifest jsonb,
  p_integrity_sha256 text
)
returns public.qualified_review_promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.qualified_review_campaigns;
  v_completed integer;
  v_promotion public.qualified_review_promotions;
begin
  select * into v_campaign from public.qualified_review_campaigns
  where id = p_campaign_id and organization_id = p_organization_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if not public.is_organization_member(p_organization_id) then raise exception 'forbidden'; end if;
  if v_campaign.status = 'closed' then raise exception 'campaign_already_closed'; end if;
  select coalesce(sum(a.weight),0) into v_completed
  from public.qualified_review_assignments a
  where a.campaign_id = p_campaign_id and a.organization_id = p_organization_id
    and a.status = 'accepted' and a.approved_at is not null
    and exists (select 1 from public.qualified_review_submissions s where s.assignment_id = a.id and s.organization_id = a.organization_id and s.superseded_at is null and s.valid_until > now());
  if v_completed <> 51 then raise exception 'qualified_review_incomplete'; end if;
  insert into public.qualified_review_promotions(organization_id,campaign_id,target_sha,completed_weight,manifest,integrity_sha256,promoted_by)
  values (p_organization_id,p_campaign_id,v_campaign.target_sha,51,p_manifest,p_integrity_sha256,p_actor_id)
  returning * into v_promotion;
  update public.qualified_review_campaigns set status='closed', closed_at=now(), version=version+1 where id=p_campaign_id;
  insert into public.qualified_review_events(organization_id,campaign_id,actor_id,event_type,payload)
  values(p_organization_id,p_campaign_id,p_actor_id,'campaign_promoted',jsonb_build_object('promotionId',v_promotion.id,'targetSha',v_campaign.target_sha));
  return v_promotion;
end;
$$;
revoke all on function public.promote_qualified_review_campaign(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.promote_qualified_review_campaign(uuid,uuid,uuid,jsonb,text) to service_role;

commit;
