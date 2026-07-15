# ADR: Verify Sales Console lead state transitions before audit evidence

- Status: Accepted
- Date: 2026-07-15
- Scope: Internal Sales Console lead mutations

## Context

The Sales Console loads a lead, updates one mutable field, then records a lead activity and a platform audit event. The update predicates already excluded GDPR-deleted leads, but the update result was checked only for database errors.

A concurrent status, priority, follow-up, or GDPR-deletion change could therefore cause the conditional update to affect no row while the request still recorded a successful activity and audit event based on stale state. That would make operational and audit chronology disagree with the persisted lead.

## Decision

Status, priority, and follow-up mutations use an optimistic compare-and-set predicate based on the value loaded immediately before the update. Each update requests the affected lead ID and must receive exactly one row before activity or audit evidence is written.

A zero-row result is treated as a stale state transition and returns a stable retry instruction. Database errors retain the existing operation-specific failure messages.

## Impact

- Successful mutations continue to update the same fields and create the same activity and audit records.
- Concurrent changes cannot produce false success evidence from a stale request.
- GDPR-deleted leads cannot receive a post-deletion success activity from these mutation paths.
- No schema, migration, dependency, role, entitlement, secret, or provider change is required.

## Risks and trade-offs

- A legitimate concurrent edit now requires the operator to refresh and retry.
- Activity insertion and the lead update are still separate database operations; this change does not claim full transactional atomicity if activity persistence itself fails after a confirmed update.
- Internal notes retain their existing behavior and are outside this narrowly scoped state-transition change.

## Tests and evidence

Focused unit coverage verifies that a zero-row compare-and-set result produces no activity and no audit event. Existing tests continue to cover authentication, platform-admin authorization, trusted origin, rate limiting, bounded inputs, and successful mutations.

GitHub Actions is authoritative for lint, typecheck, unit tests, build, and security checks. No production lead, GDPR deletion, runtime deployment, external audit, or pentest was exercised.

## Rollback

Revert this ADR, the focused test change, and the Sales Console mutation change. The prior behavior will resume without data migration or provider rollback.