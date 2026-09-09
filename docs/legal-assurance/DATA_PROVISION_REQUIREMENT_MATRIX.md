# RISCK COMPLY — GDPR Article 13(2)(e) Data Provision Requirement Matrix

Date: 2026-09-09  
Purpose: identify, from current product implementation, whether data provision is required by law, contract/product operation, or optional, and record the consequence of non-provision. This is a factual control map, not a final legal-basis opinion.

GDPR Article 13(2)(e) requires the controller to tell a data subject whether provision of personal data is a statutory or contractual requirement, or necessary to enter into a contract, whether the data subject is obliged to provide it, and the possible consequences of not providing it.

Official baseline: Regulation (EU) 2016/679, Article 13(2)(e), EUR-Lex.

## Current product mapping

| Field / category | Collection surface | Current factual requirement | Consequence if not provided | Personal-data note | State |
|---|---|---|---|---|---|
| Authentication email / identity-provider subject identifier | account authentication | necessary for the current authenticated account/session model | account/session cannot be established through the current authentication path | personal data | PASS_FACTUAL_MAPPING |
| Organisation name | onboarding | product-required: onboarding validation requires a non-empty name of minimum accepted length; draft save also requires it | organisation/workspace onboarding cannot be saved/completed through the current flow | generally company data, but may identify a sole trader or individual | PASS_FACTUAL_MAPPING |
| Workspace slug | onboarding | product-required: onboarding validation requires valid slug; draft save requires it | workspace onboarding cannot be saved/completed through the current flow | generally not personal unless derived from a person's identity | PASS_FACTUAL_MAPPING |
| Main operating country | onboarding | current flow always carries a selected country value and uses it for jurisdiction context | current onboarding cannot represent an unset country state; regulatory recommendations may be incorrect if an inaccurate value is supplied | usually organisation data; may be personal for sole traders | PASS_FACTUAL_MAPPING |
| Company type | onboarding | current flow carries a selected company-type value | operating-model task depth/context would be based on the selected/default value | usually organisation data | PASS_FACTUAL_MAPPING |
| Sector | onboarding | current flow carries a selected sector value | sector-based risk/policy/evidence prioritisation would be based on the selected/default value | usually organisation data | PASS_FACTUAL_MAPPING |
| AI usage level | onboarding | current flow carries a selected AI-usage value | readiness/risk context would be based on the selected/default value | usually organisation/business data | PASS_FACTUAL_MAPPING |
| AI usage free-text summary | onboarding | not blocked by step validation | onboarding can continue without it | may contain personal data if the customer enters it | OPTIONAL |
| First AI system name | onboarding | product-required: first-system validation requires minimum accepted length | onboarding cannot progress through first-system step | normally business/system data; may include names entered by customer | PASS_FACTUAL_MAPPING |
| AI system use case | onboarding | product-required: validation requires minimum accepted length | onboarding cannot progress through first-system step | may contain personal data depending on customer input | PASS_FACTUAL_MAPPING |
| Owner team | onboarding | product-required: validation requires minimum accepted length | onboarding cannot progress through first-system step | team name is usually business data; may identify persons if entered that way | PASS_FACTUAL_MAPPING |
| Vendor/model provider | onboarding | explicitly marked optional in UI | onboarding continues without it; vendor context is less complete | normally business data | OPTIONAL |
| Risk signals (personal-data use, human interaction, generation, biometric/prohibited-use signals) | onboarding | current flow presents boolean configuration values; no explicit validation requires affirmative selection | initial risk classification/readiness is calculated from supplied/default values | generally system-risk data; can imply processing of individuals | PASS_FACTUAL_MAPPING |
| Teammate invitation email addresses | onboarding | explicitly marked optional | no teammate invitation is created | personal data of invitee; can be provided by an organisation admin rather than the invitee | OPTIONAL_ART14_RELEVANT |
| Selected billing plan | onboarding / billing | commercial selection required to choose the subscription path | paid checkout cannot determine the intended product entitlement without a plan | usually not personal by itself | PASS_FACTUAL_MAPPING |
| Billing address | Stripe Checkout | provider configuration sets `billing_address_collection: 'required'` | initial Stripe Checkout cannot be completed without the billing address required by the provider flow | personal data where address relates to an individual/sole trader/contact | PASS_FACTUAL_MAPPING |
| Customer name in Stripe | Stripe customer/checkout | organisation name is supplied to the Stripe customer where present; Checkout is allowed to update the customer name | provider billing identity can be incomplete or updated according to Checkout | can be personal for sole trader/contact | PASS_FACTUAL_MAPPING |
| Tax ID | Stripe Checkout | tax-ID collection is enabled; the implementation does not itself prove that every purchaser must enter a tax ID in every jurisdiction/circumstance | tax treatment/invoice data may differ if not supplied where applicable | company identifier generally; may be personal for sole traders | CONDITIONAL_PROVIDER_RULE |
| Payment method | Stripe Checkout | provider configuration sets payment-method collection to `always` for initial paid checkout | paid subscription checkout cannot complete without an accepted payment method | payment data processed primarily by Stripe; RISCK COMPLY should not store raw card data | PASS_FACTUAL_MAPPING |

## Evidence anchors

Current code establishes the principal product facts used above:

- `src/components/onboarding/b2b-onboarding-flow.tsx`: organisation name + slug and first AI-system fields are validated as required; vendor/model provider and teammate invitation emails are explicitly marked optional.
- `src/app/api/billing/checkout/route.ts`: initial paid Checkout requires billing address, enables tax-ID collection and automatic tax, and always collects a payment method.

## Public notice requirement

The current product implementation now has enough factual evidence to prepare an Article 13(2)(e) disclosure distinguishing:

- information necessary to create/use the authenticated service;
- information required by the product workflow;
- information required for paid Checkout;
- optional data;
- conditional tax information.

Publication remains tied to the complete Privacy notice because the current public Privacy page is not yet a complete Articles 13/14 notice.

## Terminal state

```text
ARTICLE13_2E_FACT_INVENTORY=PASS
MANDATORY_OPTIONAL_DISTINCTION=PASS
CONSEQUENCE_OF_NON_PROVISION=PASS_FACTUAL_MAPPING
PUBLIC_ART13_2E_DISCLOSURE=PENDING_PRIVACY_RECONCILIATION
ARTICLE13_2E=PASS_PRE_PUBLICATION
```

This matrix does not state that every product-required field is a statutory requirement. Product necessity, contractual necessity and statutory obligation must remain distinct.