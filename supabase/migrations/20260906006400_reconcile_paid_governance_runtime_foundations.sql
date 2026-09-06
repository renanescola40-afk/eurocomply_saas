begin;

-- Forward-only reconciliation for paid governance runtime foundations that are
-- referenced by the final application but absent from the verified Production
-- schema. This does not replay historical migration versions or mutate the
-- Supabase migration ledger. It materializes only the current runtime contract.

do $preflight$
declare
  required_column text;
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.ai_systems') is null
     or to_regclass('auth.users') is null then
    raise exception 'Paid governance reconciliation prerequisites are missing';
  end if;

  foreach required_column in array array[
    'organization_id',
    'name',
    'country_market',
    'owner_team',
    'classification_summary'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_systems'
        and column_name = required_column
    ) then
      raise exception 'Required ai_systems column is missing: %', required_column;
    end if;
  end loop;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- Enterprise evidence / procurement workflow foundation.
-- ---------------------------------------------------------------------------

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
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
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

do $evidence_pack_tenant_integrity$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_evidence_packs_id_organization_id_key'
      and conrelid = 'public.enterprise_evidence_packs'::regclass
  ) then
    alter table public.enterprise_evidence_packs
      add constraint enterprise_evidence_packs_id_organization_id_key
      unique (id, organization_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_evidence_pack_items_pack_organization_fkey'
      and conrelid = 'public.enterprise_evidence_pack_items'::regclass
  ) then
    alter table public.enterprise_evidence_pack_items
      add constraint enterprise_evidence_pack_items_pack_organization_fkey
      foreign key (pack_id, organization_id)
      references public.enterprise_evidence_packs(id, organization_id)
      on delete cascade;
  end if;
end
$evidence_pack_tenant_integrity$;

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

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.enterprise_member_can_read(p_organization_id);
$$;

revoke all on function public.enterprise_member_can_read(uuid) from public, anon;
revoke all on function public.enterprise_member_can_manage(uuid) from public, anon;
revoke all on function public.is_organization_member(uuid) from public, anon;
grant execute on function public.enterprise_member_can_read(uuid) to authenticated, service_role;
grant execute on function public.enterprise_member_can_manage(uuid) to authenticated, service_role;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;

do $enterprise_policy_reset$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'enterprise_evidence_packs',
    'enterprise_evidence_pack_items',
    'enterprise_vendor_due_diligence',
    'enterprise_risk_reviews'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$enterprise_policy_reset$;

create policy rls_enterprise_evidence_packs_select_member
  on public.enterprise_evidence_packs
  for select to authenticated
  using (public.enterprise_member_can_read(organization_id));
create policy rls_enterprise_evidence_pack_items_select_member
  on public.enterprise_evidence_pack_items
  for select to authenticated
  using (public.enterprise_member_can_read(organization_id));
create policy rls_enterprise_vendor_due_diligence_select_member
  on public.enterprise_vendor_due_diligence
  for select to authenticated
  using (public.enterprise_member_can_read(organization_id));
create policy rls_enterprise_risk_reviews_select_member
  on public.enterprise_risk_reviews
  for select to authenticated
  using (public.enterprise_member_can_read(organization_id));

create policy rls_enterprise_evidence_packs_insert_backend_only
  on public.enterprise_evidence_packs for insert to authenticated with check (false);
create policy rls_enterprise_evidence_packs_update_backend_only
  on public.enterprise_evidence_packs for update to authenticated using (false) with check (false);
create policy rls_enterprise_evidence_packs_delete_backend_only
  on public.enterprise_evidence_packs for delete to authenticated using (false);
create policy rls_enterprise_evidence_pack_items_insert_backend_only
  on public.enterprise_evidence_pack_items for insert to authenticated with check (false);
create policy rls_enterprise_evidence_pack_items_update_backend_only
  on public.enterprise_evidence_pack_items for update to authenticated using (false) with check (false);
create policy rls_enterprise_evidence_pack_items_delete_backend_only
  on public.enterprise_evidence_pack_items for delete to authenticated using (false);
create policy rls_enterprise_vendor_due_diligence_insert_backend_only
  on public.enterprise_vendor_due_diligence for insert to authenticated with check (false);
create policy rls_enterprise_vendor_due_diligence_update_backend_only
  on public.enterprise_vendor_due_diligence for update to authenticated using (false) with check (false);
create policy rls_enterprise_vendor_due_diligence_delete_backend_only
  on public.enterprise_vendor_due_diligence for delete to authenticated using (false);
create policy rls_enterprise_risk_reviews_insert_backend_only
  on public.enterprise_risk_reviews for insert to authenticated with check (false);
create policy rls_enterprise_risk_reviews_update_backend_only
  on public.enterprise_risk_reviews for update to authenticated using (false) with check (false);
create policy rls_enterprise_risk_reviews_delete_backend_only
  on public.enterprise_risk_reviews for delete to authenticated using (false);

