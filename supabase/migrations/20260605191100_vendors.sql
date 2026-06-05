create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  website text,
  country text,
  category text not null default 'general',
  data_access_level text not null default 'unknown',
  risk_level text not null default 'medium',
  review_status text not null default 'pending',
  dpa_signed boolean not null default false,
  last_reviewed_at date,
  next_review_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create policy "Members can read vendors"
on public.vendors for select
using (public.is_org_member(organization_id));

create policy "Managers can manage vendors"
on public.vendors for all
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));
