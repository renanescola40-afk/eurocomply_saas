# ADR: Annex IV Operational Boundary

- **Date:** 2026-07-22
- **Status:** Accepted for implementation
- **Priority:** P0 — technical-documentation workflow

## Context

The repository already contained a deterministic Annex IV decision engine and tenant-scoped persistence. Customers still lacked a secure workflow to create packages, author sections, attach evidence and request approval.

## Decision

Expose one customer-facing operational workspace and one high-risk API boundary. Keep browser authorization in the Next.js route and transaction invariants in PostgreSQL.

The database allocates package versions under an advisory lock, creates all twelve sections atomically, derives evidence and completion counters through triggers, and approves only after locking and revalidating the complete package. Approval appends an immutable decision in the same transaction.

## Security boundary

The route requires authentication, active organization, explicit RBAC, trusted Origin, bounded Zod parsing, distributed fail-closed rate limiting, tenant-scoped evidence references, no-store responses, sanitized errors and durable audit events.

## Consequences

The workflow deliberately blocks approval on missing evidence, stale state, incomplete sections, self-review, invalid digests, unresolved high/critical findings or absent accountable approver. Service-role RPCs cannot be executed by public, anon or authenticated roles.

## Validation boundary

Static contracts do not prove production migration execution, live RLS isolation, evidence truth, engineering adequacy, notified-body acceptance or legal sufficiency.