revoke all on public.enterprise_evidence_packs from anon, authenticated;
revoke all on public.enterprise_evidence_pack_items from anon, authenticated;
revoke all on public.enterprise_vendor_due_diligence from anon, authenticated;
revoke all on public.enterprise_risk_reviews from anon, authenticated;
grant select on public.enterprise_evidence_packs to authenticated;
grant select on public.enterprise_evidence_pack_items to authenticated;
grant select on public.enterprise_vendor_due_diligence to authenticated;
grant select on public.enterprise_risk_reviews to authenticated;
grant select, insert, update, delete on public.enterprise_evidence_packs to service_role;
grant select, insert, update, delete on public.enterprise_evidence_pack_items to service_role;
grant select, insert, update, delete on public.enterprise_vendor_due_diligence to service_role;
grant select, insert, update, delete on public.enterprise_risk_reviews to service_role;

create or replace function public.create_enterprise_evidence_pack_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_country_scope text[],
  p_readiness_score_snapshot integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack public.enterprise_evidence_packs%rowtype;
  v_items jsonb;
begin
  if p_organization_id is null or p_actor_user_id is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(p_title)) > 140 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;

  if p_readiness_score_snapshot is not null
     and (p_readiness_score_snapshot < 0 or p_readiness_score_snapshot > 100) then
    raise exception 'invalid_readiness_score' using errcode = '22023';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  insert into public.enterprise_evidence_packs (
    organization_id, title, scope, country_scope, summary,
    readiness_score_snapshot, created_by
  ) values (
    p_organization_id,
    trim(p_title),
    'ai_act_readiness',
    case when coalesce(cardinality(p_country_scope), 0) > 0 then p_country_scope else array['EU']::text[] end,
    'Evidence pack generated from current workspace AI systems and operational readiness signals.',
    p_readiness_score_snapshot,
    p_actor_user_id
  ) returning * into v_pack;

  insert into public.enterprise_evidence_pack_items (
    organization_id, pack_id, item_type, title, source_table,
    source_id, status, owner, notes
  ) values (
    p_organization_id, v_pack.id, 'executive_report', 'Executive readiness report',
    'enterprise_evidence_packs', v_pack.id, 'ready', 'Compliance lead',
    'Generated from real readiness signals in this organization.'
  );

  insert into public.enterprise_evidence_pack_items (
    organization_id, pack_id, item_type, title, source_table,
    source_id, status, owner, notes
  )
  select
    p_organization_id,
    v_pack.id,
    'ai_system',
    'AI system registry: ' || s.name,
    'ai_systems',
    s.id,
    'ready',
    coalesce(s.owner_team, 'Unassigned'),
    s.classification_summary
  from public.ai_systems s
  where s.organization_id = p_organization_id;

  if not exists (select 1 from public.ai_systems s where s.organization_id = p_organization_id) then
    insert into public.enterprise_evidence_pack_items (
      organization_id, pack_id, item_type, title, source_table,
      source_id, status, owner, notes
    ) values (
      p_organization_id, v_pack.id, 'ai_system', 'AI system registry baseline',
      null, null, 'missing', 'Compliance lead',
      'Register at least one real AI system before exporting a procurement packet.'
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at, i.id), '[]'::jsonb)
  into v_items
  from public.enterprise_evidence_pack_items i
  where i.organization_id = p_organization_id
    and i.pack_id = v_pack.id;

  return jsonb_build_object('pack', to_jsonb(v_pack), 'items', v_items);
end;
$$;

revoke all on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) from public, anon, authenticated;
grant execute on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) to service_role;

-- ---------------------------------------------------------------------------
-- QMS foundation and operational workflow.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_qms_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 3 and 200),
  scope text not null default '',
  quality_policy text not null default '',
  regulatory_strategy text not null default '',
  status text not null default 'draft' check (status in ('draft','planning','operating','management_review','approval','approved','blocked','retired')),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  severe_nonconformities_count integer not null default 0 check (severe_nonconformities_count >= 0),
  overdue_corrective_actions_count integer not null default 0 check (overdue_corrective_actions_count >= 0),
  effective_from timestamptz,
  next_review_at timestamptz,
  management_reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, title, version),
  constraint ai_qms_systems_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (approver_user_id is null or reviewer_user_id is null or approver_user_id <> reviewer_user_id)
  ),
  constraint ai_qms_systems_approval_integrity check (
    status <> 'approved' or (
      reviewer_user_id is not null and approver_user_id is not null
      and management_reviewed_at is not null and approved_at is not null
      and severe_nonconformities_count = 0 and overdue_corrective_actions_count = 0
    )
  ),
  constraint ai_qms_systems_retirement_integrity check (status <> 'retired' or retired_at is not null)
);

