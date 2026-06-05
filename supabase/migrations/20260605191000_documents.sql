create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null default 'general',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  status text not null default 'active',
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Members can read documents"
on public.documents for select
using (public.is_org_member(organization_id));

create policy "Managers can create documents"
on public.documents for insert
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

create policy "Managers can update documents"
on public.documents for update
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));
