# Remaining owner actions — Billing + VAT closure

These are the only remaining actions that must not be guessed or synthetically manufactured.

## Stripe seller / VAT

- Confirm the contracting seller legal entity used for RISCK COMPLY subscriptions.
- Confirm the correct NIF/NIPC for that entity.
- Confirm whether that entity is VAT registered and, if yes, the exact VAT ID and jurisdictions already registered with the relevant tax authorities.
- Confirm the legal registered/head-office address for tax purposes.
- Confirm whether public plan prices are intended to be displayed exclusive of VAT or VAT-inclusive for the approved B2B commercial model.
- Confirm the appropriate Stripe Tax product tax code for the RISCK COMPLY SaaS/compliance service with the accountant/tax adviser where needed.

## Exact-SHA Production release

- Promote/deploy the frozen reviewed main SHA through the canonical Production release lane.
- Verify `www.risckcomply.com` resolves to that exact SHA before collecting LIVE evidence.

## Legitimate LIVE lifecycle

After seller/tax configuration and exact-SHA Production binding are correct, explicitly authorize one genuine allowed self-serve transaction for the controlled validation organization. Then prove provider/runtime outcomes for initial Checkout, subscription activation, invoice paid, webhook processing, entitlements, upgrade, downgrade, cancellation/reactivation, and failed-payment fail-closed behavior.

No item above may be replaced by a seed row, test-mode object, synthetic LIVE payment, invented tax identifier, fake reviewer approval, or unsigned/random webhook POST.
