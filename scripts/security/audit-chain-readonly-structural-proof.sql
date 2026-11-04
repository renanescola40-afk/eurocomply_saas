-- RISCK COMPLY / SEC-06: audit chain structural evidence, no customer payload output.
-- READ ONLY: this does not recompute event hashes, authenticate JWTs or verify
-- HMAC signatures. An anomaly-free structural graph is NOT formal gate PASS.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '8000ms';
WITH RECURSIVE
  audit AS (
    SELECT id, organization_id, created_at, event_hash, previous_hash,
           hash_signature, hash_algorithm
    FROM public.audit_events
  ),
  roots AS (
    SELECT organization_id, id, event_hash
    FROM audit WHERE previous_hash IS NULL AND event_hash IS NOT NULL
  ),
  reachable (organization_id, id, event_hash, depth) AS (
    SELECT organization_id, id, event_hash, 1 FROM roots
    UNION ALL
    SELECT a.organization_id, a.id, a.event_hash, r.depth + 1
    FROM audit a
    JOIN reachable r ON a.organization_id = r.organization_id
      AND a.previous_hash = r.event_hash
    WHERE a.event_hash IS NOT NULL AND r.depth < 2000
  ),
  invalid_root_counts AS (
    SELECT organization_id FROM audit GROUP BY organization_id
    HAVING COUNT(*) FILTER (WHERE previous_hash IS NULL) <> 1
  ),
  forks AS (
    SELECT organization_id, previous_hash FROM audit
    WHERE previous_hash IS NOT NULL
    GROUP BY organization_id, previous_hash HAVING COUNT(*) > 1
  ),
  repeated_hashes AS (
    SELECT organization_id, event_hash FROM audit
    WHERE event_hash IS NOT NULL
    GROUP BY organization_id, event_hash HAVING COUNT(*) > 1
  ),
  predecessor_gaps AS (
    SELECT a.id FROM audit a
    WHERE a.previous_hash IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM audit p
      WHERE p.organization_id = a.organization_id
        AND p.event_hash = a.previous_hash
    )
  ),
  backward_edges AS (
    SELECT a.id FROM audit a
    JOIN audit p ON p.organization_id = a.organization_id
      AND p.event_hash = a.previous_hash
    WHERE p.created_at > a.created_at
  )
SELECT
  (SELECT COUNT(*) FROM audit) AS events_total,
  (SELECT COUNT(DISTINCT organization_id) FROM audit) AS tenant_count,
  (SELECT COUNT(*) FROM audit WHERE event_hash IS NULL) AS missing_event_hash,
  (SELECT COUNT(*) FROM audit WHERE hash_signature IS NULL) AS missing_signature,
  (SELECT COUNT(*) FROM audit WHERE hash_algorithm IS DISTINCT FROM 'sha256') AS non_sha256,
  (SELECT COUNT(*) FROM invalid_root_counts) AS invalid_root_tenants,
  (SELECT COUNT(*) FROM predecessor_gaps) AS missing_predecessors,
  (SELECT COUNT(*) FROM forks) AS fork_points,
  (SELECT COUNT(*) FROM repeated_hashes) AS duplicated_hashes,
  (SELECT COUNT(*) FROM backward_edges) AS backward_time_edges,
  (SELECT COUNT(*) FROM audit a
   WHERE a.event_hash IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM reachable r WHERE r.id = a.id
   )) AS unreachable_hashed_events,
  'NOT_A_CRYPTOGRAPHIC_VERIFICATION'::text AS evidence_boundary;
ROLLBACK;