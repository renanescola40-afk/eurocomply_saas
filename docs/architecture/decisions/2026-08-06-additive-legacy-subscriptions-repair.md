# Additive repair for legacy subscriptions schemas

## Status

Accepted for implementation on 2026-08-06.

## Context

The billing migration chain created `public.subscriptions` in more than one era.
The original table did not contain `tier` or `entitlements`. A later migration
included `tier` inside `CREATE TABLE IF NOT EXISTS`, but PostgreSQL does not add
columns from that definition when the table already exists. The same migration
only added the Stripe identifiers and period end additively.

Subsequent migrations referenced `tier` and `entitlements` directly. This
created two failure modes:

- a clean rebuild from migration history could stop at the first `tier`
  reference before reaching a late repair;
- an already-deployed legacy database could require an out-of-band manual schema
  repair before Stripe state and entitlements could be persisted.

Legacy values can also contain whitespace. Runtime normalization trims those
values, so the database repair must do the same to avoid downgrading a value such
as `plan=' enterprise '` to `starter`.

## Decision

Use a two-part additive repair:

1. amend the historical Stripe sync migration to add `tier` explicitly with
   `ADD COLUMN IF NOT EXISTS` before any later migration references it; and
2. add a new versioned, transactional migration for databases where the
   historical migration has already been recorded.

The new migration:

- fails closed unless `public.subscriptions` already exists;
- adds all canonical Stripe and entitlement columns with `IF NOT EXISTS` before
  any statement references them;
- trims and normalizes `plan` and `tier` to `starter`, `professional`,
  `business`, or `enterprise`;
- chooses the highest recognized value across the two legacy columns so an
  obsolete value such as `plan='free'` cannot hide a valid paid tier;
- backfills only missing or empty entitlements, preserving non-empty custom or
  contract payloads;
- establishes canonical defaults, nullability, validated checks, and unique
  indexes;
- fails on legacy duplicate organization or Stripe identifiers rather than
  silently deleting or merging customer billing rows.

## Safety boundary

The repair does not delete subscriptions, truncate tables, drop columns, disable
RLS, broaden policies, or alter application rows outside `public.subscriptions`.
The late repair is idempotent for already-canonical schemas and runs inside one
transaction.

Changing the historical file repairs deterministic fresh rebuilds; it does not
claim that previously recorded environments rerun that migration. Those
environments are repaired only by the new migration.

Neither change is automatically authorized for production by this decision.
They must pass repository migration review, dry-run, exact-SHA evidence, and the
protected production deployment workflow.

## Consequences

Fresh environments and already-deployed legacy environments converge on the
same billing column contract. Stripe webhooks and runtime entitlement proofs no
longer rely on an out-of-band manual column repair.

A production environment containing duplicate organization IDs, duplicate
Stripe customer IDs, or duplicate Stripe subscription IDs will fail closed at
the unique-index step and require an explicit data reconciliation decision.

## Rollback

Before production application, revert the implementation PR. After successful
application, rollback should not remove the additive columns because they are
part of the canonical application contract. A rollback must instead restore the
previous application version while retaining the repaired schema.