create table if not exists public.ai_qms_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  control_code text not null check (control_code ~ '^QMS-[0-9]{2,3}$'),
  category text not null check (category in ('governance','documents','records','design','suppliers','data','risk','monitoring','incidents','change','competence','audit','management_review','corrective_action','regulatory')),
  title text not null check (char_length(btrim(title)) between 3 and 240),
  status text not null default 'not_started' check (status in ('not_started','in_progress','implemented','tested','effective','ineffective','not_applicable')),
  owner_user_id uuid references auth.users(id),
  due_at timestamptz,
  last_tested_at timestamptz,
  next_test_at timestamptz,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_reference text,
  rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, qms_system_id, control_code),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade
);

create table if not exists public.ai_qms_nonconformities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  source text not null check (source in ('internal_audit','management_review','incident','monitoring','complaint','supplier','regulatory','other')),
  status text not null default 'open' check (status in ('open','contained','root_cause','corrective_action','effectiveness_review','closed','accepted_risk')),
  description text not null check (char_length(btrim(description)) between 10 and 4000),
  containment text not null default '',
  root_cause text not null default '',
  corrective_action text not null default '',
  owner_user_id uuid not null references auth.users(id),
  due_at timestamptz,
  verified_by_user_id uuid references auth.users(id),
  verified_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade,
  constraint ai_qms_nonconformities_verifier_separation check (verified_by_user_id is null or verified_by_user_id <> owner_user_id),
  constraint ai_qms_nonconformities_closure_integrity check (
    status <> 'closed' or (
      char_length(btrim(root_cause)) >= 10
      and char_length(btrim(corrective_action)) >= 10
      and verified_by_user_id is not null and verified_at is not null and closed_at is not null
    )
  )
);

create table if not exists public.ai_qms_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  decision_type text not null check (decision_type in ('scope_approved','policy_approved','control_exception','audit_accepted','management_review','corrective_action_verified','qms_approved','qms_blocked','qms_retired')),
  outcome text not null check (outcome in ('approved','rejected','needs_work','blocked','retired')),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade
);

create table if not exists public.ai_qms_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  audit_type text not null check (audit_type in ('internal','supplier','process','product','regulatory')),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','accepted','cancelled')),
  scope text not null check (char_length(btrim(scope)) between 10 and 4000),
  lead_auditor_user_id uuid not null references auth.users(id),
  reviewed_by_user_id uuid references auth.users(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  accepted_at timestamptz,
  findings_count integer not null default 0 check (findings_count >= 0),
  high_findings_count integer not null default 0 check (high_findings_count >= 0),
  critical_findings_count integer not null default 0 check (critical_findings_count >= 0),
  report_reference text,
  report_digest text check (report_digest is null or report_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade,
  constraint ai_qms_audit_reviewer_separation check (reviewed_by_user_id is null or reviewed_by_user_id <> lead_auditor_user_id),
  constraint ai_qms_audit_acceptance_integrity check (
    status <> 'accepted' or (
      completed_at is not null and accepted_at is not null and reviewed_by_user_id is not null
      and report_reference is not null and report_digest is not null
      and high_findings_count = 0 and critical_findings_count = 0
    )
  )
);

create table if not exists public.ai_qms_management_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  status text not null default 'draft' check (status in ('draft','scheduled','in_review','completed','approved','cancelled')),
  period_start date not null,
  period_end date not null,
  inputs_summary text not null default '',
  decisions_summary text not null default '',
  action_items_count integer not null default 0 check (action_items_count >= 0),
  open_action_items_count integer not null default 0 check (open_action_items_count >= 0),
  chair_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approved_by_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  evidence_reference text,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade,
  constraint ai_qms_management_review_period check (period_end >= period_start),
  constraint ai_qms_management_review_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> chair_user_id)
    and (approved_by_user_id is null or approved_by_user_id <> chair_user_id)
    and (approved_by_user_id is null or reviewer_user_id is null or approved_by_user_id <> reviewer_user_id)
  ),
  constraint ai_qms_management_review_approval_integrity check (
    status <> 'approved' or (
      char_length(btrim(inputs_summary)) >= 20 and char_length(btrim(decisions_summary)) >= 20
      and reviewer_user_id is not null and approved_by_user_id is not null
      and reviewed_at is not null and approved_at is not null
      and evidence_reference is not null and evidence_digest is not null
      and open_action_items_count = 0
    )
  )
);

create index if not exists ai_qms_systems_org_status_idx on public.ai_qms_systems (organization_id, status, next_review_at);
create index if not exists ai_qms_controls_due_idx on public.ai_qms_controls (organization_id, status, due_at);
create index if not exists ai_qms_nonconformities_queue_idx on public.ai_qms_nonconformities (organization_id, status, severity, due_at);
create index if not exists ai_qms_decisions_history_idx on public.ai_qms_decisions (organization_id, qms_system_id, created_at desc);

