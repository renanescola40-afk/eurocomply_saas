# ADR: Enterprise Entitlement and Billing Reconciliation

- Date: 2026-07-24
- Status: Accepted for implementation

## Context

Signed contracts, Stripe subscription state and emergency overrides can disagree. Seat admission cannot safely read three independent sources or interpret a missing value as unlimited.

## Decision

Represent each upstream authority as a versioned, prioritized source. Convert upstream state into immutable entitlement snapshots with deterministic payload digests and organization-scoped idempotency. Reconcile one snapshot at a time under a PostgreSQL advisory lock, then update the canonical enterprise seat policy in the same transaction.

## Precedence

1. Explicit active manual override with documented incident/change authority.
2. Signed contract source.
3. Stripe subscription source.

Priority is stored, not inferred in application code. Lower-priority observations fail closed and remain visible as drift evidence.

## Invariants

- no source or stale source version means no policy mutation;
- duplicate webhook delivery cannot increment policy versions twice;
- seat limits are always explicit bounded integers;
- source payloads are integrity-bound without persisting secrets;
- policy update and snapshot acceptance are atomic;
- browser roles cannot mutate sources, snapshots, policies or evidence;
- external synchronization remains unproven until runtime evidence exists.

## Consequences

Stripe webhooks, contract imports and operator overrides must publish through the same reconciliation service. Existing seat reservation logic continues to consume only `enterprise_seat_policies`, avoiding source-specific behavior in admission paths.
