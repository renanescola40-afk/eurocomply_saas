# Enterprise Recovery Control Plane

- Status: Accepted
- Date: 2026-07-20

## Context

Recovery evidence is fragmented across rollback, backup, restore, RLS, RPO and RTO plans. The enterprise scorecard cannot promote REC-01 through REC-10 from one protected exact-SHA drill.

## Decision

Use `Recovery Resilience Proof` as the canonical protected recovery exercise. It requires explicit human confirmation before a live rollback, executes backup/restore only against the configured isolated recovery database, validates restored integrity and RLS metadata, measures RPO/RTO, and emits redacted exact-SHA evidence artifacts.

The Enterprise Readiness Scorecard consumes only a successful `workflow_dispatch` run on the exact current `main` SHA. The fetcher verifies repository, branch, SHA, workflow run, artifact uniqueness, schemas, all source checks and redaction assertions before it converts the source objects into the scorecard's named-check format. Missing, stale, ambiguous or malformed evidence leaves `REC-01` through `REC-10` as `NOT_VERIFIED`.

## Risks and trade-offs

The drill depends on protected credentials and an isolated restore database. It consumes provider resources and can temporarily block evidence promotion when infrastructure is unavailable. Repository checks alone do not prove production recovery.

## Rollback

Revert the fetcher, canonical validator, tests and scorecard integration together. Remove imported recovery evidence and return REC-01 through REC-10 to NOT_VERIFIED. The protected recovery workflow remains available for operational drills even if scorecard promotion is reverted.
