\set ON_ERROR_STOP on

-- Ephemeral raw input for scripts/security/verify-audit-chain.mjs.
-- The workflow deletes this file before any retained artifact is uploaded.
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'organizationId', a.organization_id,
      'actorUserId', a.actor_user_id,
      'action', a.action,
      'entityType', a.entity_type,
      'entityId', a.entity_id,
      'metadata', a.metadata,
      'createdAt', a.created_at,
      'previousHash', a.previous_hash,
      'eventHash', a.event_hash,
      'signature', a.hash_signature
    )
    order by a.created_at asc, a.id asc
  ),
  '[]'::jsonb
)::text
from public.audit_events a
where a.organization_id = :'organization_id'::uuid
  and a.event_hash is not null;
