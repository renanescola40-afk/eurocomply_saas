\set ON_ERROR_STOP on
\pset pager off
\pset footer off
\pset format unaligned
\pset fieldsep '|'

begin transaction read only;
set local statement_timeout = '45s';
set local lock_timeout = '5s';

select 'event',
       id,
       status,
       coalesce(
         payload #>> '{data,object,metadata,organization_id}',
         payload #>> '{object,metadata,organization_id}',
         payload #>> '{metadata,organization_id}',
         ''
       ),
       coalesce(processed_at::text, ''),
       coalesce(error, '')
from public.stripe_events_processed
where id = :'stripe_event_id';

select 'snapshot', s.id, s.organization_id, s.plan_code,
       s.full_seat_limit, s.participant_seat_limit, s.viewer_seat_limit,
       s.source_payload_sha256, s.observed_at, s.valid_from, coalesce(s.valid_until::text, '')
from public.enterprise_entitlement_snapshots s
join public.enterprise_entitlement_sources src
  on src.id = s.source_id and src.organization_id = s.organization_id
where s.organization_id = :'organization_id'::uuid
  and s.idempotency_key = 'stripe:' || :'stripe_event_id'
order by s.created_at desc
limit 1;

select 'policy', p.organization_id, p.full_limit, p.participant_limit,
       p.viewer_limit, p.version, coalesce(p.source_reference, ''), p.effective_at,
       coalesce(p.expires_at::text, '')
from public.enterprise_seat_policies p
where p.organization_id = :'organization_id'::uuid
order by p.version desc
limit 1;

select 'reconciliation_event', e.organization_id, e.outcome, e.source_id,
       coalesce(e.snapshot_id::text, ''), e.created_at
from public.enterprise_entitlement_reconciliation_events e
join public.enterprise_entitlement_snapshots s
  on s.id = e.snapshot_id and s.organization_id = e.organization_id
where e.organization_id = :'organization_id'::uuid
  and s.idempotency_key = 'stripe:' || :'stripe_event_id'
order by e.created_at desc
limit 5;

rollback;
