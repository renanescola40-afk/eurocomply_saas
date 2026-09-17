# RISCK COMPLY — Billing / Stripe / VAT / Commercial Reconciliation

Date: 2026-09-17  
Lane: Commercial / Billing / Stripe / VAT  
Mode: read-only provider reconciliation; no synthetic LIVE customer/payment; no email; no fiscal/KYC mutation

## Release binding

- GitHub `main`: `595bc6f0bf1fce18cc6d9acbabb2e70fa05c7b59`.
- Canonical `www.risckcomply.com` Production remains on Git SHA `13b19410caa20045b19d98d58df406c43433af5a`.
- Exact-SHA Production convergence is therefore still open and remains owned by the technical release lane.

`EXACT_SHA_PRODUCTION=BLOCKED_TECHNICAL_LANE`

## Stripe LIVE account operability

Connected LIVE account: `acct_1U6IuJGt3cgjPOtq` (`RISCK COMPLY SAAS`).

Current provider inspection proves:

- `charges_enabled=true`;
- `payouts_enabled=true`;
- payment capabilities including card payments and transfers are active;
- current account `requirements.currently_due=[]`, `past_due=[]`, `pending_verification=[]`, and there is no current disable reason;
- Stripe email dated 2026-08-20 confirms the additional information was received and there were no active account-status tasks.

The Account object still reports the representative verification status as `unverified` / `failed_keyed_identity`. This does not currently disable charges or payouts and no active account requirements are reported. Preserve this as a factual provider inconsistency; do not fabricate a PASS for identity verification itself.

Therefore:

- `STRIPE_ACCOUNT_OPERABILITY=PASS`
- `STRIPE_ACTIVE_REQUIREMENTS=PASS_NONE_CURRENT`
- `STRIPE_REPRESENTATIVE_VERIFICATION=INCONSISTENT_NON_BLOCKING_CURRENT_OPERABILITY`

## Stripe entity / tax profile

Current LIVE provider state also reports:

- `business_type=individual`;
- company name `Samuel Cerqueira, Unipessoal Lda.`;
- `company.tax_id_provided=false`;
- Stripe Tax status `active`;
- Stripe Tax default tax behavior `exclusive`;
- default tax code `txcd_10103001` (SaaS, business use);
- Stripe Tax registrations: zero.

These settings do not establish the Portuguese seller's legal identity, VAT regime, VAT registration, VIES state, registered office or CAE. Do not mutate Stripe KYC, tax identity or registrations until attributable official Portuguese registry/tax evidence exists.

- `STRIPE_TAX_ENGINE=PASS_TECHNICAL`
- `STRIPE_TAX_REGISTRATIONS=ZERO_CURRENT`
- `STRIPE_ENTITY_TAX_RECONCILIATION=BLOCKED_AUTHORITATIVE_FACTS`

## LIVE billing objects

The 2026-09-17 LIVE account snapshot contains:

- Customers: 0
- Checkout Sessions: 0
- Subscriptions: 0
- Invoices: 0
- Charges: 0

This is a legitimate pre-revenue state. It must not be treated as a source-code defect and must not be replaced with synthetic LIVE commerce.

- `REAL_CUSTOMER_LIFECYCLE=WAITING_REAL_CUSTOMER`
- `SYNTHETIC_LIVE_EVIDENCE_CREATED=false`

## LIVE webhook

One LIVE webhook endpoint is enabled at:

`https://www.risckcomply.com/api/stripe/webhook`

Enabled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

Current source validates Stripe signatures, provider mode, canonical Price authority and idempotent/recoverable processing before paid authority is granted.

`SIGNED_WEBHOOK_SOURCE_AND_PROVIDER_CONFIGURATION=PASS`

## Billing authority and lifecycle

Current source remains fail-closed:

- browser state does not grant paid entitlement;
- a local subscription row is insufficient;
- test-mode identifiers do not grant paid authority;
- self-service paid authority requires a processed `livemode=true` Stripe subscription event correlated to the same organization, Customer and Subscription;
- negotiated Enterprise access requires a valid authoritative signed-contract source and applied entitlement snapshot;
- server-side lifecycle supports upgrade, downgrade-at-period-end, cancellation, reactivation, payment-failure handling, allowed add-ons and quota/entitlement enforcement.

