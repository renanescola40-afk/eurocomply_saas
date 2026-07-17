# Fail closed when task CSV export auditing cannot be persisted

- Date: 2026-07-17
- Status: Proposed
- Scope: `GET /api/reports/tasks.csv`
- Priority: P1 — audit and evidence integrity

## Context

The task CSV endpoint reads organization-scoped compliance tasks, constructs a downloadable report, and records a `report.export` audit event before returning the file.

`writeAuditLog` reports whether the chained audit event was persisted. The endpoint previously ignored that result and returned the CSV even when audit persistence failed. This made a sensitive report export possible without durable export evidence.

## Decision

The task CSV endpoint must return the downloadable file only when `writeAuditLog` reports `persisted: true`.

When persistence fails, the endpoint:

- reports a sanitized operational error;
- returns HTTP 503 with a stable, non-sensitive message;
- keeps `Cache-Control: no-store` through `noStoreJson`;
- does not return the CSV payload.

Authentication, tenant scoping, rate limiting, query behavior, CSV contents, and successful audit metadata are unchanged.

## Consequences

A temporary audit-store failure can make the task export unavailable. This is intentional: for a compliance-oriented export, an unavailable report is safer and more truthful than an unrecorded export.

This change does not prove audit-log availability, immutability, completeness, retention, or external assurance. The regression test is a source-level contract and is not a runtime audit or penetration test.

## Rollback

Revert the route guard, regression test, and this decision record. Rollback would restore availability-first behavior and again permit exports when audit persistence is unavailable.