create or replace function public.ai_qms_actor_is_member(target_organization_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user_id is null or exists (
    select 1 from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = target_user_id
  );
$$;

create or replace function public.enforce_ai_qms_system_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.approver_user_id) then
    raise exception 'QMS system actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_control_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id) then
    raise exception 'QMS control owner must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_nonconformity_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.verified_by_user_id) then
    raise exception 'QMS nonconformity actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'QMS decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_operational_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'ai_qms_audits' then
    if not public.ai_qms_actor_is_member(new.organization_id,new.lead_auditor_user_id)
       or not public.ai_qms_actor_is_member(new.organization_id,new.reviewed_by_user_id) then
      raise exception 'qms_audit_actor_scope';
    end if;
  else
    if not public.ai_qms_actor_is_member(new.organization_id,new.chair_user_id)
       or not public.ai_qms_actor_is_member(new.organization_id,new.reviewer_user_id)
       or not public.ai_qms_actor_is_member(new.organization_id,new.approved_by_user_id) then
      raise exception 'qms_review_actor_scope';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_qms_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.qms_compensation', true) = 'on' then return old; end if;
  raise exception 'QMS decisions are append-only';
end;
$$;

create or replace function public.refresh_qms_system_counters(p_organization_id uuid, p_qms_system_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_severe integer;
  v_overdue integer;
begin
  select
    count(*) filter (where severity in ('high','critical') and status not in ('closed','accepted_risk')),
    count(*) filter (where due_at < now() and status not in ('closed','accepted_risk'))
  into v_severe, v_overdue
  from public.ai_qms_nonconformities
  where organization_id = p_organization_id and qms_system_id = p_qms_system_id;

  update public.ai_qms_systems
  set severe_nonconformities_count = coalesce(v_severe,0),
      overdue_corrective_actions_count = coalesce(v_overdue,0),
      updated_at = now()
  where organization_id = p_organization_id and id = p_qms_system_id;
end;
$$;

create or replace function public.sync_qms_counters_after_nonconformity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_qms_system_counters(
    coalesce(new.organization_id, old.organization_id),
    coalesce(new.qms_system_id, old.qms_system_id)
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.assert_qms_mutable(p_organization_id uuid, p_qms_system_id uuid)
returns public.ai_qms_systems
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qms public.ai_qms_systems;
begin
  select * into v_qms
  from public.ai_qms_systems
  where organization_id = p_organization_id and id = p_qms_system_id
  for update;
  if not found then raise exception 'qms_not_found'; end if;
  if v_qms.status in ('approved','retired') then raise exception 'qms_immutable_state'; end if;
  return v_qms;
end;
$$;

create or replace function public.create_qms_system_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_scope text,
  p_quality_policy text,
  p_regulatory_strategy text
)
returns setof public.ai_qms_systems
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version integer;
  v_row public.ai_qms_systems;
begin
  if not public.ai_qms_actor_is_member(p_organization_id, p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  perform pg_catalog.pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || lower(btrim(p_title)), 0));
  select coalesce(max(version), 0) + 1 into v_version
  from public.ai_qms_systems
  where organization_id = p_organization_id and lower(title) = lower(btrim(p_title));
  insert into public.ai_qms_systems (organization_id, version, title, scope, quality_policy, regulatory_strategy, status, owner_user_id)
  values (p_organization_id, v_version, btrim(p_title), btrim(p_scope), btrim(p_quality_policy), btrim(p_regulatory_strategy), 'planning', p_actor_user_id)
  returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.configure_qms_system_atomic(
  p_organization_id uuid,
  p_qms_system_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_reviewer_user_id uuid,
  p_approver_user_id uuid
)
returns setof public.ai_qms_systems
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qms public.ai_qms_systems;
begin
  v_qms := public.assert_qms_mutable(p_organization_id, p_qms_system_id);
  if v_qms.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id)
     or not public.ai_qms_actor_is_member(p_organization_id,p_reviewer_user_id)
     or not public.ai_qms_actor_is_member(p_organization_id,p_approver_user_id) then
    raise exception 'qms_actor_not_member';
  end if;
  if p_reviewer_user_id in (v_qms.owner_user_id,p_approver_user_id)
     or p_approver_user_id = v_qms.owner_user_id then
    raise exception 'qms_actor_separation_required';
  end if;
  update public.ai_qms_systems
  set reviewer_user_id=p_reviewer_user_id,
      approver_user_id=p_approver_user_id,
      status='operating',
      updated_at=now()
  where organization_id=p_organization_id and id=p_qms_system_id
  returning * into v_qms;
  return next v_qms;
end;
$$;

create or replace function public.complete_qms_control_atomic(
  p_organization_id uuid,
  p_control_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_status text,
  p_rationale text,
  p_evidence_reference text,
  p_evidence_digest text
)
returns setof public.ai_qms_controls
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_control public.ai_qms_controls;
  v_qms public.ai_qms_systems;