No demonstrated billing-code defect was found in this reconciliation. Under the no-new-billing-code-without-defect rule, no billing engineering PR is warranted.

- `BILLING_ENGINEERING=PASS_SOURCE`
- `PAYMENT_FIRST_ENTITLEMENT=PASS_SOURCE`
- `NO_BROWSER_ENTITLEMENT_GRANT=PASS_SOURCE`
- `TENANT_CORRELATION=PASS_SOURCE`
- `PLAN_QUOTA_AUTHORITY=PASS_SOURCE`
- `ADDON_AUTHORITY=PASS_SOURCE`

## Official seller facts

Owner designation remains:

- operator: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- contracting entity: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- seller: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`.

Connected Gmail and Library were searched again on 2026-09-17. No current Certidão Permanente access code, authoritative Portuguese commercial-registry extract, AT VAT-regime statement, authoritative current CAE/activity document, or equivalent attributable artifact was recovered.

Working materials contain candidate NIF/NIPC `515099899` and candidate VAT format `PT515099899`, but they remain candidates and must not be promoted to official seller facts by inference.

The free route of consulting an already-issued Certidão Permanente is exhausted in the connected evidence set because no access code is available. Ordering a new certificate is a paid owner action and was not performed.

- `AUTHORITATIVE_COMPANY_REGISTRY=BLOCKED_OWNER_OR_PAID_OFFICIAL_SOURCE`
- `REGISTERED_ENTITY_FACTS=BLOCKED`
- `VAT_REGIME=BLOCKED_AUTHORITATIVE_AT_EVIDENCE`
- `VAT_REGISTRATIONS_OR_VALID_NA=BLOCKED`
- `VIES_OR_VALID_NA=NOT_VERIFIED`
- `CAE_ACTIVITY_STATUS=BLOCKED_AUTHORITATIVE_REGISTRY_OR_AT_EVIDENCE`
- `INVOICE_IDENTITY=BLOCKED_ENTITY_FACTS`

## Terminal commercial state

```text
LANE=COMMERCIAL
CURRENT_MAIN_SHA=595bc6f0bf1fce18cc6d9acbabb2e70fa05c7b59
CURRENT_PRODUCTION_SHA=13b19410caa20045b19d98d58df406c43433af5a

BILLING_ENGINEERING=PASS_SOURCE
STRIPE_ACCOUNT_OPERABILITY=PASS
STRIPE_TAX_ENGINE=PASS_TECHNICAL
ENTITY_FACTS=BLOCKED
VAT_FACTS=BLOCKED
STRIPE_ENTITY_TAX_RECONCILIATION=BLOCKED
EXACT_SHA_PRODUCTION=BLOCKED_TECHNICAL_LANE
REAL_CUSTOMER_LIFECYCLE=WAITING_REAL_CUSTOMER
PAYING_CUSTOMER_READY=NO
COMMERCIAL_ENTERPRISE_100=NO
PUBLIC_PAID_GA=FAIL_CLOSED
EMAIL_SENT=false
PAID_PURCHASE_PERFORMED=false
GOVERNMENT_FILING_PERFORMED=false
STRIPE_KYC_OR_TAX_MUTATION_PERFORMED=false
```

## Remaining mandatory blockers

1. Current authoritative Portuguese company/registry evidence: exact registered name, NIPC, registered office and relevant registered object/activity.
2. Current authoritative AT/accountant evidence establishing VAT regime/registration state and current activity/CAE; VIES evidence if applicable.
3. Reconcile Stripe entity/KYC/tax-registration facts only after items 1–2 are authoritative.
4. Promote one accepted exact SHA through the canonical technical release lane and re-prove Production against that SHA.

A genuine customer lifecycle is evidence to capture when a legitimate buyer exists; absence of a customer is not itself a billing-code defect and synthetic LIVE commerce is prohibited.
