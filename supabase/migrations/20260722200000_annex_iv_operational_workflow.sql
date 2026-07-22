begin;

create or replace function public.create_annex_iv_package_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_system_reference text,
  p_system_version text,
  p_applicability text
)
returns table (outcome text, package jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_package public.ai_annex_iv_packages%rowtype;
  v_section text;
begin
  if p_organization_id is null or p_actor_user_id is null
    or char_length(pg_catalog.btrim(coalesce(p_system_reference, ''))) < 3
    or char_length(pg_catalog.btrim(coalesce(p_system_version, ''))) < 1
    or p_applicability not in ('required','not_required','uncertain') then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_user_id) then
    return query select 'actor_not_member'::text, null::jsonb; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || pg_catalog.btrim(p_system_reference), 0));
  select coalesce(max(p.documentation_version), 0) + 1 into v_version
  from public.ai_annex_iv_packages p
  where p.organization_id = p_organization_id and p.system_reference = pg_catalog.btrim(p_system_reference);

  insert into public.ai_annex_iv_packages (
    organization_id, system_reference, system_version, documentation_version,
    applicability, status, owner_user_id, last_material_change_at
  ) values (
    p_organization_id, pg_catalog.btrim(p_system_reference), pg_catalog.btrim(p_system_version), v_version,
    p_applicability, case when p_applicability = 'uncertain' then 'applicability_review' else 'draft' end,
    p_actor_user_id, now()
  ) returning * into v_package;

  foreach v_section in array array[
    'general_description','system_elements_and_development','monitoring_functioning_and_control',
    'risk_management','data_governance','performance_metrics','human_oversight','cybersecurity',
    'lifecycle_changes','standards_and_specifications','eu_declaration_and_conformity','post_market_monitoring'
  ] loop
    insert into public.ai_annex_iv_sections (organization_id, package_id, section_code, owner_user_id, last_material_change_at)
    values (p_organization_id, v_package.id, v_section, p_actor_user_id, now());
  end loop;

  return query select 'created'::text, to_jsonb(v_package);
end;
$$;

