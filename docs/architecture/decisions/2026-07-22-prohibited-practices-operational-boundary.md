# Prohibited Practices operational boundary

- **Date:** 2026-07-22
- **Status:** Proposed
- **Priority:** P0 — Article 5 release gate

## Context

The repository already contained a deterministic Article 5 engine and tenant-scoped persistence, but no customer-facing write workflow. A browser-only implementation would allow stale counters, partial reviews and bypassable approval assumptions.

## Decision

Create a dedicated operational route and dashboard workspace. Keep authorization in the Next.js route and transactional invariants in PostgreSQL.

The database allocates review versions under an advisory lock, creates all eight signal records atomically, synchronizes evidence and counters with triggers, and approves only after revalidating all eight signals inside a row lock. The approval transaction appends an immutable decision.

## Security boundary

The route requires authentication, active organization, explicit RBAC, trusted Origin, bounded Zod parsing, distributed fail-closed rate limiting, organization-scoped evidence references, no-store responses, sanitized errors and durable audit events.

## Consequences

The workflow is conservative by design. Missing evidence, unknown answers, prohibited conclusions, stale state, missing reviewers or severe findings block approval. Service-role RPCs are not executable by public, anon or authenticated roles.

## Validation boundary

Source and migration contract tests prove expected guards and SQL invariants. They do not constitute live migration validation, two-tenant runtime proof, legal review, penetration testing or regulator acceptance.
