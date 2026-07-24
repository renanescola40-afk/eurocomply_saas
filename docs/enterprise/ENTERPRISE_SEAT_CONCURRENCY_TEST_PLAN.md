# Enterprise Seat Concurrency Test Plan

## Goal

Prove that seat admission remains within contract under concurrent requests and retries.

## Required scenarios

1. Two workers reserve the final seat simultaneously: exactly one returns `reserved`.
2. Ten workers reserve against capacity three: exactly three succeed.
3. Replaying the same idempotency key returns the original reservation without increasing counts.
4. A stale policy version returns `version_conflict` and creates no reservation.
5. Missing, expired or future-dated policy returns `policy_unavailable`.
6. Expired reservations no longer consume capacity.
7. Two workers consume one reservation: one consumes and the other receives idempotent replay or unavailable state.
8. Stale member `seat_version` returns `version_conflict` without changing the member.
9. Cross-tenant reservation and member identifiers return not found.
10. Authenticated browser roles cannot execute RPCs or mutate policy, reservation or event tables.
11. Invite emails are represented only by normalized SHA-256 values in persisted reservation data.
12. Every rejected and accepted capacity decision writes an event suitable for incident reconstruction.

## Acceptance criteria

- no scenario exceeds the configured seat limit;
- no duplicate retry allocates additional capacity;
- all state transitions occur in one database transaction;
- every mutation is tenant-scoped;
- policy and member conflicts are explicit and retryable;
- no production or billing synchronization claim is made until external evidence exists.
