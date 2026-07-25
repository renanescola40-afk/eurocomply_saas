# Enterprise Seat Capacity and Concurrency

## Objective

Prevent organizations from exceeding contracted seat limits when invites, SCIM provisioning, group policy changes and manual administration happen concurrently.

## Implemented controls

1. Versioned per-organization limits for `full`, `participant` and `viewer` seats.
2. Fail-closed behavior when a policy is missing, expired, future-dated or stale.
3. Transaction-scoped advisory locks per organization and seat type.
4. Expiring reservations before member activation.
5. Organization-scoped idempotency keys for retries and webhook redelivery.
6. Optimistic concurrency through policy versions and member `seat_version`.
7. Atomic reservation consumption and member activation.
8. Privacy-preserving invite targeting through normalized SHA-256 email hashes.
9. Service-role-only RPC execution.
10. Append-only operational evidence for accepted and rejected operations.
11. Exact-SHA CI reporting.
12. Explicit truth boundaries for production application, external load and billing synchronization.

## Reservation lifecycle

- `reserved`: capacity is held temporarily.
- `consumed`: the reservation activated or updated a member.
- `released`: an operator or workflow intentionally returned capacity.
- `expired`: TTL elapsed before consumption.

Reserved capacity counts against the limit until it is consumed, released or expired. This prevents two simultaneous admissions from observing the same free seat.

## Failure outcomes

- `policy_unavailable`: no valid capacity policy exists. The request must not continue.
- `version_conflict`: the caller used stale policy or member state and must refresh.
- `seat_limit_reached`: used plus active reservations reached the contract limit.
- `reservation_not_found`: the supplied reservation is not tenant-scoped to the organization.
- `reservation_unavailable`: reservation was released, expired or is otherwise unusable.
- `member_not_found`: the target member does not belong to the organization.
- `idempotent_replay`: the original operation already succeeded or already created the reservation.

## Production rollout

1. Apply the migration through the controlled Supabase migration path.
2. Create a policy for every contracted organization before enabling admission calls.
3. Bind Stripe/contract changes to policy updates with an immutable source reference.
4. Run concurrent admission tests against a non-production database.
5. Verify that exactly the contracted number of operations succeed.
6. Verify ledger records for both successful and rejected attempts.
7. Roll out organization cohorts and monitor reservation expiry volume.

## Rollback

Stop new reservation calls first. Do not drop tables while active reservations exist. Release or expire reservations, preserve the event ledger, revert application callers, and only then roll back database objects through a reviewed migration.

## Truth boundary

Repository implementation and green CI prove only the code-level control design. They do not prove that production Supabase has received the migration, that Stripe contract state is synchronized, or that external concurrency has been exercised successfully.
