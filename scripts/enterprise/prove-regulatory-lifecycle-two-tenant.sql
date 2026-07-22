\set ON_ERROR_STOP on
begin;

create temporary table lifecycle_proof as
select * from public.create_ai_regulatory_program_atomic(
  :'organization_a'::uuid,
  :'actor_a'::uuid,
  'annex_iv',
  'runtime-proof-' || pg_catalog.txid_current()::text
);

do $$
declare v_outcome text; v_program_id uuid;
begin
  select outcome,(program->>'id')::uuid into v_outcome,v_program_id from lifecycle_proof;
  if v_outcome is distinct from 'created' or v_program_id is null then
    raise exception 'regulatory_program_creation_failed:%',coalesce(v_outcome,'null');
  end if;
  if exists(select 1 from public.ai_regulatory_programs where organization_id=:'organization_b'::uuid and id=v_program_id) then
    raise exception 'cross_tenant_program_visibility_detected';
  end if;
  if not exists(select 1 from public.ai_regulatory_programs where organization_id=:'organization_a'::uuid and id=v_program_id) then
    raise exception 'tenant_program_missing';
  end if;
end; $$;

select jsonb_build_object('proof','regulatory_lifecycle_two_tenant','status','passed','rolled_back',true) as runtime_evidence;
rollback;
