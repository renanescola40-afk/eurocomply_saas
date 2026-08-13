alter table public.billing_lifecycle_requests
  add column if not exists request_fingerprint text,
  add column if not exists result_snapshot jsonb;

create unique index if not exists billing_lifecycle_requests_org_request_unique_idx
  on public.billing_lifecycle_requests (organization_id, stripe_request_id)
  where stripe_request_id is not null;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_request_digest_format,
  add constraint billing_lifecycle_requests_request_digest_format
    check (stripe_request_id is null or stripe_request_id ~ '^[0-9a-f]{64}$') not valid;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_request_fingerprint_format,
  add constraint billing_lifecycle_requests_request_fingerprint_format
    check (request_fingerprint is null or request_fingerprint ~ '^[0-9a-f]{64}$') not valid;

alter table public.billing_lifecycle_requests
  drop constraint if exists billing_lifecycle_requests_result_snapshot_shape,
  add constraint billing_lifecycle_requests_result_snapshot_shape
    check (
      result_snapshot is null or (
        jsonb_typeof(result_snapshot) = 'object'
        and jsonb_typeof(result_snapshot->'subscriptionId') = 'string'
        and length(result_snapshot->>'subscriptionId') between 1 and 255
        and jsonb_typeof(result_snapshot->'status') = 'string'
        and length(result_snapshot->>'status') between 1 and 64
        and jsonb_typeof(result_snapshot->'cancelAtPeriodEnd') = 'boolean'
        and (
          result_snapshot->'currentPeriodEnd' = 'null'::jsonb
          or (
            jsonb_typeof(result_snapshot->'currentPeriodEnd') = 'number'
            and (result_snapshot->>'currentPeriodEnd')::numeric > 0
          )
        )
        and (result_snapshot->>'plan') in ('starter','professional','business','enterprise')
        and (result_snapshot->>'interval') in ('month','year')
        and jsonb_typeof(result_snapshot->'addOns') = 'array'
      )
    ) not valid;

alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_request_digest_format;
alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_request_fingerprint_format;
alter table public.billing_lifecycle_requests
  validate constraint billing_lifecycle_requests_result_snapshot_shape;

comment on column public.billing_lifecycle_requests.request_fingerprint is
  'SHA-256 fingerprint of the original lifecycle mutation intent; new runtimes require it for replay identity.';
comment on column public.billing_lifecycle_requests.result_snapshot is
  'Sanitized Stripe lifecycle result persisted after provider success and reused for durable audit/completion replay.';
