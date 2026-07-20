-- Vendor governance integrity hardening.
-- Repository evidence only: this migration is not proof that production has applied it.

alter table public.vendors
  add column if not exists review_version integer not null default 1,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.vendors
  drop constraint if exists vendors_data_access_level_check,
  add constraint vendors_data_access_level_check
    check (data_access_level in ('unknown', 'none', 'low', 'medium', 'high')) not valid,
  drop constraint if exists vendors_risk_level_check,
  add constraint vendors_risk_level_check
    check (risk_level in ('low', 'medium', 'high')) not valid,
  drop constraint if exists vendors_review_status_check,
  add constraint vendors_review_status_check
    check (review_status in ('pending', 'in_review', 'approved', 'rejected')) not valid,
  drop constraint if exists vendors_review_dates_check,
  add constraint vendors_review_dates_check
    check (next_review_at is null or last_reviewed_at is null or next_review_at >= last_reviewed_at) not valid,
  drop constraint if exists vendors_approval_state_check,
  add constraint vendors_approval_state_check
    check (
      (review_status = 'approved' and approved_at is not null and approved_by is not null)
      or (review_status <> 'approved' and approved_at is null and approved_by is null)
    ) not valid;

create index if not exists vendors_org_review_due_idx
  on public.vendors (organization_id, next_review_at)
  where review_status = 'approved';

create index if not exists vendors_org_risk_status_idx
  on public.vendors (organization_id, risk_level, review_status);

create or replace function public.enforce_vendor_governance_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null and not exists (
    select 1 from public.organization_members om
    where om.organization_id = new.organization_id and om.user_id = new.created_by
  ) then
    raise exception 'vendor creator must belong to organization' using errcode = '23514';
  end if;

  if new.approved_by is not null and not exists (
    select 1 from public.organization_members om
    where om.organization_id = new.organization_id
      and om.user_id = new.approved_by
      and om.role in ('owner', 'admin', 'compliance_manager')
  ) then
    raise exception 'vendor approver must be an authorized organization member' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.review_version = old.review_version + 1;
    new.updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_vendor_actor_scope on public.vendors;
drop trigger if exists enforce_vendor_governance_integrity on public.vendors;
create trigger enforce_vendor_governance_integrity
before insert or update on public.vendors
for each row execute function public.enforce_vendor_governance_integrity();

create table if not exists public.vendor_review_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Deliberately no foreign key to vendors: deletion evidence must survive
  -- after the source vendor row is removed.
  vendor_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  operation text not null check (operation in ('created', 'updated', 'deleted')),
  previous_record jsonb,
  current_record jsonb,
  review_version integer not null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_review_history_vendor_idx
  on public.vendor_review_history (organization_id, vendor_id, review_version desc);

alter table public.vendor_review_history enable row level security;

drop policy if exists "Members can read vendor review history" on public.vendor_review_history;
create policy "Members can read vendor review history"
on public.vendor_review_history for select
using (public.is_org_member(organization_id));

revoke insert, update, delete on public.vendor_review_history from anon, authenticated;

create or replace function public.record_vendor_review_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_vendor uuid := coalesce(new.id, old.id);
  v_version integer := coalesce(new.review_version, old.review_version);
  -- Do not infer a mutation actor from creator/approver fields. Under service-role
  -- writes auth.uid() is null, and false attribution is worse than an explicit null.
  v_actor uuid := auth.uid();
begin
  insert into public.vendor_review_history (
    organization_id, vendor_id, actor_user_id, operation,
    previous_record, current_record, review_version
  ) values (
    v_org,
    v_vendor,
    v_actor,
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    v_version
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists record_vendor_review_history on public.vendors;
create trigger record_vendor_review_history
after insert or update or delete on public.vendors
for each row execute function public.record_vendor_review_history();

-- Supported writes must pass through reviewed backend code using service_role.
revoke insert, update, delete on public.vendors from anon, authenticated;
drop policy if exists "Managers can manage vendors" on public.vendors;

comment on table public.vendor_review_history is
  'Immutable database-maintained history for vendor governance changes, including retained deletion evidence; repository migration presence is not production deployment evidence.';