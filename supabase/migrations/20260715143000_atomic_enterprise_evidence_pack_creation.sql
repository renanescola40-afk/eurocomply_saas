-- Create an enterprise evidence pack and all required seed items in one transaction.
-- Backend-only: authorization remains in the API before the service-role RPC call.

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

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
  ) then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  insert into public.enterprise_evidence_packs (
    organization_id,
    title,
    scope,
    country_scope,
    summary,
    readiness_score_snapshot,
    created_by
  ) values (
    p_organization_id,
    trim(p_title),
    'ai_act_readiness',
    case
      when coalesce(cardinality(p_country_scope), 0) > 0 then p_country_scope
      else array['EU']::text[]
    end,
    'Evidence pack generated from current workspace AI systems and operational readiness signals.',
    p_readiness_score_snapshot,
    p_actor_user_id
  )
  returning * into v_pack;

  insert into public.enterprise_evidence_pack_items (
    organization_id,
    pack_id,
    item_type,
    title,
    source_table,
    source_id,
    status,
    owner,
    notes
  ) values (
    p_organization_id,
    v_pack.id,
    'executive_report',
    'Executive readiness report',
    'enterprise_evidence_packs',
    v_pack.id,
    'ready',
    'Compliance lead',
    'Generated from real readiness signals in this organization.'
  );

  insert into public.enterprise_evidence_pack_items (
    organization_id,
    pack_id,
    item_type,
    title,
    source_table,
    source_id,
    status,
    owner,
    notes
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

  if not exists (
    select 1
    from public.ai_systems s
    where s.organization_id = p_organization_id
  ) then
    insert into public.enterprise_evidence_pack_items (
      organization_id,
      pack_id,
      item_type,
      title,
      source_table,
      source_id,
      status,
      owner,
      notes
    ) values (
      p_organization_id,
      v_pack.id,
      'ai_system',
      'AI system registry baseline',
      null,
      null,
      'missing',
      'Compliance lead',
      'Register at least one real AI system before exporting a procurement packet.'
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at, i.id), '[]'::jsonb)
  into v_items
  from public.enterprise_evidence_pack_items i
  where i.organization_id = p_organization_id
    and i.pack_id = v_pack.id;

  return jsonb_build_object(
    'pack', to_jsonb(v_pack),
    'items', v_items
  );
end;
$$;

revoke all on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) from public;
revoke all on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) from anon;
revoke all on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) from authenticated;
grant execute on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer) to service_role;

comment on function public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer)
is 'Backend-only atomic creation of an enterprise evidence pack and its required seed items.';