begin
  select * into v_control
  from public.ai_qms_controls
  where organization_id=p_organization_id and id=p_control_id
  for update;
  if not found then raise exception 'qms_control_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_control.qms_system_id);
  if v_control.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if p_status not in ('effective','not_applicable') then raise exception 'qms_control_terminal_status_required'; end if;
  if char_length(btrim(p_rationale)) < 10 then raise exception 'qms_control_rationale_required'; end if;
  if p_status='effective' and (p_evidence_reference is null or p_evidence_digest !~ '^[a-f0-9]{64}$') then
    raise exception 'qms_control_evidence_required';
  end if;
  update public.ai_qms_controls
  set status=p_status,
      rationale=btrim(p_rationale),
      evidence_reference=p_evidence_reference,
      evidence_digest=p_evidence_digest,
      last_tested_at=now(),
      updated_at=now()
  where organization_id=p_organization_id and id=p_control_id
  returning * into v_control;
  update public.ai_qms_systems set updated_at=now()
  where organization_id=p_organization_id and id=v_control.qms_system_id;
  return next v_control;
end;
$$;

create or replace function public.accept_qms_audit_atomic(
  p_organization_id uuid,
  p_audit_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_findings_count integer,
  p_high_findings_count integer,
  p_critical_findings_count integer,
  p_report_reference text,
  p_report_digest text
)
returns setof public.ai_qms_audits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit public.ai_qms_audits;
  v_qms public.ai_qms_systems;
begin
  select * into v_audit from public.ai_qms_audits
  where organization_id=p_organization_id and id=p_audit_id for update;
  if not found then raise exception 'qms_audit_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_audit.qms_system_id);
  if v_audit.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id = v_audit.lead_auditor_user_id then raise exception 'qms_independent_reviewer_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if p_high_findings_count <> 0 or p_critical_findings_count <> 0 then raise exception 'qms_audit_severe_findings'; end if;
  if p_report_digest !~ '^[a-f0-9]{64}$' or char_length(btrim(p_report_reference)) < 3 then raise exception 'qms_audit_report_required'; end if;
  update public.ai_qms_audits
  set status='accepted', reviewed_by_user_id=p_actor_user_id,
      completed_at=coalesce(completed_at,now()), accepted_at=now(),
      findings_count=p_findings_count, high_findings_count=p_high_findings_count,
      critical_findings_count=p_critical_findings_count,
      report_reference=btrim(p_report_reference), report_digest=p_report_digest,
      updated_at=now()
  where organization_id=p_organization_id and id=p_audit_id
  returning * into v_audit;
  update public.ai_qms_systems set updated_at=now()
  where organization_id=p_organization_id and id=v_audit.qms_system_id;
  return next v_audit;
end;
$$;

create or replace function public.approve_qms_management_review_atomic(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_reviewer_user_id uuid,
  p_inputs_summary text,
  p_decisions_summary text,
  p_evidence_reference text,
  p_evidence_digest text
)
returns setof public.ai_qms_management_reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review public.ai_qms_management_reviews;
  v_qms public.ai_qms_systems;
begin
  select * into v_review from public.ai_qms_management_reviews
  where organization_id=p_organization_id and id=p_review_id for update;
  if not found then raise exception 'qms_management_review_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_review.qms_system_id);
  if v_review.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id in (v_review.chair_user_id,p_reviewer_user_id)
     or p_reviewer_user_id=v_review.chair_user_id then raise exception 'qms_actor_separation_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id)
     or not public.ai_qms_actor_is_member(p_organization_id,p_reviewer_user_id) then raise exception 'qms_actor_not_member'; end if;
  if char_length(btrim(p_inputs_summary))<20 or char_length(btrim(p_decisions_summary))<20 then raise exception 'qms_management_review_incomplete'; end if;
  if p_evidence_digest !~ '^[a-f0-9]{64}$' or char_length(btrim(p_evidence_reference))<3 then raise exception 'qms_management_review_evidence_required'; end if;
  update public.ai_qms_management_reviews
  set status='approved', reviewer_user_id=p_reviewer_user_id,
      approved_by_user_id=p_actor_user_id,
      inputs_summary=btrim(p_inputs_summary), decisions_summary=btrim(p_decisions_summary),
      open_action_items_count=0, reviewed_at=now(), approved_at=now(),
      evidence_reference=btrim(p_evidence_reference), evidence_digest=p_evidence_digest,
      updated_at=now()
  where organization_id=p_organization_id and id=p_review_id
  returning * into v_review;
  update public.ai_qms_systems set management_reviewed_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=v_review.qms_system_id;
  return next v_review;
end;
$$;

create or replace function public.close_qms_nonconformity_atomic(
  p_organization_id uuid,
  p_nonconformity_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_root_cause text,
  p_corrective_action text
)
returns setof public.ai_qms_nonconformities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nc public.ai_qms_nonconformities;
  v_qms public.ai_qms_systems;
