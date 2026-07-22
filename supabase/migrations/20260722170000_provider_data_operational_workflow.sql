begin;

create or replace function public.create_provider_data_program_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_system_reference text,
  p_applicability text,
  p_provider_role text
)
returns table (outcome text, program jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_program public.ai_provider_data_programs%rowtype;
begin
  if p_organization_id is null or p_actor_user_id is null
    or char_length(pg_catalog.btrim(coalesce(p_system_reference, ''))) < 3
    or p_applicability not in ('required','not_required','uncertain')
    or p_provider_role not in ('provider','not_provider','uncertain') then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_user_id) then
    return query select 'actor_not_member'::text, null::jsonb; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || pg_catalog.btrim(p_system_reference), 0));
  select coalesce(max(p.program_version), 0) + 1 into v_version
  from public.ai_provider_data_programs p
  where p.organization_id = p_organization_id and p.system_reference = pg_catalog.btrim(p_system_reference);
  insert into public.ai_provider_data_programs (
    organization_id, system_reference, program_version, applicability, provider_role, status, owner_user_id, last_material_change_at
  ) values (
    p_organization_id, pg_catalog.btrim(p_system_reference), v_version, p_applicability, p_provider_role,
    case when p_applicability = 'uncertain' or p_provider_role = 'uncertain' then 'applicability_review' else 'draft' end,
    p_actor_user_id, now()
  ) returning * into v_program;
  return query select 'created'::text, to_jsonb(v_program);
end;
$$;

revoke all on function public.create_provider_data_program_atomic(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_provider_data_program_atomic(uuid, uuid, text, text, text) to service_role;

create or replace function public.refresh_provider_data_program_counts(p_organization_id uuid, p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_approved integer;
begin
  select count(*), count(*) filter (where d.status = 'approved')
  into v_total, v_approved
  from public.ai_provider_datasets d
  where d.organization_id = p_organization_id and d.program_id = p_program_id;
  update public.ai_provider_data_programs p
  set dataset_count = coalesce(v_total, 0), approved_dataset_count = coalesce(v_approved, 0),
      status = case when coalesce(v_total, 0) = 0 then 'inventory' when coalesce(v_approved, 0) = coalesce(v_total, 0) then 'approval' else 'assessment' end
  where p.organization_id = p_organization_id and p.id = p_program_id and p.status not in ('approved','blocked','not_applicable','retired');
end;
$$;

revoke all on function public.refresh_provider_data_program_counts(uuid, uuid) from public, anon, authenticated;

create or replace function public.sync_provider_data_program_after_dataset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_provider_data_program_counts(coalesce(new.organization_id, old.organization_id), coalesce(new.program_id, old.program_id));
  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_provider_data_program_after_dataset() from public, anon, authenticated;
drop trigger if exists sync_provider_program_after_dataset on public.ai_provider_datasets;
create trigger sync_provider_program_after_dataset
after insert or update of status or delete on public.ai_provider_datasets
for each row execute function public.sync_provider_data_program_after_dataset();

create or replace function public.approve_provider_data_program_atomic(
  p_organization_id uuid,
  p_program_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns table (outcome text, program jsonb, decision_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_provider_data_programs%rowtype;
  v_updated public.ai_provider_data_programs%rowtype;
  v_decision_id uuid;
begin
  select p.* into v_current from public.ai_provider_data_programs p
  where p.organization_id = p_organization_id and p.id = p_program_id for update;
  if not found then return query select 'not_found'::text, null::jsonb, null::uuid; return; end if;
  if v_current.updated_at is distinct from p_expected_updated_at then return query select 'state_changed'::text, null::jsonb, null::uuid; return; end if;
  if v_current.approver_user_id is distinct from p_actor_user_id then return query select 'approver_required'::text, null::jsonb, null::uuid; return; end if;
  if char_length(pg_catalog.btrim(coalesce(p_rationale, ''))) < 10
    or v_current.applicability <> 'required' or v_current.provider_role <> 'provider'
    or v_current.dataset_count = 0 or v_current.approved_dataset_count <> v_current.dataset_count
    or v_current.open_high_findings <> 0 or v_current.open_critical_findings <> 0
    or v_current.reviewer_user_id is null or v_current.program_digest is null
    or v_current.reviewed_at is null
    or (v_current.uses_special_category_data and (v_current.legal_reviewed_by_user_id is null or v_current.legal_reviewed_at is null)) then
    return query select 'requirements_not_met'::text, null::jsonb, null::uuid; return;
  end if;
  update public.ai_provider_data_programs p set status = 'approved', approved_at = now()
  where p.organization_id = p_organization_id and p.id = p_program_id and p.updated_at is not distinct from p_expected_updated_at
  returning * into v_updated;
  if not found then return query select 'state_changed'::text, null::jsonb, null::uuid; return; end if;
  insert into public.ai_provider_data_decisions (organization_id, program_id, decision_type, outcome, rationale, actor_user_id, evidence_digest)
  values (p_organization_id, p_program_id, 'program_approved', 'approved', pg_catalog.btrim(p_rationale), p_actor_user_id, v_current.program_digest)
  returning id into v_decision_id;
  return query select 'approved'::text, to_jsonb(v_updated), v_decision_id;
end;
$$;

revoke all on function public.approve_provider_data_program_atomic(uuid, uuid, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.approve_provider_data_program_atomic(uuid, uuid, timestamptz, uuid, text) to service_role;

notify pgrst, 'reload schema';
commit;