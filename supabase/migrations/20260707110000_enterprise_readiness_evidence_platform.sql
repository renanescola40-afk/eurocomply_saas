-- Enterprise readiness and evidence operations.
-- Additive only: creates operational tables for evidence packs, vendor diligence and risk-review workflows.

create table if not exists public.enterprise_evidence_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'exported')),
  scope text not null default 'ai_act_readiness',
  country_scope text[] not null default array['EU']::text[],
  summary text,
  readiness_score_snapshot integer check (readiness_score_snapshot between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_evidence_pack_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pack_id uuid not null references public.enterprise_evidence_packs(id) on delete cascade,
  item_type text not null check (item_type in ('ai_system', 'document', 'vendor', 'risk_review', 'task', 'policy', 'control', 'executive_report')),
  title text not null,
  source_table text,
  source_id uuid,
  status text not null default 'missing' check (status in ('missing', 'in_progress', 'ready', 'approved')),
  owner text,
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_vendor_due_diligence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  vendor_name text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'approved', 'blocked')),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  checklist jsonb not null default '[]'::jsonb,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  next_review_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_risk_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  risk_level text not null default 'limited_transparency',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected', 'remediation_required')),
  decision text,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enterprise_evidence_packs_org_idx
  on public.enterprise_evidence_packs(organization_id, updated_at desc);
create index if not exists enterprise_evidence_pack_items_pack_idx
  on public.enterprise_evidence_pack_items(pack_id, status);
create index if not exists enterprise_evidence_pack_items_org_idx
  on public.enterprise_evidence_pack_items(organization_id, status);
create index if not exists enterprise_vendor_due_diligence_org_idx
  on public.enterprise_vendor_due_diligence(organization_id, status, risk_level);
create index if not exists enterprise_vendor_due_diligence_ai_system_idx
  on public.enterprise_vendor_due_diligence(organization_id, ai_system_id);
create index if not exists enterprise_risk_reviews_org_idx
  on public.enterprise_risk_reviews(organization_id, status, due_at);
create index if not exists enterprise_risk_reviews_ai_system_idx
  on public.enterprise_risk_reviews(organization_id, ai_system_id);

alter table public.enterprise_evidence_packs enable row level security;
alter table public.enterprise_evidence_pack_items enable row level security;
alter table public.enterprise_vendor_due_diligence enable row level security;
alter table public.enterprise_risk_reviews enable row level security;

create or replace function public.enterprise_member_can_read(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.enterprise_member_can_manage(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and lower(coalesce(om.role, 'viewer')) in ('owner', 'admin', 'editor', 'compliance_manager')
  );
$$;

-- Evidence packs

drop policy if exists "Members can read enterprise evidence packs" on public.enterprise_evidence_packs;
create policy "Members can read enterprise evidence packs"
  on public.enterprise_evidence_packs for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can create enterprise evidence packs" on public.enterprise_evidence_packs;
create policy "Managers can create enterprise evidence packs"
  on public.enterprise_evidence_packs for insert
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can update enterprise evidence packs" on public.enterprise_evidence_packs;
create policy "Managers can update enterprise evidence packs"
  on public.enterprise_evidence_packs for update
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can delete enterprise evidence packs" on public.enterprise_evidence_packs;
create policy "Managers can delete enterprise evidence packs"
  on public.enterprise_evidence_packs for delete
  using (public.enterprise_member_can_manage(organization_id));

-- Evidence pack items

drop policy if exists "Members can read enterprise evidence pack items" on public.enterprise_evidence_pack_items;
create policy "Members can read enterprise evidence pack items"
  on public.enterprise_evidence_pack_items for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can create enterprise evidence pack items" on public.enterprise_evidence_pack_items;
create policy "Managers can create enterprise evidence pack items"
  on public.enterprise_evidence_pack_items for insert
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can update enterprise evidence pack items" on public.enterprise_evidence_pack_items;
create policy "Managers can update enterprise evidence pack items"
  on public.enterprise_evidence_pack_items for update
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can delete enterprise evidence pack items" on public.enterprise_evidence_pack_items;
create policy "Managers can delete enterprise evidence pack items"
  on public.enterprise_evidence_pack_items for delete
  using (public.enterprise_member_can_manage(organization_id));

-- Vendor due diligence

drop policy if exists "Members can read enterprise vendor due diligence" on public.enterprise_vendor_due_diligence;
create policy "Members can read enterprise vendor due diligence"
  on public.enterprise_vendor_due_diligence for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can create enterprise vendor due diligence" on public.enterprise_vendor_due_diligence;
create policy "Managers can create enterprise vendor due diligence"
  on public.enterprise_vendor_due_diligence for insert
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can update enterprise vendor due diligence" on public.enterprise_vendor_due_diligence;
create policy "Managers can update enterprise vendor due diligence"
  on public.enterprise_vendor_due_diligence for update
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can delete enterprise vendor due diligence" on public.enterprise_vendor_due_diligence;
create policy "Managers can delete enterprise vendor due diligence"
  on public.enterprise_vendor_due_diligence for delete
  using (public.enterprise_member_can_manage(organization_id));

-- Risk reviews

drop policy if exists "Members can read enterprise risk reviews" on public.enterprise_risk_reviews;
create policy "Members can read enterprise risk reviews"
  on public.enterprise_risk_reviews for select
  using (public.enterprise_member_can_read(organization_id));

drop policy if exists "Managers can create enterprise risk reviews" on public.enterprise_risk_reviews;
create policy "Managers can create enterprise risk reviews"
  on public.enterprise_risk_reviews for insert
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can update enterprise risk reviews" on public.enterprise_risk_reviews;
create policy "Managers can update enterprise risk reviews"
  on public.enterprise_risk_reviews for update
  using (public.enterprise_member_can_manage(organization_id))
  with check (public.enterprise_member_can_manage(organization_id));

drop policy if exists "Managers can delete enterprise risk reviews" on public.enterprise_risk_reviews;
create policy "Managers can delete enterprise risk reviews"
  on public.enterprise_risk_reviews for delete
  using (public.enterprise_member_can_manage(organization_id));
