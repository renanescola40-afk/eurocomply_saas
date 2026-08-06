# Additive repair for legacy subscriptions schemas

## Status

Accepted for implementation on 2026-08-06.

## Context

The billing migration chain created `public.subscriptions` in more than one era.
The original table did not contain `tier` or `entitlements`. A later migration
included `tier` inside `CREATE TABLE IF NOT EXISTS`, but PostgreSQL does not add
columns from that definition when the table already exists. The same migration
only added the Stripe identifiers and period end additively.

Subsequent migrations referenced `tier` and `entitlements` directly. On a legacy
production database this caused the migration chain and Stripe synchronization
to depend on a manual schema repair before billing state could be persisted.

## Decision

Add a new versioned, transactional migration that:

- fails closed unless `public.subscriptions` already exists;
- adds all canonical Stripe and entitlement columns with `IF NOT EXISTS` before
  any statement references them;
- normalizes `plan` and `tier` to `starter`, `professional`, `business`, or
  `enterprise`;
- chooses the highest recognized value across the two legacy columns so an
  obsolete value such as `plan='free'` cannot hide a valid paid tier;
- backfills only missing or empty entitlements, preserving non-empty custom or
  contract payloads;
- establishes canonical defaults, nullability, validated checks, and unique
  indexes;
- fails on legacy duplicate organization or Stripe identifiers rather than
  silently deleting or merging customer billing rows.

## Safety boundary

The migration does not delete subscriptions, truncate tables, drop columns,
disable RLS, broaden policies, or alter application rows outside
`public.subscriptions`. It is idempotent for already-canonical schemas and runs
inside one transaction.

The migration is not automatically authorized for production by this decision.
It must pass the repository migration review, dry-run, exact-SHA evidence, and
protected production deployment workflow.

## Consequences

Fresh environments and legacy environments converge on the same billing column
contract. Stripe webhooks and runtime entitlement proofs no longer rely on an
out-of-band manual column repair.

A production environment containing duplicate organization IDs, duplicate
Stripe customer IDs, or duplicate Stripe subscription IDs will fail closed at
the unique-index step and require an explicit data reconciliation decision.

## Rollback

Before production application, revert the implementation PR. After successful
application, rollback should not remove the additive columns because they are
part of the canonical application contract. A rollback must instead restore the
previous application version while retaining the repaired schema.
