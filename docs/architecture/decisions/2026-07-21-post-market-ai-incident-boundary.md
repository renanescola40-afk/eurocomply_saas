# ADR: Post-Market Monitoring and AI Incident Boundary

## Status

Proposed — 2026-07-21.

## Context

The repository had general security-incident and governance lifecycle primitives, but no dedicated regulatory domain joining AI-system monitoring plans, operational signals, drift, complaints, rights impacts, corrective actions and human review of potential Article 73 reporting duties.

## Decision

Introduce four tenant-scoped entities and a deterministic decision engine:

- versioned post-market plans;
- observed AI-system signals;
- AI incident cases;
- corrective/preventive actions.

High, critical, unknown and rights-impacting cases fail closed when containment is absent. Potential reporting duties always require human assessment and, where applicable, qualified legal review. Closure requires independent approval and completed evidence.

## Security and tenancy

Every table carries `organization_id`, forced RLS and organization-scoped foreign keys. Evidence digests are bounded to lowercase SHA-256. Owners cannot approve their own cases. Confidential narratives and documents are not canonical repository evidence.

## Consequences

The product gains a coherent operational lifecycle and auditable decision boundary. It does not gain automated legal notification, regulatory filing, production worker execution or proof that an incident was handled correctly.

## Rollback

Before migration execution, revert all package files together. After production migration, disable the application workflow and use a reviewed forward migration. Never erase incident or decision history merely to roll back application behavior.
