# Enterprise Entitlement and Billing Test Plan

## Required scenarios

1. Apply a signed-contract snapshot and verify one seat-policy version increment.
2. Replay the same idempotency key and verify no second increment.
3. Submit a stale source version and verify `version_conflict`.
4. Submit a lower-priority Stripe snapshot while a contract source is active and verify `lower_priority`.
5. Submit missing, inactive and expired sources and verify fail-closed outcomes.
6. Submit malformed validity windows and verify no policy mutation.
7. Run two different snapshots concurrently for one organization and verify serialized results.
8. Verify another organization cannot reference the source or snapshot.
9. Verify authenticated browser roles cannot execute reconciliation RPCs.
10. Verify the accepted snapshot digest changes when any limit or entitlement changes.
11. Verify old applied snapshots become `superseded` only after the new policy update succeeds.
12. Compare resulting policy with contracted full, participant and viewer limits.

## Acceptance criteria

- no duplicate event changes capacity twice;
- no lower-priority or stale source overwrites the canonical policy;
- policy and snapshot state never diverge inside a committed transaction;
- all mutations are organization-scoped and service-role-only;
- repository reports do not claim external synchronization without runtime evidence.
