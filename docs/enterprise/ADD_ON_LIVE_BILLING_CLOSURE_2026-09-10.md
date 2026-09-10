# RISCK COMPLY — LIVE add-on billing closure

Date: 2026-09-10

## Provider catalog

The Stripe LIVE account has 13 add-on Products and 26 recurring Prices (monthly and annual). Product/Price creation did not mutate any existing customer, subscription or invoice and did not create synthetic transactions.

## Commercial activation boundary

A LIVE Stripe Product/Price is necessary but not sufficient for self-service sale. An add-on is marked `active` only when the application already has a protected entitlement consumer for the promised capability.

Commercially active in this release:

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

## Authority chain

1. Owner/Admin requests an add-on change through the protected billing UI.
2. `/api/billing/subscription` validates membership, `manage_billing`, mutation trust controls, rate limits, step-up authentication, plan eligibility, dependencies and idempotency.
3. Stripe subscription items are mutated using canonical Price bindings.
4. `customer.subscription.updated` never activates a newly-added item by itself. A new item remains inactive pending payment evidence.
5. `invoice.paid` activates eligible add-ons; `invoice.payment_failed` moves them to `past_due`; deletion/removal revokes authority.
6. Signed Stripe events reconcile `organization_add_ons`; browser state, URL parameters and stale rows are not commercial authority.
7. The subscription lifecycle identifies the base plan item by excluding canonical add-on Prices, not by Stripe item order or `usage_type`, so licensed recurring add-ons cannot be mistaken for the base plan.

## Safety invariants

- Existing active add-ons are preserved when a new add-on is requested.
- Unknown, preview or plan-ineligible add-on Prices fail closed.
- Multiple/ambiguous base subscription items fail closed.
- A late `invoice.paid` cannot revive a cancelled subscription.
- Audit persistence is required for successful reconciliation.
- No production entitlement is granted by repository configuration alone.
