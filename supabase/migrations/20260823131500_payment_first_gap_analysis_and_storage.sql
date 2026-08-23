begin;

-- Payment-first closure for the historical user-scoped Gap Analysis data plane.
-- Authentication/ownership is not commercial authority. New Gap/Findings rows
-- are organization-bound and every authenticated direct path must also prove the
-- same durable paid authority used by the application (LIVE Stripe active state
-- or a valid signed Enterprise contract snapshot).

do $preconditions$
begin
  if to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'payment-first commercial authority helper is missing';
  end if;
  if to_regclass('public.organizations') is null or to_regclass('public.organization_members') is null then
    raise exception 'canonical organization tables are missing';
  end if;
  if to_regclass('public.gap_assessments') is null
     or to_regclass('public.gap_answers') is null
     or to_regclass('public.compliance_findings') is null then
    raise exception 'gap/remediation compatibility tables are missing';
  end if;
end
$preconditions$;

alter table public.gap_assessments
  add column if not exists organization_id uuid;

alter table public.compliance_findings
  add column if not exists organization_id uuid;

-- Promote legacy rows only when tenant ownership is deterministic. Ambiguous or
-- orphaned historical rows remain NULL and therefore become inaccessible to
-- authenticated commercial paths; service-role recovery remains possible.
with deterministic_membership as (
  select
    ga.id,
    min(om.organization_id::text)::uuid as organization_id
  from public.gap_assessments ga
  join public.organization_members om on om.user_id = ga.user_id
  where ga.organization_id is null
  group by ga.id
  having count(distinct om.organization_id) = 1
)
update public.gap_assessments ga
set organization_id = dm.organization_id
from deterministic_membership dm
where ga.id = dm.id
  and ga.organization_id is null;

with deterministic_membership as (
  select
    cf.id,
    min(om.organization_id::text)::uuid as organization_id
  from public.compliance_findings cf
  join public.organization_members om on om.user_id = cf.user_id
  where cf.organization_id is null
  group by cf.id
  having count(distinct om.organization_id) = 1
)
update public.compliance_findings cf
set organization_id = dm.organization_id
from deterministic_membership dm
where cf.id = dm.id
  and cf.organization_id is null;

-- Prefer the assessment tenant when a finding is linked to a promoted assessment.
update public.compliance_findings cf
set organization_id = ga.organization_id
from public.gap_assessments ga
where cf.assessment_id = ga.id
  and ga.organization_id is not null
  and cf.organization_id is distinct from ga.organization_id;

do $foreign_keys$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gap_assessments'::regclass
      and conname = 'gap_assessments_organization_id_fkey'
  ) then
    alter table public.gap_assessments
      add constraint gap_assessments_organization_id_fkey
      foreign key (organization_id) references public.organizations(id)
      on delete restrict not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.compliance_findings'::regclass
      and conname = 'compliance_findings_organization_id_fkey'
  ) then
    alter table public.compliance_findings
      add constraint compliance_findings_organization_id_fkey
      foreign key (organization_id) references public.organizations(id)
      on delete restrict not valid;
  end if;
end
$foreign_keys$;

alter table public.gap_assessments validate constraint gap_assessments_organization_id_fkey;
alter table public.compliance_findings validate constraint compliance_findings_organization_id_fkey;

create index if not exists gap_assessments_org_user_created_idx
  on public.gap_assessments(organization_id, user_id, created_at desc)
  where organization_id is not null;

create index if not exists compliance_findings_org_user_status_idx
  on public.compliance_findings(organization_id, user_id, status, created_at desc)
  where organization_id is not null;

-- Existing ownership policies remain useful as a second condition. These
-- RESTRICTIVE policies add the commercial key, so ownership alone can never open
-- the product data plane.
drop policy if exists payment_first_gap_assessments_authority on public.gap_assessments;
create policy payment_first_gap_assessments_authority
  on public.gap_assessments
  as restrictive
  for all
  to authenticated
  using (
    organization_id is not null
    and app_private.has_commercial_authority(organization_id)
  )
  with check (
    organization_id is not null
    and app_private.has_commercial_authority(organization_id)
  );

