# RISCK COMPLY — LIVE add-on billing closure

Date: 2026-09-10

## Provider catalog

The Stripe LIVE account has 13 add-on Products and 26 recurring Prices (monthly and annual). Product/Price creation did not mutate any existing customer, subscription or invoice and did not create synthetic transactions.

## Commercial activation boundary

A LIVE Stripe Product/Price is necessary but not sufficient for self-service sale. An add-on is marked `active` only when the application already has a protected entitlement consumer for the promised capability.

Commercially implementation-ready in this release:

- Regulatory Monitoring Pro
- AI Literacy Hub
- FRIA Workspace
- Annex IV Pro
- Vendor Assurance
- Advanced Reporting
- Evidence Vault

Retained as `private_preview` until their separate provisioning/capacity authority is implemented:

- Procurement Pack
- API Pack
- White Label
- Extra Organization
- Extra User
- Extra Storage 100GB

Preview add-ons may display canonical prices but cannot be selected by the subscription mutation API.

## Production release gate

Implementation readiness does not enable paid add-on purchasing in Production. `replace_add_ons` remains fail-closed until all of the following are simultaneously true at runtime:

- `ADDON_CHECKOUT_ENABLED=true`
- `ADDON_BASE_BILLING_RUNTIME_ACCEPTED=true`
- `OWNER_ENABLEMENT_AUTHORIZED=true`
- `ADDON_ACCEPTED_PRODUCTION_SHA=<accepted full production SHA>` and that value exactly matches the runtime deployment SHA resolved from Vercel/build metadata.

The Upgrade Center uses the same server-side gate before rendering the purchase action. When the gate is closed, canonical prices and eligibility may remain visible, but the page is catalogue-only and explains that commercial enablement is pending.

The API independently enforces the gate before subscription binding lookup and before `mutateSubscriptionLifecycle`, so client-side tampering or a direct request cannot reach a Stripe add-on mutation while Production enablement is closed.

These variables must not be set to their enabling values until base billing runtime and exact-SHA Production gates are accepted. The accepted SHA must be changed for each separately approved deployment; a later deployment does not inherit add-on enablement accidentally.

## Authority chain

1. Owner/Admin requests an add-on change through the protected billing UI only after the Production release gate is open.
2. `/api/billing/subscription` validates the release gate, membership, `manage_billing`, mutation trust controls, rate limits, step-up authentication, plan eligibility, dependencies and idempotency.
3. Stripe subscription items are mutated using canonical Price bindings. Explicit add-on purchases use `always_invoice` so a mid-cycle addition receives immediate invoice/payment handling instead of waiting for renewal.
4. `customer.subscription.updated` never activates a newly-added item by itself. A new item remains inactive pending payment evidence.
5. `invoice.paid` activates an eligible add-on only when the paid invoice lines reference that exact Stripe subscription item. An older/replayed paid invoice cannot activate a newer item. `invoice.payment_failed` moves authority to `past_due`; deletion/removal revokes authority.
6. Signed Stripe events reconcile `organization_add_ons`; browser state, URL parameters and stale rows are not commercial authority.
7. The subscription lifecycle identifies exactly one base plan item through the canonical server-side plan Price allowlist. Item order, `usage_type`, and merely being "not an add-on" are not accepted as base-plan authority.
8. Plan changes derive current add-ons from Stripe provider items. Add-ons that remain eligible are preserved; paid duplicates are removed when the destination plan already includes the capability.

## Safety invariants

- Existing active add-ons are preserved when a new add-on is requested.
- Unknown, preview or plan-ineligible add-on Prices fail closed.
- A subscription with zero or multiple allowlisted base-plan Prices fails closed.
- A known add-on item without the required organization/customer/subscription binding fails closed.
- Missing local Stripe Customer binding fails closed; organization, subscription and Customer must correlate exactly.
- Invoice pagination or missing invoice-item identity fails closed for paid activation.
- Unrelated legacy entitlement events with no add-on Price authority are ignored by the add-on reconciliation lane.
- A late `invoice.paid` cannot revive a cancelled subscription or activate an item absent from that invoice.
- Upgrade/downgrade handling must not silently double-charge an add-on that becomes included in the destination plan.
- Audit persistence is required for successful reconciliation.
- No production entitlement is granted by repository configuration alone.
- No synthetic LIVE transaction is required or permitted solely to manufacture evidence.
