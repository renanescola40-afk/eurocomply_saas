# Enterprise Entitlement and Billing Reconciliation

## Objective

Keep signed contracts, Stripe subscription state, manual overrides and canonical seat policies consistent without allowing retries, stale versions or lower-priority sources to silently change capacity.

## Implemented controls

- versioned authority sources per organization;
- explicit source priority and validity windows;
- immutable entitlement snapshots;
- organization-scoped idempotency keys;
- deterministic SHA-256 payload integrity;
- PostgreSQL advisory-lock serialization;
- atomic update of `enterprise_seat_policies`;
- source-version optimistic concurrency;
- supersession of older accepted snapshots;
- append-only reconciliation evidence;
- forced RLS and service-role-only mutation;
- exact-SHA CI evidence.

## Operational outcomes

- `applied`: snapshot and seat policy updated atomically;
- `idempotent_replay`: the event was already processed;
- `version_conflict`: source state is stale;
- `lower_priority`: a stronger active authority exists;
- `invalid_window`: entitlement validity is malformed;
- `source_unavailable`: source is missing or inactive.

## Rollout

1. Apply the migration through the controlled Supabase path.
2. Register signed-contract and Stripe sources for each enterprise organization.
3. Assign explicit priorities approved by product, finance and legal operations.
4. Connect Stripe webhook normalization to `reconcileEntitlementSnapshot`.
5. Connect signed-contract import to the same service.
6. Reconcile a non-production organization and compare resulting seat policy.
7. Replay the same webhook and verify no additional policy version is created.
8. Introduce a deliberate lower-priority conflict and verify rejection evidence.
9. Monitor version conflicts, unavailable sources and drift age.
10. Roll out by organization cohort.

## Truth boundary

Green repository CI proves only the code-level contract. It does not prove that production Supabase has the migration, that Stripe webhooks are connected, that signed contracts are imported, or that external drift has been reconciled.
