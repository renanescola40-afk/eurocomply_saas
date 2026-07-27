# ADR: Verified Stripe Events as an Entitlement Publisher

- Date: 2026-07-26
- Status: Accepted

## Context

The repository already verifies Stripe signatures and processes billing events idempotently. Enterprise seat capacity is now controlled by canonical entitlement snapshots. A direct billing-to-membership mutation would bypass source precedence, optimistic concurrency and audit evidence.

## Decision

Stripe is an entitlement publisher, not the canonical authority itself. Only events that pass the existing verified webhook path and complete core billing processing may publish a normalized snapshot. The snapshot then passes through the canonical reconciliation RPC.

## Consequences

- Stripe retries inherit event and snapshot idempotency.
- Signed-contract sources can outrank Stripe through source precedence.
- Subscription cancellation becomes an effective-dated downgrade.
- Payment failures use bounded grace periods rather than destructive access removal.
- Missing metadata fails closed and requires operational remediation.
- Production readiness still requires external webhook, metadata and database evidence.
