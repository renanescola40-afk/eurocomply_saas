# ADR: Quality Management System Governance Boundary

## Status

Accepted for repository implementation. Runtime, legal and conformity validation remain pending.

## Context

The product coverage scorecard assigned only minimal coverage to Quality Management System controls. Existing risk, monitoring, incident, document and training modules did not create one accountable Article 17 lifecycle with controlled scope, audit, management review, nonconformities, corrective actions, independent approval and durable evidence.

## Decision

Create a dedicated QMS governance domain with:

- a deterministic fail-closed decision engine;
- versioned QMS systems and control inventories;
- explicit document, record, design, supplier, data, risk, monitoring, incident, change and competence linkages;
- internal-audit and management-review gates;
- nonconformity, root-cause, corrective-action and effectiveness-review lifecycle;
- owner, reviewer, verifier and approver separation;
- append-only material decisions;
- organization-scoped foreign keys and actor membership checks;
- forced RLS and server-owned mutations;
- evidence digests instead of unbounded evidence payloads.

## Consequences

A QMS cannot reach approval while severe nonconformities or overdue corrective actions remain. Management review and independent approval become explicit rather than implied. The conformity workstream can consume an approved QMS readiness result, but cannot treat it as certification or a completed conformity assessment.

## Alternatives rejected

- A single QMS completion checkbox: insufficient control and evidence depth.
- Reusing generic task records: weak regulatory semantics and approval integrity.
- Allowing direct authenticated database writes: bypasses audit and actor-scope controls.
- Mutable decision history: weakens accountability and procurement evidence.
- Automatic legal or conformity conclusions: exceeds the product's safe decision-support boundary.

## Security and tenancy

Every table contains `organization_id`. Child references bind both `organization_id` and parent ID. Forced RLS protects reads, while authenticated mutations are revoked and reserved for privileged server APIs. Actor-scope triggers require accountable users to be members of the same organization.

## Validation required

- exact-head lint, typecheck, tests and build;
- isolated Supabase migration execution;
- positive and negative RLS tests using two organizations;
- API permission, origin, bounded-input and audit contracts before customer-facing mutations;
- human review of Article 17 and conformity mapping;
- scorecard promotion only from accepted exact-SHA evidence.

## Rollback

Before migration execution, revert the domain files together. After a production migration, disable QMS mutations at the application layer and use a reviewed forward migration. Do not destructively delete quality, nonconformity or decision history.
