# ADR: EU AI Act governance lifecycle

## Status

Proposed.

## Context

Classification alone does not create accountable evidence, separation of duties, lifecycle blocking, Annex IV completeness or durable approval history. Direct browser writes would also allow governed records to bypass reviewed backend authorization, validation, throttling and audit controls.

## Decision

Introduce a tenant-scoped governance case per organization and AI system, versioned evidence records and append-only material decision history.

Use a deterministic domain engine to derive lifecycle stage, production permission, missing controls and required actions. Persist only controlled state through service-owned workflows. Force RLS and revoke direct authenticated mutations.

Require owner/approver separation, same-organization actor membership and fail-closed production invariants at the database boundary.

## Consequences

- high-risk systems cannot become approved while required evidence is missing;
- prohibited-practice findings block production regardless of other evidence;
- approval becomes explicit and attributable;
- browser clients can read tenant-scoped records but cannot mutate them directly;
- historical evidence needs a reviewed migration/remediation process before it can be represented as accepted;
- production deployment and legal sufficiency remain external evidence boundaries.

## Rollback

Before production migration, revert the migration, domain modules, tests and documentation together. After migration, use a forward migration. Never edit an applied migration or restore direct authenticated DML as an undocumented workaround.