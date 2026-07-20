# Recovery and resilience exact-SHA megapack

- Status: Proposed
- Date: 2026-07-20
- Scope: production rollback, database backup and restore, RPO/RTO, enterprise evidence

## Context

The Recovery and Resilience domain contains ten critical controls and currently has no accepted evidence-backed PASS controls. Existing rollback automation validates metadata and health without mutating production, while backup and restore controls have no executable protected workflow.

Repository-only documents cannot prove that a rollback happened, that a backup can be restored, that restored data is coherent, or that tenant policies survive restoration.

## Decision

Create one protected manual workflow with two independent exercises:

1. **Controlled production rollback**
   - requires the `production-recovery` GitHub environment;
   - requires an exact confirmation phrase;
   - validates that the known-good deployment and SHA differ from the current release;
   - invokes a pinned Vercel CLI version;
   - waits for rollback status;
   - validates public health and `no-store` after rollback;
   - writes redacted exact-SHA evidence.

2. **Isolated database backup and restore**
   - creates a logical custom-format backup with `pg_dump`;
   - restores only into a distinct isolated recovery database;
   - compares aggregate counts for critical tenant tables;
   - validates RLS enablement and policy presence after restore;
   - measures RPO and RTO;
   - deletes the dump before the job ends;
   - writes aggregate-only exact-SHA evidence.

## Safety constraints

- Neither exercise runs on pull requests, pushes or schedules.
- Production rollback requires a protected environment approval and an exact typed confirmation.
- Source and restore database URLs must differ.
- The database dump is never uploaded as an artifact.
- Tokens, database URLs, deployment URLs, row data and response bodies are never stored in canonical evidence.
- A missing secret, stale SHA, failed health check, failed restore, mismatched count or missing RLS policy fails closed.

## Evidence boundary

A successful rollback exercise proves that Vercel accepted the controlled rollback and the production health boundary recovered. It does not prove database rollback or every customer journey.

A successful backup/restore exercise proves logical restore capability for the tested schema and aggregate integrity/RLS checks in an isolated database. It does not prove physical point-in-time recovery, regional disaster recovery, or every table-level business invariant.

## Rollback

Revert the workflow, recovery scripts, validators, tests, contracts and this ADR together. Existing dry-run rollback behavior remains available independently.
