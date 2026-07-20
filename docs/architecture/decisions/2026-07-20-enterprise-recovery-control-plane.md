# Enterprise Recovery Control Plane

- Status: Proposed
- Date: 2026-07-20

## Context

Recovery evidence is fragmented across rollback, backup, restore, RLS, RPO and RTO plans. The enterprise scorecard cannot promote REC-01 through REC-10 from one protected exact-SHA drill.

## Decision

Introduce one protected Recovery Drill workflow that validates rollback targets, executes an isolated PostgreSQL backup/restore drill, validates restored integrity and RLS metadata, measures RPO/RTO, and emits redacted exact-SHA evidence artifacts. A scorecard fetcher may promote only checks proven by a successful canonical workflow run.

## Risks and trade-offs

The drill depends on protected credentials and an isolated restore database. It consumes provider resources and can temporarily block evidence promotion when infrastructure is unavailable. Repository checks alone do not prove production recovery.

## Rollback

Revert the workflow, builders, fetcher, tests and scorecard integration together. Remove imported recovery evidence and return REC-01 through REC-10 to NOT_VERIFIED.
