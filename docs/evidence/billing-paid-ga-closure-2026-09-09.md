# RISCK COMPLY — Billing + VAT + Paid Customer Closure

Prepared: 2026-09-09  
Last reconciled: 2026-09-13  
Lane: Billing / VAT / legitimate LIVE customer / commercial closure

## Truth boundary

Public paid GA is not approved while authoritative seller registry/tax facts, exact-SHA Production binding, and a legitimate LIVE customer lifecycle remain unproved.

Internal implementation, provider platform proof events, seeded database rows, test-mode Stripe objects and documentation do not substitute for a genuine LIVE customer transaction.

## Reconciled LIVE provider facts — 2026-09-13

- Stripe LIVE canonical products/prices exist for Essential, Professional and Business.
- Canonical EUR prices observed remain aligned with source billing authority: Essential EUR 49/month and EUR 490/year; Professional EUR 149/month and EUR 1,490/year; Business EUR 399/month and EUR 3,990/year.
- Stripe Tax service status is active.
- Stripe Tax default tax behavior is `exclusive`.
- Stripe Tax default product classification is now explicitly `txcd_10103001` — Software as a service (SaaS), business use.
- The SaaS tax-code correction did not create a customer, payment, invoice, subscription or tax registration.
- Stripe Tax tax registrations remain zero. No registration may be created solely to make Enterprise evidence green.
- Canonical Price objects may retain `tax_behavior=unspecified`; Stripe Tax falls back to the account default tax behavior/classification when automatic tax is used.
- LIVE webhook endpoint remains enabled at `https://www.risckcomply.com/api/stripe/webhook` for checkout, subscription and invoice lifecycle events.
- LIVE Customer Portal is configured for billing address/tax-ID updates, payment-method updates and invoice history.
- At the reconciliation snapshot there were zero legitimate LIVE Customers, Checkout Sessions, Subscriptions, Invoices and Charges in the connected RISCK COMPLY LIVE Stripe account.

## Checkout and tax implementation

Current source requires billing-address collection, enables Tax ID collection and enables Stripe Checkout automatic tax for supported self-service checkout.

The seller-specific VAT regime is intentionally not inferred from those implementation controls. Stripe Tax technical readiness does not prove the contracting entity's current Portuguese VAT registration, domestic regime, VIES state, registered office or legal activity/CAE.

## General VAT implementation boundary

The application may use general official VAT rules to implement customer-location and reverse-charge behavior, but the seller-specific tax state must come from attributable official evidence.

Operational expectations to validate after seller facts are authoritative include:

- domestic Portugal B2B treatment;
- EU B2B treatment for a validated VAT ID;
- EU B2B treatment when a VAT ID is absent or cannot be validated;
- non-EU B2B treatment;
- VIES validation behavior;
- invoice wording, including reverse-charge wording where applicable;
- Stripe Tax registrations only where the seller is genuinely registered/obliged.

## Seller / registry evidence state

Owner designation is closed for:

