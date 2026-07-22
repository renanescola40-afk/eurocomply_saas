\set ON_ERROR_STOP on

-- Required psql variables:
--   organization_a, organization_b, actor_a
-- The proof is transactional and rolls back all fixture data.

begin;

create temporary table runtime_proof_context (
  organization_a uuid not null,
  organization_b uuid not null,
  actor_a uuid not null
) on commit drop;

insert into runtime_proof_context (organization_a, organization_b, actor_a)
values (:'organization_a'::uuid, :'organization_b'::uuid, :'actor_a'::uuid);

do $$
begin
  if exists (
    select 1 from runtime_proof_context
    where organization_a = organization_b
  ) then
    raise exception 'runtime_proof_requires_distinct_organizations';
  end if;
end;
$$;

create temporary table runtime_proof_result on commit drop as
select created.*
from runtime_proof_context context
cross join lateral public.create_prohibited_practices_review_atomic(
  context.organization_a,
  context.actor_a,
  'runtime-proof-' || pg_catalog.txid_current()::text,
  'required'
) created;

do $$
declare
  v_organization_a uuid;
  v_organization_b uuid;
  v_outcome text;
  v_review_id uuid;
  v_signal_count integer;
begin
  select organization_a, organization_b
    into v_organization_a, v_organization_b
  from runtime_proof_context;

  select outcome, (review ->> 'id')::uuid
    into v_outcome, v_review_id
  from runtime_proof_result;

  if v_outcome is distinct from 'created' or v_review_id is null then
    raise exception 'review_creation_failed:%', coalesce(v_outcome, 'null');
  end if;

  select count(*) into v_signal_count
  from public.ai_prohibited_practice_signal_assessments
  where organization_id = v_organization_a
    and review_id = v_review_id;

  if v_signal_count <> 8 then
    raise exception 'expected_eight_signals_found:%', v_signal_count;
  end if;

  if exists (
    select 1
    from public.ai_prohibited_practice_reviews
    where organization_id = v_organization_b
      and id = v_review_id
  ) then
    raise exception 'cross_tenant_review_visibility_detected';
  end if;

  if exists (
    select 1
    from public.ai_prohibited_practice_signal_assessments
    where organization_id = v_organization_b
      and review_id = v_review_id
  ) then
    raise exception 'cross_tenant_signal_visibility_detected';
  end if;
end;
$$;

select jsonb_build_object(
  'proof', 'prohibited_practices_two_tenant',
  'status', 'passed',
  'organization_a', context.organization_a,
  'organization_b', context.organization_b,
  'rolled_back', true
) as runtime_evidence
from runtime_proof_context context;

rollback;
