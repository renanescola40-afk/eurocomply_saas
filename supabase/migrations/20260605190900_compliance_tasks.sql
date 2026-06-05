create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compliance_tasks enable row level security;

create policy "Members can read compliance tasks"
on public.compliance_tasks for select
using (public.is_org_member(organization_id));

create policy "Managers can create compliance tasks"
on public.compliance_tasks for insert
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

create policy "Managers can update compliance tasks"
on public.compliance_tasks for update
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));