- operator: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- contracting entity: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- seller: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`.

Working evidence contains candidate NIF/NIPC `515099899` and candidate VAT format `PT515099899`, but the current connected evidence set still lacks a current authoritative Portuguese registry/tax artifact sufficient to accept those fields as final seller VAT/registry truth.

A fresh search of connected Gmail and Library on 2026-09-13 did not find an AT declaration, accountant confirmation, current Certidao Permanente access code, VAT-regime statement or equivalent authoritative record closing this gate.

The official Portuguese public company-publications portal supports search by NIF/NIPC, but indexed web access did not expose the company result through the connected tooling. No paid certificate was ordered.

Therefore:

- `SELLER_ENTITY_OWNER_DECISION=PASS`
- `AUTHORITATIVE_REGISTRY_FACTS=OPEN`
- `VAT_REGIME=OPEN`
- `VAT_REGISTRATIONS=OPEN`
- `STRIPE_ENTITY_TAX_RECONCILIATION=PARTIAL`

Do not change Stripe KYC/business type, registered tax identity or tax registrations merely to match repository expectations. Provider state must follow verified legal/tax truth.

## Data-plane authority

A local `subscriptions` row is not sufficient paid authority. Paid access requires a processed LIVE Stripe subscription event correlated to the same organization, Stripe customer and Stripe subscription, or an authoritative signed-contract entitlement source.

Production contains historical/seeded subscription rows. One locally stored Professional Stripe customer/subscription binding observed during reconciliation is not present in the connected LIVE Stripe account and is therefore not accepted as LIVE customer evidence. Existing source handles a missing/stale Stripe Customer during initial Checkout by failing over to creation of a new provider Customer; the stale local identifier is not paid authority.

Paid self-service authority remains fail-closed unless a processed `livemode=true` Stripe subscription event correlates the organization, Customer and Subscription.

## Webhook and lifecycle implementation

The current webhook implementation:

- validates Stripe signatures with bounded tolerance;
- rejects provider-mode mismatch;
- validates canonical Price authority;
- persists a Stripe event ledger;
- treats event ID as an idempotency boundary;
- supports recovery of abandoned processing leases;
- reconciles subscription/provider truth before invoice side effects where required;
- does not treat browser state, metadata alone or a seeded subscription row as paid authority.

Current lifecycle source supports:

- upgrade with provider proration behavior;
- downgrade scheduled for period end through Stripe Subscription Schedules;
- cancellation through `cancel_at_period_end=true`;
- reactivation before the paid period ends;
- `invoice.payment_failed` handling and idempotent failure notification;
- paid add-on activation only from eligible provider/invoice evidence.

These are source/runtime implementation signals. Terminal LIVE lifecycle PASS still requires legitimate external customer activity.

## Add-ons

Stripe LIVE add-on Products/Prices exist. Commercially implemented add-ons remain protected by the server-side release boundary and exact-SHA/base-billing acceptance gates.

Do not enable add-on purchase merely because provider catalogue objects exist. Optional add-ons do not block base paid GA while their release gate remains truthfully fail-closed.

## Exact-SHA Production boundary

Observed on 2026-09-13:

- GitHub `main`: `6b1c8f1528bfb48055a1233213e2a88cec64780a` at reconciliation start.
- canonical Production deployment: `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9`.
- Production Git SHA: `13b19410caa20045b19d98d58df406c43433af5a`.

Production therefore remains behind current `main`. Newer previews do not count as Production acceptance.

The billing core reviewed in the earlier reconciliation was not changed by the subsequent 20 commits from `7ad578b7ed4224a2b4348c448492332c2313ad12` to `6b1c8f1528bfb48055a1233213e2a88cec64780a`; those changes were confined to assurance/legal/trust and locale-cookie/security surfaces. This does not waive the final exact-SHA Production gate.

## Legitimate LIVE customer evidence

At this snapshot:

- `REAL_CUSTOMER_EVIDENCE=WAITING_REAL_BUYER`
- `LIVE_SUBSCRIPTION=WAITING_REAL_BUYER`
- `LIVE_ENTITLEMENT=WAITING_REAL_BUYER`
- `LIVE_INVOICE=WAITING_REAL_BUYER`

Provider/platform proof events are engineering evidence only and are not revenue evidence.

When the first legitimate customer exists, retain attributable evidence for:

1. Checkout completed;
2. genuine payment outcome;
3. signed LIVE webhook delivery;
4. durable event ledger processing;
5. LIVE subscription persistence;
6. entitlement activation;
7. invoice generation/payment state;
8. quota enforcement;
9. upgrade;
10. downgrade;
11. cancellation;
12. reactivation;
13. payment failure and recovery behavior where naturally available.

Do not spend owner money or manufacture a customer merely to satisfy the evidence matrix.

## Remaining owner/external gates

1. Obtain current authoritative company/registry evidence sufficient to confirm registered name, NIPC, registered office and relevant registered activity/object.
2. Obtain owner-controlled official AT/accountant evidence of the current Portuguese VAT regime/registration state and, where applicable, VAT/VIES status.
3. Reconcile Stripe KYC/business profile and Tax registrations to those verified facts only.
4. Freeze and deploy one accepted exact SHA to Production through the canonical release lane.
5. When a legitimate buyer exists, capture the genuine LIVE billing lifecycle instead of creating a synthetic LIVE transaction.

Until all applicable items above are closed, `PUBLIC_PAID_GA=FAIL_CLOSED`.

## Lane score — evidence weighted

Snapshot after 2026-09-13 reconciliation:

- `BILLING_SOURCE_PERCENT=90`
- `STRIPE_PROVIDER_PERCENT=86`
- `VAT_FACT_PERCENT=25`
- `LIVE_CUSTOMER_EVIDENCE_PERCENT=0`
- `COMMERCIAL_READY_PERCENT=64`

The low VAT/customer percentages are intentional evidence discipline, not a claim that the billing source implementation regressed.
