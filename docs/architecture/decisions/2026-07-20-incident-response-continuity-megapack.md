# ADR: Incident Response and Continuity Control Plane

## Status
Accepted for implementation; runtime acceptance remains evidence-dependent.

## Decision
RISCK COMPLY will use tenant-scoped records for security incidents, append-oriented timeline events and continuity exercises. Every table has forced RLS and explicit CRUD policies. Severity, lifecycle, evidence digests, postmortem deadlines, RPO/RTO targets and separation of duties are database constraints rather than documentation-only expectations.

## Security boundary
The protected proof inspects schema metadata in an isolated database. It does not read real incident records, customer data, timeline narratives or evidence payloads. Operational attestations are accepted only from protected environment variables and exact-main execution.

## Consequences
- incident lifecycle becomes queryable and auditable;
- continuity exercises have measurable targets and outcomes;
- evidence references can be integrity-bound by SHA-256;
- owner and independent reviewer can be required to differ;
- runtime proof remains insufficient to claim that a real incident was handled successfully.

## Rollback
Revert migration, workflow, scripts, tests and documentation together. Keep incident/continuity controls unverified until a replacement implementation and accepted evidence exist.