revoke all on function public.create_annex_iv_package_atomic(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_annex_iv_package_atomic(uuid, uuid, text, text, text) to service_role;

create or replace function public.refresh_annex_iv_package_counts(p_organization_id uuid, p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_approved integer;
  v_total integer;
begin
  select count(*) filter (where s.status = 'approved'), count(*)
  into v_approved, v_total
  from public.ai_annex_iv_sections s
  where s.organization_id = p_organization_id and s.package_id = p_package_id;

  update public.ai_annex_iv_packages p
  set approved_sections_count = coalesce(v_approved, 0),
      total_sections_count = coalesce(v_total, 0),
      status = case
        when p.status in ('approved','not_applicable','retired') then p.status
        when coalesce(v_approved, 0) = 12 and coalesce(v_total, 0) = 12 then 'approval'
        when coalesce(v_approved, 0) > 0 then 'review'
        else 'authoring'
      end
  where p.organization_id = p_organization_id and p.id = p_package_id;
end;
$$;
revoke all on function public.refresh_annex_iv_package_counts(uuid, uuid) from public, anon, authenticated;

create or replace function public.sync_annex_iv_section_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_package uuid := coalesce(new.package_id, old.package_id);
  v_section uuid := coalesce(new.section_id, old.section_id);
  v_count integer;
begin
  select count(*) into v_count from public.ai_annex_iv_evidence e
  where e.organization_id = v_org and e.package_id = v_package and e.section_id = v_section;
  update public.ai_annex_iv_sections s set evidence_count = v_count
  where s.organization_id = v_org and s.package_id = v_package and s.id = v_section;
  perform public.refresh_annex_iv_package_counts(v_org, v_package);
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_annex_iv_section_evidence() from public, anon, authenticated;

drop trigger if exists sync_annex_iv_section_after_evidence on public.ai_annex_iv_evidence;
create trigger sync_annex_iv_section_after_evidence
after insert or delete on public.ai_annex_iv_evidence
for each row execute function public.sync_annex_iv_section_evidence();

create or replace function public.sync_annex_iv_package_after_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_annex_iv_package_counts(new.organization_id, new.package_id);
  return new;
end;
$$;
revoke all on function public.sync_annex_iv_package_after_section() from public, anon, authenticated;

drop trigger if exists sync_annex_iv_package_after_section on public.ai_annex_iv_sections;
create trigger sync_annex_iv_package_after_section
after update of status, evidence_count, reviewed_at, approved_at on public.ai_annex_iv_sections
for each row execute function public.sync_annex_iv_package_after_section();

create or replace function public.approve_annex_iv_package_atomic(
  p_organization_id uuid,
  p_package_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns table (outcome text, package jsonb, decision_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_annex_iv_packages%rowtype;
  v_updated public.ai_annex_iv_packages%rowtype;
  v_ready integer;
  v_total integer;
  v_decision_id uuid;
begin
  if p_organization_id is null or p_package_id is null or p_expected_updated_at is null
    or p_actor_user_id is null or char_length(pg_catalog.btrim(coalesce(p_rationale, ''))) < 10 then
    return query select 'invalid_input'::text, null::jsonb, null::uuid; return;
  end if;
  select p.* into v_current from public.ai_annex_iv_packages p
  where p.organization_id = p_organization_id and p.id = p_package_id for update;
  if not found then return query select 'not_found'::text, null::jsonb, null::uuid; return; end if;
  if v_current.updated_at is distinct from p_expected_updated_at then
    return query select 'state_changed'::text, null::jsonb, null::uuid; return;
  end if;
  if v_current.approver_user_id is distinct from p_actor_user_id then
    return query select 'approver_required'::text, null::jsonb, null::uuid; return;
  end if;
  select count(*), count(*) filter (
    where s.status = 'approved' and char_length(pg_catalog.btrim(s.summary)) >= 10
      and char_length(pg_catalog.btrim(s.source_version)) >= 1
      and s.owner_user_id is not null and s.reviewer_user_id is not null
      and s.owner_user_id <> s.reviewer_user_id and s.evidence_count > 0
      and s.content_digest is not null and s.reviewed_at is not null and s.approved_at is not null
      and (s.last_material_change_at is null or s.reviewed_at >= s.last_material_change_at)
  ) into v_total, v_ready
  from public.ai_annex_iv_sections s
  where s.organization_id = p_organization_id and s.package_id = p_package_id;

  if v_current.applicability <> 'required' or v_total <> 12 or v_ready <> 12
    or v_current.open_high_findings <> 0 or v_current.open_critical_findings <> 0
    or v_current.reviewer_user_id is null or v_current.approver_user_id is null
    or v_current.reviewer_user_id = v_current.owner_user_id
    or v_current.approver_user_id in (v_current.owner_user_id, v_current.reviewer_user_id)
    or v_current.package_digest is null then
    return query select 'requirements_not_met'::text, null::jsonb, null::uuid; return;
  end if;

  update public.ai_annex_iv_packages p
  set status = 'approved', reviewed_at = coalesce(reviewed_at, now()), approved_at = now()
  where p.organization_id = p_organization_id and p.id = p_package_id
    and p.updated_at is not distinct from p_expected_updated_at
  returning p.* into v_updated;
  if not found then return query select 'state_changed'::text, null::jsonb, null::uuid; return; end if;

  insert into public.ai_annex_iv_decisions (
    organization_id, package_id, decision_type, outcome, rationale, actor_user_id, evidence_digest
  ) values (
    p_organization_id, p_package_id, 'package_approval', 'approved', pg_catalog.btrim(p_rationale), p_actor_user_id, v_current.package_digest
  ) returning id into v_decision_id;
  return query select 'approved'::text, to_jsonb(v_updated), v_decision_id;
end;
$$;

revoke all on function public.approve_annex_iv_package_atomic(uuid, uuid, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.approve_annex_iv_package_atomic(uuid, uuid, timestamptz, uuid, text) to service_role;

notify pgrst, 'reload schema';
commit;
