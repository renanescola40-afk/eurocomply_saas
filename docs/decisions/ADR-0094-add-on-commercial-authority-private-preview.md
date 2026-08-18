# ADR-0094 — Add-on commercial authority remains private preview

- Status: Accepted
- Date: 2026-08-18
- Scope: Billing / entitlements / Upgrade Center

## Context

RISCK COMPLY already contains versioned add-on definitions and a durable Stripe subscription lifecycle operation capable of replacing non-base subscription items. The database also contains `organization_add_ons`, protected with FORCE RLS and service-role-only writes.

The current production implementation does **not** yet materialize signed Stripe subscription-item truth into `organization_add_ons`, and protected feature APIs do not use an independently proven add-on authority when enforcing plan floors. Capacity add-ons are likewise not applied to canonical organization limits.

Selling an add-on in that state would create an unacceptable commercial split-brain: Stripe could charge for an item while the protected product surface or quota engine still denies its promised effect.

## Decision

All add-ons remain in the versioned catalog as `private_preview` until one future implementation proves the complete provider authority chain.

While an add-on is not `active`:

1. it is omitted from the public `/api/billing/catalog` add-on list;
2. `normalizeAddOnSelections` rejects it before a Stripe subscription update is constructed;
3. a persisted `organization_add_ons` row cannot make it an active entitlement;
4. `canAccessFeature` cannot use its slug to elevate a lower plan;
5. the Upgrade Center renders it as unavailable/private preview and does not render a Billing purchase CTA or price as an actionable offer.

Base Essential and Professional self-serve subscriptions are unaffected. Business and Enterprise remain sales-led under the existing billing catalog.

## Activation criteria

An add-on may move to `active` only after code and runtime evidence prove all of the following:

- canonical live Stripe Price binding for monthly and annual cadence;
- signed live Stripe subscription-item reconciliation into `organization_add_ons`;
- organization/customer/subscription correlation;
- idempotent webhook replay and removal reconciliation;
- server-side feature or capacity entitlement consumption;
- downgrade/cancel/payment-failure behavior;
- tests proving client state, query parameters and stale rows cannot grant authority;
- legitimate live runtime acceptance without synthetic customer charges created solely for evidence.

## Consequences

### Positive

- Customers cannot be charged through RISCK COMPLY for an add-on whose protected feature or quota effect is not yet authoritative end to end.
- Stale database rows and client-side add-on identifiers cannot silently reactivate a preview capability.
- The complete catalog, pricing model and lifecycle primitives remain versioned so a future provider-backed activation can be reviewed as an explicit commercial change.
- Existing Essential and Professional self-serve subscription behavior is unchanged.

### Risks and trade-offs

- Add-on revenue and self-serve expansion are intentionally unavailable while provider-backed reconciliation is incomplete.
- Some Upgrade Center entries remain visible as roadmap/private-preview capabilities rather than purchasable products; copy and state must continue to avoid implying an active commercial offer.
- Re-activating add-ons later requires coordinated Stripe Price bindings, webhook reconciliation, feature/quota consumption and live acceptance rather than a catalog-only status change.
- Private preview is a commercial safety boundary, not proof that the future add-on implementation is complete.

## Validation

Regression coverage verifies that private-preview add-ons are omitted from the public active catalog, rejected before subscription-item mutations are constructed, ignored as stale organization entitlement rows, unable to elevate lower-plan feature gates and rendered without a purchase CTA in the Upgrade Center.

The existing Stripe catalog/runtime/security workflows continue to validate base-plan billing independently. No runtime PASS is inferred from this ADR.

## Security and commercial boundary

This decision intentionally prefers an unavailable add-on over a charge for an unenforceable entitlement. It does not delete the add-on engine or catalog; it keeps the future capability versioned while preventing premature sale.

## Rollback

Revert this PR only if the previous add-on commercial behavior must be restored. Doing so would re-expose add-ons as active and is therefore safe only after the provider-backed authority chain described above has been implemented and proven. No database rollback, Stripe object mutation, customer charge, migration reversal or entitlement-data rewrite is required by this PR itself.
