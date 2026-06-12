-- Adds optional tamper-evidence fields to audit events.
-- These columns are nullable so the migration is safe for existing rows and phased rollout.

alter table if exists public.audit_events
  add column if not exists previous_hash text,
  add column if not exists event_hash text,
  add column if not exists hash_algorithm text not null default 'sha256',
  add column if not exists hash_signature text;

create unique index if not exists audit_events_event_hash_key
  on public.audit_events (event_hash)
  where event_hash is not null;

create index if not exists audit_events_org_created_hash_idx
  on public.audit_events (organization_id, created_at desc, event_hash);

create index if not exists audit_events_previous_hash_idx
  on public.audit_events (previous_hash)
  where previous_hash is not null;

comment on column public.audit_events.previous_hash is 'Hash of the previous audit event in the organization-scoped audit chain.';
comment on column public.audit_events.event_hash is 'Deterministic SHA-256 hash of the canonical audit event payload and previous_hash.';
comment on column public.audit_events.hash_algorithm is 'Hash algorithm used for event_hash. Defaults to sha256.';
comment on column public.audit_events.hash_signature is 'Optional HMAC signature of event_hash when AUDIT_CHAIN_SIGNING_SECRET is configured.';
