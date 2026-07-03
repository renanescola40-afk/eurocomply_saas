-- Harden ai_assessments for live multi-tenant RLS validation.
-- Idempotent: safe for environments where the table is new, already exists,
-- or still carries legacy workspace_id naming from earlier dashboard models.

create extension if not exists pgcrypto;

create table if not exists public.ai_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null default 'AI assessment',
  status text not null default 'draft',
  risk_score integer,
  risk_level text,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.ai_assessments
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists ai_system_id uuid references public.ai_systems(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists title text not null default 'AI assessment',
  add column if not exists status text not null default 'draft',
  add column if not exists risk_score integer,
  add column if not exists risk_level text,
  add column if not exists recommendations jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Compatibility backfill for deployments that still have workspace_id and where
-- workspace ids map to organization ids. Rows that cannot be mapped stay hidden by RLS.
do $$
begin
  if to_regclass('public.ai_assessments') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'ai_assessments'
         and column_name = 'workspace_id'
     ) then
    update public.ai_assessments
       set organization_id = workspace_id
     where organization_id is null
       and workspace_id is not null
       and exists (select 1 from public.organizations where id = workspace_id);
  end if;
end $$;

alter table public.ai_assessments enable row level security;
alter table public.ai_assessments force row level security;

revoke all on table public.ai_assessments from anon;
revoke insert, update, delete on table public.ai_assessments from authenticated;
grant select, insert, update, delete on table public.ai_assessments to authenticated;

drop policy if exists "Users can view own ai assessments" on public.ai_assessments;
drop policy if exists "Workspace members can view ai assessments" on public.ai_assessments;
drop policy if exists "Workspace managers can manage ai assessments" on public.ai_assessments;
drop policy if exists "Members can read ai assessments" on public.ai_assessments;
drop policy if exists "Managers can create ai assessments" on public.ai_assessments;
drop policy if exists "Managers can update ai assessments" on public.ai_assessments;
drop policy if exists "Managers can delete ai assessments" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_select_member" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_insert_writer" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_update_writer" on public.ai_assessments;
drop policy if exists "rls_ai_assessments_delete_admin" on public.ai_assessments;

create policy "rls_ai_assessments_select_member"
  on public.ai_assessments
  for select
  to authenticated
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

create policy "rls_ai_assessments_insert_writer"
  on public.ai_assessments
  for insert
  to authenticated
  with check (
    organization_id is not null
    and public.has_org_role(organization_id, array['owner','admin','editor','compliance_manager'])
  );

create policy "rls_ai_assessments_update_writer"
  on public.ai_assessments
  for update
  to authenticated
  using (
    organization_id is not null
    and public.has_org_role(organization_id, array['owner','admin','editor','compliance_manager'])
  )
  with check (
    organization_id is not null
    and public.has_org_role(organization_id, array['owner','admin','editor','compliance_manager'])
  );

create policy "rls_ai_assessments_delete_admin"
  on public.ai_assessments
  for delete
  to authenticated
  using (
    organization_id is not null
    and public.has_org_role(organization_id, array['owner','admin'])
  );

create index if not exists ai_assessments_organization_id_idx
  on public.ai_assessments(organization_id);

create index if not exists ai_assessments_org_created_at_idx
  on public.ai_assessments(organization_id, created_at desc);

notify pgrst, 'reload schema';
