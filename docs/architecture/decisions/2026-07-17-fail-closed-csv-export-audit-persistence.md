# Fail closed when CSV export auditing cannot be persisted

- Date: 2026-07-17
- Status: Proposed
- Scope: organization CSV report exports
- Priority: P1 — audit and evidence integrity

## Context

The tasks, risks, vendors, documents, and executive CSV endpoints read organization-scoped governance data, build downloadable reports, and append a `report.export` event before returning the file.

`writeAuditLog` reports whether the chained audit event was durably persisted. These endpoints previously ignored that result and could return a successful CSV download when the audit store, audit-chain function, schema, configuration, or provider was unavailable. That made a sensitive export possible without durable evidence that it occurred.

The documents and executive exports also counted the CSV header as an exported row in their audit metadata. A header is not a business record or executive metric.

## Decision

Every organization CSV export in scope must return the downloadable file only when `writeAuditLog` reports `persisted: true`.

When persistence fails, the endpoint:

- reports a sanitized route-specific operational error;
- returns HTTP 503 with a stable non-sensitive message;
- keeps `Cache-Control: no-store` through `noStoreJson`;
- does not return the CSV payload.

Audit metadata records business rows only:

- table-backed exports use the successful query result count;
- the executive export records metric rows and excludes its header.

Authentication, RBAC, entitlement checks, tenant scoping, rate limiting, query behavior, CSV columns, filenames, and successful response formats remain unchanged.

## Consequences

A temporary audit subsystem failure can make report exports unavailable. This is intentional: for compliance and governance exports, an unavailable report is safer and more truthful than an unrecorded export.

The change improves consistency across the five CSV report surfaces and prevents a customer download from outrunning its evidence trail. It does not prove audit availability, immutability, completeness, retention, database durability, or external assurance.

The regression test is a repository source contract. It does not replace runtime validation, production monitoring, restore testing, an external audit, or a penetration test.

## Rollback

Revert the route guards, regression contract, and this decision record. Rollback would restore availability-first behavior and again permit CSV exports when chained audit persistence is unavailable. It would also restore header-inclusive row counts for the documents and executive reports.