drop policy if exists payment_first_gap_answers_authority on public.gap_answers;
create policy payment_first_gap_answers_authority
  on public.gap_answers
  as restrictive
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.organization_id is not null
        and app_private.has_commercial_authority(ga.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.gap_assessments ga
      where ga.id = gap_answers.assessment_id
        and ga.organization_id is not null
        and app_private.has_commercial_authority(ga.organization_id)
    )
  );

drop policy if exists payment_first_compliance_findings_authority on public.compliance_findings;
create policy payment_first_compliance_findings_authority
  on public.compliance_findings
  as restrictive
  for all
  to authenticated
  using (
    organization_id is not null
    and app_private.has_commercial_authority(organization_id)
  )
  with check (
    organization_id is not null
    and app_private.has_commercial_authority(organization_id)
  );

-- Historical compliance_evidence never became an organization tenant surface and
-- has no current product writer. Remove it from authenticated PostgREST entirely.
do $legacy_compliance_evidence$
begin
  if to_regclass('public.compliance_evidence') is not null then
    revoke all on table public.compliance_evidence from public, anon, authenticated;
    grant all on table public.compliance_evidence to service_role;
  end if;
end
$legacy_compliance_evidence$;

-- Evidence metadata is already organization-scoped by the Enterprise Evidence
-- Vault reconciliation and is covered by the generic paid RLS policy. Storage
-- object policies also need the commercial key; otherwise a cancelled tenant with
-- old metadata could keep reading/uploading bytes directly through Storage.
do $storage_payment_first$
begin
  if to_regclass('storage.objects') is null or to_regclass('public.evidence_items') is null then
    raise exception 'Evidence Vault storage/data plane is missing';
  end if;
end
$storage_payment_first$;

drop policy if exists "rls_compliance_evidence_objects_select_organization" on storage.objects;
create policy "rls_compliance_evidence_objects_select_organization"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and exists (
      select 1
      from public.evidence_items e
      where e.organization_id = app_private.evidence_storage_organization_id(storage.objects.name)
        and e.id = app_private.evidence_storage_evidence_id(storage.objects.name)
        and e.storage_bucket = storage.objects.bucket_id
        and e.storage_object_path = storage.objects.name
        and e.deleted_at is null
        and app_private.is_org_member(e.organization_id)
        and app_private.has_commercial_authority(e.organization_id)
    )
  );

drop policy if exists "rls_compliance_evidence_objects_insert_organization" on storage.objects;
create policy "rls_compliance_evidence_objects_insert_organization"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-evidence'
    and exists (
      select 1
      from public.evidence_items e
      where e.organization_id = app_private.evidence_storage_organization_id(storage.objects.name)
        and e.id = app_private.evidence_storage_evidence_id(storage.objects.name)
        and e.storage_bucket = storage.objects.bucket_id
        and e.storage_object_path = storage.objects.name
        and e.deleted_at is null
        and app_private.has_org_role(e.organization_id, array['owner','admin','member']::text[])
        and app_private.has_commercial_authority(e.organization_id)
    )
  );

-- Fail closed if any of the new commercial boundaries is absent.
do $postconditions$
declare
  restrictive_count integer;
  select_qual text;
  insert_check text;
begin
  select count(*) into restrictive_count
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'payment_first_gap_assessments_authority',
      'payment_first_gap_answers_authority',
      'payment_first_compliance_findings_authority'
    )
    and permissive = 'RESTRICTIVE';

  if restrictive_count <> 3 then
    raise exception 'gap/remediation payment-first restrictive policy set is incomplete: %/3', restrictive_count;
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'compliance_evidence'
      and grantee in ('anon', 'authenticated')
  ) then
    raise exception 'legacy compliance_evidence client grant survived payment-first closure';
  end if;

  select qual into select_qual
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'rls_compliance_evidence_objects_select_organization';

  select with_check into insert_check
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'rls_compliance_evidence_objects_insert_organization';

  if coalesce(select_qual, '') not like '%has_commercial_authority%'
     or coalesce(insert_check, '') not like '%has_commercial_authority%' then
    raise exception 'Evidence Vault Storage policies are not payment-first';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
