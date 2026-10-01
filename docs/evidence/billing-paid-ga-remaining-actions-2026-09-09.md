# Remaining owner actions — Billing + VAT closure

These are the only remaining actions that must not be guessed or synthetically manufactured.

## Stripe seller / VAT

- Confirm the contracting seller legal entity used for RISCK COMPLY subscriptions.
- Confirm the correct NIF/NIPC for that entity.
- Confirm whether that entity is VAT registered and, if yes, the exact VAT ID and jurisdictions already registered with the relevant tax authorities.
- Confirm the legal registered/head-office address for tax purposes.
- Confirm whether public plan prices are intended to be displayed exclusive of VAT or VAT-inclusive for the approved B2B commercial model.
- Confirm the appropriate Stripe Tax product tax code for the RISCK COMPLY SaaS/compliance service with the accountant/tax adviser where needed.

## Verified Production runtime release subject — 2026-10-01

The following evidence records the exact runtime release subject that was observed in Production. It does not claim that a later documentation-only commit is itself deployed.

- Verified runtime subject SHA: `b5cf5fcbe9fb73934397860ba1e81e561b3cbabf`.
- Canonical Production deployment: `dpl_Djyf24n5E92LnAcCXxgWwXnbhyKf`.
- Vercel state at verification: `READY`.
- Canonical aliases included `www.risckcomply.com` and `risckcomply.com`.
- Runtime HTML on `www.risckcomply.com` reported Sentry release `b5cf5fcbe9fb73934397860ba1e81e561b3cbabf`, confirming convergence for that verified runtime subject.
- The unauthenticated `/pt/dashboard` route resolved to the login surface rather than exposing product content.
- No current-deployment error logs were observed in the checked post-deploy window.

This closes the exact-SHA verification for the deployed runtime subject above. A later repository-only documentation commit must not be represented as Production runtime evidence unless separately deployed and verified. Seller/VAT facts, legal publication, and the legitimate LIVE billing lifecycle remain open.

## Legitimate LIVE lifecycle

After seller/tax configuration is correct, explicitly authorize one genuine allowed self-serve transaction for the controlled validation organization. Then prove provider/runtime outcomes for initial Checkout, subscription activation, invoice paid, webhook processing, entitlements, upgrade, downgrade, cancellation/reactivation, and failed-payment fail-closed behavior.

## Public legal publication gate

Current Production remains intentionally fail-closed for public self-serve checkout because the public legal contract authority is still in review state:

- Terms: `0.3-review`, `publicationState=review`, `effectiveDate=null`.
- Privacy: `0.2-review`, `publicationState=review`, `effectiveDate=null`.

Do not promote these publications to `effective` until the remaining attributable registry/tax/provider/privacy facts and any required qualified review are closed. Checkout clickwrap must remain bound to the exact effective Terms and Privacy versions.

No item above may be replaced by a seed row, test-mode object, synthetic LIVE payment, invented tax identifier, fake reviewer approval, or unsigned/random webhook POST.
