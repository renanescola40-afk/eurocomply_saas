alter table if exists public.vendors
  add column if not exists data_access_level text not null default 'low',
  add column if not exists dpa_signed boolean not null default false,
  add column if not exists created_by uuid;

create index if not exists vendors_organization_risk_idx
  on public.vendors (organization_id, risk_level);

create index if not exists vendors_organization_review_status_idx
  on public.vendors (organization_id, review_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_data_access_level_check'
      and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors
      add constraint vendors_data_access_level_check
      check (data_access_level in ('none', 'low', 'medium', 'high'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_risk_level_check'
      and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors
      add constraint vendors_risk_level_check
      check (risk_level in ('low', 'medium', 'high'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_review_status_check'
      and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors
      add constraint vendors_review_status_check
      check (review_status in ('pending', 'in_review', 'approved', 'rejected'));
  end if;
end $$;
