\set ON_ERROR_STOP on

-- Required psql variables:
--   organization_a, organization_b, actor_a
-- The proof is transactional and rolls back all fixture data.

begin;

select case
  when :'organization_a'::uuid = :'organization_b'::uuid then
    pg_catalog.raise_exception('runtime_proof_requires_distinct_organizations')
  else true
end;

create temporary table runtime_proof_result as
select *
from public.create_prohibited_practices_review_atomic(
  :'organization_a'::uuid,
  :'actor_a'::uuid,
  'runtime-proof-' || pg_catalog.txid_current()::text,
  'required'
);

do $$
declare
  v_outcome text;
  v_review_id uuid;
  v_signal_count integer;
begin
  select outcome, (review ->> 'id')::uuid
    into v_outcome, v_review_id
  from runtime_proof_result;

  if v_outcome is distinct from 'created' or v_review_id is null then
    raise exception 'review_creation_failed:%', coalesce(v_outcome, 'null');
  end if;

  select count(*) into v_signal_count
  from public.ai_prohibited_practice_signal_assessments
  where organization_id = :'organization_a'::uuid
    and review_id = v_review_id;

  if v_signal_count <> 8 then
    raise exception 'expected_eight_signals_found:%', v_signal_count;
  end if;

  if exists (
    select 1
    from public.ai_prohibited_practice_reviews
    where organization_id = :'organization_b'::uuid
      and id = v_review_id
  ) then
    raise exception 'cross_tenant_review_visibility_detected';
  end if;

  if exists (
    select 1
    from public.ai_prohibited_practice_signal_assessments
    where organization_id = :'organization_b'::uuid
      and review_id = v_review_id
  ) then
    raise exception 'cross_tenant_signal_visibility_detected';
  end if;
end;
$$;

select jsonb_build_object(
  'proof', 'prohibited_practices_two_tenant',
  'status', 'passed',
  'organization_a', :'organization_a',
  'organization_b', :'organization_b',
  'rolled_back', true
) as runtime_evidence;

rollback;
