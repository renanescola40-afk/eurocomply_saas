# Enforce tenant scope for AI incident system references

- Status: Proposed
- Date: 2026-07-19
- Priority: P1

## Context

`ai_incidents` is organization scoped, but its optional `ai_system_id` foreign key previously proved only that the referenced AI system existed. The incident insert and update RLS policies validate membership in the incident organization; they do not prove that the referenced AI system belongs to that same organization.

A caller able to supply a known AI-system UUID could therefore create or update an incident in one tenant while linking it to an AI system in another tenant. A one-sided incident trigger would still be insufficient: an already-linked AI system could later be moved to another organization, recreating the mismatch without updating the incident. Trigger queries can also observe stale statement snapshots after waiting on a concurrent row lock, so application or trigger-only validation is not an adequate referential-integrity primitive.

This is a source-review finding. It does not establish exploitation, production impact, a penetration-test result, or regulatory non-compliance.

## Decision

Add a unique parent key on `ai_systems (id, organization_id)` and a composite foreign key from `ai_incidents (ai_system_id, organization_id)` to that key.

The original single-column foreign key remains in place and preserves its `ON DELETE SET NULL` behavior. The composite relationship has no cascade action: when a system is deleted, the original foreign key clears `ai_system_id`, after which the composite relationship is nullable and valid.

The migration creates both constraints idempotently and validates the composite foreign key immediately. PostgreSQL's referential-integrity implementation supplies the required cross-transaction locking and prevents both cross-tenant incident writes and parent tenant moves without depending on trigger query snapshots.

## Consequences

### Positive

- Cross-tenant AI-system references are rejected at the database boundary.
- Later AI-system organization moves cannot silently invalidate existing incident links.
- Concurrent incident linking and AI-system tenant moves are serialized by PostgreSQL referential integrity.
- Service-role and future application paths receive the same invariant.
- Existing RLS and application authorization remain unchanged.
- No dependency, secret, environment, or API response change is introduced.

## Risks and trade-offs

- Deployments containing invalid historical rows fail the migration and require operator reconciliation before retrying. This is deliberately fail closed; the PR does not claim production rows are already clean.
- Moving a referenced AI system between organizations now requires first removing or reassigning its incident references.
- The additional unique index and foreign key add bounded storage and write-maintenance overhead.
- Removing or transferring actor membership does not affect this invariant; it concerns system ownership, not actor membership.

## Validation

A source-level migration contract test verifies the composite parent key, composite incident relationship, immediate validation, idempotence, preservation of the original `ON DELETE SET NULL` relationship, and absence of trigger-based enforcement.

Required exact-head CI, migration validation, lint, typecheck, tests, build, security, and release gates remain authoritative before merge. A representative Supabase concurrency test is still required before claiming runtime proof.

## Rollback

Revert the migration, test, and this decision record together. If the migration has already been applied, a follow-up migration must drop `ai_incidents_system_organization_fkey`; drop `ai_systems_id_organization_id_key` only after proving no other relationship depends on it. Do not edit an applied migration in place. Rollback reopens the tenant-integrity risk.
