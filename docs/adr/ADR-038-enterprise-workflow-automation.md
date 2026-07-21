# ADR-038: Enterprise Workflow & Automation Engine

## Status
Accepted

## Context
Enterprise customers need repeatable approvals, evidence collection, SLA enforcement, escalation and auditable automation across AI governance, procurement, incidents, documents and privacy operations. Ad-hoc task state cannot provide deterministic execution or defensible history.

## Decision
Implement a tenant-scoped, versioned workflow control plane with approved templates, ordered step definitions, idempotent instances, immutable approval decisions, append-oriented hash-linked events, SLA deadlines and bounded escalation levels.

Material rules:

- active templates require an approver different from the creator;
- every execution uses a stable correlation ID and per-step idempotency key;
- approval steps support one to ten independent approvals;
- rejection, deadline expiry and failed steps fail closed;
- workflow events and approval decisions are not mutable by ordinary authenticated roles;
- RLS is enabled and forced on all workflow tables;
- tenant membership is evaluated through the canonical organization boundary;
- evidence references may store digests, never secrets or raw customer content.

## Consequences
The engine can support reusable compliance workflows without coupling domain code to one fixed lifecycle. Runtime workers and notifications can be added behind the same persisted contract. Merging the schema does not prove production execution, SLA performance, human approval quality or regulatory sufficiency; those require exact-SHA runtime evidence and independent review.