begin
  select * into v_nc from public.ai_qms_nonconformities
  where organization_id=p_organization_id and id=p_nonconformity_id for update;
  if not found then raise exception 'qms_nonconformity_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_nc.qms_system_id);
  if v_nc.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id=v_nc.owner_user_id then raise exception 'qms_independent_verifier_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if char_length(btrim(p_root_cause))<10 or char_length(btrim(p_corrective_action))<10 then raise exception 'qms_capa_incomplete'; end if;
  update public.ai_qms_nonconformities
  set status='closed', root_cause=btrim(p_root_cause), corrective_action=btrim(p_corrective_action),
      verified_by_user_id=p_actor_user_id, verified_at=now(), closed_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=p_nonconformity_id
  returning * into v_nc;
  return next v_nc;
end;
$$;

create or replace function public.approve_qms_system_atomic(
  p_organization_id uuid,
  p_qms_system_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns setof public.ai_qms_systems
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qms public.ai_qms_systems;
  v_controls integer;
  v_effective integer;
  v_audits integer;
  v_reviews integer;
begin
  select * into v_qms from public.ai_qms_systems
  where organization_id = p_organization_id and id = p_qms_system_id for update;
  if not found then raise exception 'qms_not_found'; end if;
  if v_qms.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if v_qms.approver_user_id is distinct from p_actor_user_id then raise exception 'qms_approver_mismatch'; end if;
  if v_qms.reviewer_user_id is null or v_qms.approver_user_id is null
     or v_qms.reviewer_user_id = v_qms.owner_user_id
     or v_qms.approver_user_id in (v_qms.owner_user_id, v_qms.reviewer_user_id) then
    raise exception 'qms_actor_separation_required';
  end if;
  if char_length(btrim(v_qms.scope)) < 20
     or char_length(btrim(v_qms.quality_policy)) < 20
     or char_length(btrim(v_qms.regulatory_strategy)) < 20 then
    raise exception 'qms_core_documents_incomplete';
  end if;
  perform public.refresh_qms_system_counters(p_organization_id, p_qms_system_id);
  select count(*), count(*) filter (where status in ('effective','not_applicable'))
    into v_controls, v_effective
  from public.ai_qms_controls
  where organization_id = p_organization_id and qms_system_id = p_qms_system_id;
  select count(*) into v_audits from public.ai_qms_audits
  where organization_id = p_organization_id and qms_system_id = p_qms_system_id and status = 'accepted';
  select count(*) into v_reviews from public.ai_qms_management_reviews
  where organization_id = p_organization_id and qms_system_id = p_qms_system_id and status = 'approved';
  select * into v_qms from public.ai_qms_systems
  where organization_id = p_organization_id and id = p_qms_system_id;
  if v_controls = 0 or v_effective <> v_controls then raise exception 'qms_controls_not_effective'; end if;
  if v_audits = 0 then raise exception 'qms_internal_audit_required'; end if;
  if v_reviews = 0 then raise exception 'qms_management_review_required'; end if;
  if v_qms.severe_nonconformities_count <> 0 or v_qms.overdue_corrective_actions_count <> 0 then raise exception 'qms_capa_blocking'; end if;
  update public.ai_qms_systems
  set status='approved', management_reviewed_at=now(), approved_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=p_qms_system_id
  returning * into v_qms;
  insert into public.ai_qms_decisions (organization_id,qms_system_id,decision_type,outcome,rationale,actor_user_id)
  values (p_organization_id,p_qms_system_id,'qms_approved','approved',p_rationale,p_actor_user_id);
  return next v_qms;
end;
$$;

create or replace function public.rollback_qms_approval_atomic(
  p_organization_id uuid,
  p_qms_system_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qms public.ai_qms_systems;
  v_decision_id uuid;
begin
  select * into v_qms from public.ai_qms_systems
  where organization_id=p_organization_id and id=p_qms_system_id for update;
  if not found or v_qms.status<>'approved' or v_qms.updated_at<>p_expected_updated_at then return false; end if;
  select id into v_decision_id
  from public.ai_qms_decisions
  where organization_id=p_organization_id
    and qms_system_id=p_qms_system_id
    and decision_type='qms_approved'
    and actor_user_id=p_actor_user_id
  order by created_at desc
  limit 1;
  perform set_config('app.qms_compensation','on',true);
  if v_decision_id is not null then delete from public.ai_qms_decisions where id=v_decision_id; end if;
  update public.ai_qms_systems set status='approval', approved_at=null, updated_at=now()
  where organization_id=p_organization_id and id=p_qms_system_id;
  return true;
end;
$$;

create or replace function public.guard_qms_child_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_system_id uuid;
  v_status text;
begin
  v_system_id := coalesce(new.qms_system_id,old.qms_system_id);
  select status into v_status
  from public.ai_qms_systems
  where organization_id=coalesce(new.organization_id,old.organization_id)
    and id=v_system_id;
  if v_status in ('approved','retired') then raise exception 'qms_immutable_state'; end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists ai_qms_system_actor_scope on public.ai_qms_systems;
create trigger ai_qms_system_actor_scope before insert or update on public.ai_qms_systems
for each row execute function public.enforce_ai_qms_system_actor_scope();
drop trigger if exists ai_qms_control_actor_scope on public.ai_qms_controls;
create trigger ai_qms_control_actor_scope before insert or update on public.ai_qms_controls
for each row execute function public.enforce_ai_qms_control_actor_scope();
drop trigger if exists ai_qms_nonconformity_actor_scope on public.ai_qms_nonconformities;
create trigger ai_qms_nonconformity_actor_scope before insert or update on public.ai_qms_nonconformities
for each row execute function public.enforce_ai_qms_nonconformity_actor_scope();
drop trigger if exists ai_qms_decision_actor_scope on public.ai_qms_decisions;
create trigger ai_qms_decision_actor_scope before insert on public.ai_qms_decisions
for each row execute function public.enforce_ai_qms_decision_actor_scope();
drop trigger if exists ai_qms_decision_immutable on public.ai_qms_decisions;
create trigger ai_qms_decision_immutable before update or delete on public.ai_qms_decisions
for each row execute function public.prevent_ai_qms_decision_mutation();
drop trigger if exists ai_qms_audit_actor_scope on public.ai_qms_audits;
create trigger ai_qms_audit_actor_scope before insert or update on public.ai_qms_audits
for each row execute function public.enforce_ai_qms_operational_actor_scope();
drop trigger if exists ai_qms_management_review_actor_scope on public.ai_qms_management_reviews;
create trigger ai_qms_management_review_actor_scope before insert or update on public.ai_qms_management_reviews
for each row execute function public.enforce_ai_qms_operational_actor_scope();
drop trigger if exists qms_nonconformity_counter_sync on public.ai_qms_nonconformities;
create trigger qms_nonconformity_counter_sync after insert or update or delete on public.ai_qms_nonconformities
for each row execute function public.sync_qms_counters_after_nonconformity();
drop trigger if exists ai_qms_control_parent_mutable on public.ai_qms_controls;
create trigger ai_qms_control_parent_mutable before insert or update or delete on public.ai_qms_controls
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_nonconformity_parent_mutable on public.ai_qms_nonconformities;
create trigger ai_qms_nonconformity_parent_mutable before insert or update or delete on public.ai_qms_nonconformities
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_audit_parent_mutable on public.ai_qms_audits;
create trigger ai_qms_audit_parent_mutable before insert or update or delete on public.ai_qms_audits
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_management_review_parent_mutable on public.ai_qms_management_reviews;
create trigger ai_qms_management_review_parent_mutable before insert or update or delete on public.ai_qms_management_reviews
for each row execute function public.guard_qms_child_mutation();

do $qms_policy_reset$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'ai_qms_systems',
    'ai_qms_controls',
    'ai_qms_nonconformities',
    'ai_qms_audits',
    'ai_qms_management_reviews',
    'ai_qms_decisions'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);

    for policy_name in
      select policyname from pg_policies
      where schemaname='public' and tablename=target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$qms_policy_reset$;

create policy ai_qms_systems_member_select on public.ai_qms_systems
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_systems.organization_id and member.user_id = auth.uid()
));
create policy ai_qms_controls_member_select on public.ai_qms_controls
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_controls.organization_id and member.user_id = auth.uid()
));
create policy ai_qms_nonconformities_member_select on public.ai_qms_nonconformities
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_nonconformities.organization_id and member.user_id = auth.uid()
));
create policy ai_qms_audits_member_select on public.ai_qms_audits
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_audits.organization_id and member.user_id = auth.uid()
));
create policy ai_qms_management_reviews_member_select on public.ai_qms_management_reviews
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_management_reviews.organization_id and member.user_id = auth.uid()
));
create policy ai_qms_decisions_member_select on public.ai_qms_decisions
for select to authenticated using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_decisions.organization_id and member.user_id = auth.uid()
));

