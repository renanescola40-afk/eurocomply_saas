# ADR: Enterprise Seat Capacity Concurrency

- Date: 2026-07-24
- Status: Accepted for implementation

## Context

Seat limits can be crossed when manual invitations, SCIM, group mapping and billing-triggered provisioning run at the same time. Application-side count-then-write checks are not sufficient because multiple workers can observe the same capacity.

## Decision

Use PostgreSQL as the serialization boundary. Capacity is represented by versioned tenant policies. Admission first creates an expiring, idempotent reservation under a transaction advisory lock. Activation consumes that reservation under a second lock and validates the member seat version.

## Invariants

- no valid policy means no admission;
- used seats plus unexpired reservations may never exceed the configured limit;
- retries must not consume additional capacity;
- stale policy and member versions fail with explicit conflicts;
- raw invite email is not stored in the reservation table;
- browser roles cannot call the mutation RPCs or modify evidence tables;
- event evidence remains tenant-scoped and append-only;
- code and CI do not claim production migration or billing synchronization.

## Alternatives rejected

- Redis-only counters: insufficient as the canonical contract boundary and harder to reconcile transactionally with membership rows.
- Application mutexes: do not serialize across serverless workers and regions.
- Counting active members without reservations: allows concurrent over-admission.
- Unlimited null policy fallback: violates fail-closed enterprise licensing.

## Consequences

Admission workflows must reserve before activation and pass explicit policy/member versions. Billing and contract systems must publish policy changes before increasing capacity. Operators receive deterministic outcomes suitable for HTTP 409/422 handling and audit evidence.
