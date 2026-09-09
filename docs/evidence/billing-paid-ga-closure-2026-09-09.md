# RISCK COMPLY — Billing + VAT + Paid Customer Closure — 2026-09-09

## Truth boundary

Public paid GA is not approved while VAT/tax seller configuration, exact-SHA Production binding, and a legitimate LIVE customer lifecycle remain unproved.

## Confirmed LIVE provider facts

- Stripe LIVE canonical products: Essential, Professional, Business.
- Canonical EUR monthly/annual prices exist and are active.
- Stripe Tax status is active with default tax behavior `exclusive`.
- Stripe Tax currently has no tax registrations.
- Stripe Tax default product tax code is not configured.
- Canonical Stripe Products currently have no product-level tax code.
- LIVE webhook endpoint is enabled at `https://www.risckcomply.com/api/stripe/webhook` for checkout, subscription and invoice lifecycle events.
- There are currently no legitimate LIVE Customers, Checkout Sessions, or Subscriptions to close the paid lifecycle evidence gate.

## Commercial model

- Essential: self-serve.
- Professional: self-serve.
- Business: sales-assisted.
- Enterprise: negotiated / contract-led.

## Data-plane authority

A local `subscriptions` row is not sufficient paid authority. Paid access requires a processed LIVE Stripe subscription event correlated to the same organization, Stripe customer and Stripe subscription, or an authoritative signed-contract entitlement source. Seeded/test-mode/status-only rows remain non-authoritative.

Production billing tables are protected by RLS + FORCE RLS. Internal billing control tables are service-role-only; authenticated users have read-only organization-scoped access to `subscriptions` and cannot directly insert/update/delete paid authority.

## Public paid GA fail-closed rule

`RISCK_COMPLY_PAID_BILLING_REQUIRED=false` means public initial self-serve Checkout is not released. Existing legitimate LIVE subscriber lifecycle remains available.

A controlled owner-authorized LIVE validation may scope `RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID` to exactly one organization while public paid GA remains disabled. This override authorizes routing only; it does not itself authorize or manufacture a LIVE payment.

## Remaining external/owner gates

1. Reconcile the Stripe seller profile with the actual contracting legal entity.
2. Provide/confirm the correct NIF/NIPC and VAT registration status; do not infer conflicting historical values.
3. Confirm the legal registered/head-office address used for tax purposes.
4. Confirm the correct Stripe Tax product tax classification for RISCK COMPLY's SaaS/compliance service.
5. Add only genuine tax registrations already held with the relevant tax authority.
6. Freeze and deploy the exact reviewed SHA to Production.
7. With explicit owner authorization, execute one legitimate LIVE self-serve transaction through the controlled validation organization.
8. Use that genuine subscription to prove activation, invoice paid, webhook delivery, plan isolation, upgrade, downgrade, cancellation/reactivation and payment-failure fail-closed behavior.

Until all applicable items above are closed, `PUBLIC_PAID_GA=FAIL_CLOSED`.