revoke all on public.ai_qms_systems from anon, authenticated;
revoke all on public.ai_qms_controls from anon, authenticated;
revoke all on public.ai_qms_nonconformities from anon, authenticated;
revoke all on public.ai_qms_audits from anon, authenticated;
revoke all on public.ai_qms_management_reviews from anon, authenticated;
revoke all on public.ai_qms_decisions from anon, authenticated;
grant select on public.ai_qms_systems to authenticated;
grant select on public.ai_qms_controls to authenticated;
grant select on public.ai_qms_nonconformities to authenticated;
grant select on public.ai_qms_audits to authenticated;
grant select on public.ai_qms_management_reviews to authenticated;
grant select on public.ai_qms_decisions to authenticated;
grant select, insert, update, delete on public.ai_qms_systems to service_role;
grant select, insert, update, delete on public.ai_qms_controls to service_role;
grant select, insert, update, delete on public.ai_qms_nonconformities to service_role;
grant select, insert, update, delete on public.ai_qms_audits to service_role;
grant select, insert, update, delete on public.ai_qms_management_reviews to service_role;
grant select, insert on public.ai_qms_decisions to service_role;

revoke all on function public.ai_qms_actor_is_member(uuid,uuid) from public, anon, authenticated;
revoke all on function public.assert_qms_mutable(uuid,uuid) from public, anon, authenticated;
revoke all on function public.create_qms_system_atomic(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.configure_qms_system_atomic(uuid,uuid,timestamptz,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.complete_qms_control_atomic(uuid,uuid,timestamptz,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.accept_qms_audit_atomic(uuid,uuid,timestamptz,uuid,integer,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.approve_qms_management_review_atomic(uuid,uuid,timestamptz,uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.close_qms_nonconformity_atomic(uuid,uuid,timestamptz,uuid,text,text) from public, anon, authenticated;
revoke all on function public.approve_qms_system_atomic(uuid,uuid,timestamptz,uuid,text) from public, anon, authenticated;
revoke all on function public.rollback_qms_approval_atomic(uuid,uuid,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.ai_qms_actor_is_member(uuid,uuid) to service_role;
grant execute on function public.create_qms_system_atomic(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.configure_qms_system_atomic(uuid,uuid,timestamptz,uuid,uuid,uuid) to service_role;
grant execute on function public.complete_qms_control_atomic(uuid,uuid,timestamptz,uuid,text,text,text,text) to service_role;
grant execute on function public.accept_qms_audit_atomic(uuid,uuid,timestamptz,uuid,integer,integer,integer,text,text) to service_role;
grant execute on function public.approve_qms_management_review_atomic(uuid,uuid,timestamptz,uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.close_qms_nonconformity_atomic(uuid,uuid,timestamptz,uuid,text,text) to service_role;
grant execute on function public.approve_qms_system_atomic(uuid,uuid,timestamptz,uuid,text) to service_role;
grant execute on function public.rollback_qms_approval_atomic(uuid,uuid,timestamptz,uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Fail-closed postconditions.
-- ---------------------------------------------------------------------------

do $verify$
declare
  target_table text;
  required_function text;
begin
  foreach target_table in array array[
    'enterprise_evidence_packs',
    'enterprise_evidence_pack_items',
    'enterprise_vendor_due_diligence',
    'enterprise_risk_reviews',
    'ai_qms_systems',
    'ai_qms_controls',
    'ai_qms_nonconformities',
    'ai_qms_audits',
    'ai_qms_management_reviews',
    'ai_qms_decisions'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'Paid governance table missing after reconciliation: %', target_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public'
        and c.relname=target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'RLS/FORCE RLS missing after paid governance reconciliation: %', target_table;
    end if;

    if has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'Authenticated direct mutation privilege survived on %', target_table;
    end if;

    if not has_table_privilege('service_role', format('public.%I', target_table), 'SELECT') then
      raise exception 'service_role read privilege missing on %', target_table;
    end if;
  end loop;

  foreach required_function in array array[
    'public.create_enterprise_evidence_pack_atomic(uuid,uuid,text,text[],integer)',
    'public.create_qms_system_atomic(uuid,uuid,text,text,text,text)',
    'public.configure_qms_system_atomic(uuid,uuid,timestamptz,uuid,uuid,uuid)',
    'public.complete_qms_control_atomic(uuid,uuid,timestamptz,uuid,text,text,text,text)',
    'public.accept_qms_audit_atomic(uuid,uuid,timestamptz,uuid,integer,integer,integer,text,text)',
    'public.approve_qms_management_review_atomic(uuid,uuid,timestamptz,uuid,uuid,text,text,text,text)',
    'public.close_qms_nonconformity_atomic(uuid,uuid,timestamptz,uuid,text,text)',
    'public.approve_qms_system_atomic(uuid,uuid,timestamptz,uuid,text)',
    'public.rollback_qms_approval_atomic(uuid,uuid,timestamptz,uuid)'
  ]
  loop
    if to_regprocedure(required_function) is null then
      raise exception 'Required paid governance RPC missing after reconciliation: %', required_function;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname='enterprise_evidence_pack_items_pack_organization_fkey'
      and conrelid='public.enterprise_evidence_pack_items'::regclass
      and convalidated
  ) then
    raise exception 'Evidence-pack tenant composite foreign key is missing or unvalidated';
  end if;

  if has_function_privilege('authenticated', 'public.create_enterprise_evidence_pack_atomic(uuid,uuid,text,text[],integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.create_qms_system_atomic(uuid,uuid,text,text,text,text)', 'EXECUTE') then
    raise exception 'Backend-only paid governance RPC became client executable';
  end if;

  if not has_function_privilege('service_role', 'public.create_enterprise_evidence_pack_atomic(uuid,uuid,text,text[],integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.create_qms_system_atomic(uuid,uuid,text,text,text,text)', 'EXECUTE') then
    raise exception 'service_role paid governance RPC authority is missing';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
