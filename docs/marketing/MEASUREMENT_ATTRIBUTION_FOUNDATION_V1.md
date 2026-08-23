# RISCK COMPLY — MEASUREMENT & ATTRIBUTION FOUNDATION V1

Status: PROVIDER_ACTION_LAYER_READY / READY_FOR_ENGINEERING_HANDOFF / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23
Protected main: `29b40870b25e2d34a9eda921b820047b8020cfb6`

## 1. Objective

Make RISCK COMPLY acquisition measurable from first discovery through licensed commercial activation without weakening the privacy-first analytics boundary or confusing authentication with payment authority.

Canonical chain:

```text
SOURCE
-> CAMPAIGN
-> LANDING
-> CTA
-> DEMO / SIGNUP
-> CHECKOUT
-> SUBSCRIPTION_ACTIVE / CONTRACT_AUTHORITY
-> LICENSED PRODUCT
```

#1794 makes the commercial boundary explicit:

```text
AUTHENTICATED != LICENSED
ORGANIZATION_SHELL != LICENSED
ONBOARDING_STATE != LICENSED
```

Marketing reporting must never label a signup or organization shell as a paid customer.

---

## 2. Verified foundation

The repository already contains a privacy-first PostHog implementation with:

- explicit analytics consent;
- manual capture;
- `autocapture: false`;
- `capture_pageview: false`;
- session replay disabled by default;
- masking and DNT respect;
- sensitive-route protection;
- client/server capture helpers;
- sanitized event properties.

The connected PostHog EU project currently has:

```text
POSTHOG_ACTIONS=14
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
POSTHOG_INGESTED_EVENT=false
POSTHOG_RECENT_REAL_EVENTS=NONE_OBSERVED
POSTHOG_CONVERSION_GOALS=0
MARKETING_DASHBOARD=DEFER_UNTIL_REAL_DATA
```

The Action layer is provider configuration only. It is not evidence of traffic or conversion.

---

## 3. Canonical event contract

### Page intent

- `landing_view`
- `pricing_view`
- `feature_view`
- `trust_view`
- `resource_view`

### Engagement / demand capture

- `cta_clicked`
- `demo_started`
- `demo_submitted`
- `document_downloaded`
- `newsletter_subscribed`

### Existing lower funnel

- `user_signed_up`
- `checkout_started`
- `checkout_completed`
- `subscription_active`

Do not create aliases where an established canonical event exists.

All fourteen events now have reusable PostHog Actions prepared in the connected project. Runtime emitters for the public acquisition events are still missing.

---

## 4. Payment-first funnel semantics

Use these meanings consistently in analytics, dashboards and attribution:

```text
user_signed_up
= account created / qualified conversion
!= paid customer
!= licensed product authority

checkout_started
= commercial intent

checkout_completed
= checkout-flow conversion
!= standalone proof of licensed product authority

subscription_active
= strongest canonical self-service marketing signal of commercial activation
```

For contractual Enterprise/assisted motions, a valid signed-contract entitlement can establish product authority without a self-service `subscription_active` event.

Therefore Stripe/Supabase/commercial-authority state remains the commercial source of truth. PostHog is the behavioral and attribution layer, not the entitlement authority.

---

## 5. Current measurement gap

Live attribution remains blocked because:

- Production is bound to a different PostHog project key than the connected governed project;
- the binding fix is branch-only;
- public page-intent emitters are not live;
- CTA/demo/download/newsletter emitters are not live;
- bounded UTM/referrer/landing persistence is not live;
- lead records do not yet carry the complete attribution bridge;
- no real events have been observed in the connected project.

```text
MARKETING_ATTRIBUTION=NOT_LIVE
PAID_MEASUREMENT=NOT_READY
PAID_SCALE=BLOCKED
```

---

## 6. Allowed marketing properties

Recommended non-sensitive properties:

```text
locale
path
page_type
funnel_stage
cta_id
plan
utm_source
utm_medium
utm_campaign
utm_content
utm_term
referrer_domain
landing_path
attribution_model
schema_version
```

Do not send to PostHog:

- names or email addresses;
- company names;
- free-text demo messages;
- document names/content;
- risk descriptions;
- vendor names;
- addresses;
- tax/VAT/payment details;
- raw credentials, secrets or tokens.

The sanitizer remains fail-closed.

---

## 7. Attribution model

Persist two bounded contexts where technically and legally approved.

### First touch

- source / medium / campaign / content / term;
- landing path;
- referrer domain.

### Last touch

- source / medium / campaign / content / term;
- landing path;
- referrer domain.

Reporting rule:

```text
FIRST_TOUCH = demand creation
LAST_TOUCH = conversion assistance
SEARCH_CONSOLE = Google organic discovery truth
POSTHOG = consented behavior + attribution
STRIPE / SUPABASE / COMMERCIAL_AUTHORITY = billing/licensing truth
```

Do not calculate revenue truth from PostHog alone.

---

## 8. Demo funnel contract

`/book-demo` submits to `/api/leads`.

After release authority opens:

- emit `demo_started` after meaningful first interaction;
- emit `demo_submitted` only after successful API response;
- persist bounded UTM/referrer/landing context in the lead system;
- keep PII in the lead system, not PostHog;
- keep contact consent and analytics consent separate.

---

## 9. Public page capture

Automatic pageview capture remains intentionally disabled. Emit one explicit high-value event per meaningful route view:

```text
/{locale}                      -> landing_view
/{locale}/pricing              -> pricing_view
/{locale}/features/*           -> feature_view
/{locale}/trust*               -> trust_view
/{locale}/resources/*          -> resource_view
```

Avoid duplicate events on client navigation.

---

## 10. Conversion tiers

### Micro

- pricing/feature/trust/resource view;
- CTA click;
- resource download;
- newsletter subscription.

### Qualified

- demo submitted;
- user signed up;
- checkout started.

### Commercial

- checkout completed;
- subscription active;
- valid signed-contract authority in the commercial source of truth.

A commercial analytics signal is not itself authorization to enter paid product operations.

---

## 11. PostHog reporting design

Do **not** create `RISCK COMPLY — Marketing Acquisition OS` until real connected-project ingestion exists.

Once ingestion is proven, the dashboard should include:

1. Landing -> CTA -> Demo Submitted
2. Landing -> Signup -> Checkout -> Subscription Active
3. source/campaign breakdown
4. content-assisted qualified conversions
5. feature/trust/resource assisted conversion
6. locale acquisition
7. first-touch vs last-touch
8. demo submit rate
9. checkout completion rate
10. subscription-active rate separated from signup rate

---

## 12. Search Console boundary

Search Console remains the source of truth for Google query/impression/click data.

Required owner work remains:

- verify Domain Property `risckcomply.com` via DNS;
- submit canonical sitemap;
- inspect indexing/canonical selection;
- establish branded and non-branded baselines;
- reconcile Google clicks with privacy-safe onsite conversion data.

---

## 13. Paid gate

Do not scale paid until:

```text
PRODUCTION_GO=PASS
POSTHOG_APPROVED_PROJECT_BINDING=PASS
POSTHOG_REAL_INGESTION=PASS
PUBLIC_FUNNEL_EVENTS=PASS
DEMO_ATTRIBUTION=PASS
SIGNUP_ATTRIBUTION=PASS
CHECKOUT_ATTRIBUTION=PASS
SUBSCRIPTION_ATTRIBUTION=PASS_OR_COMMERCIAL_TRUTH_BRIDGE
CONSENT_BOUNDARY=PASS
SEARCH_CONSOLE=VERIFIED
PAID_CONVERSION_MEASUREMENT=VALIDATED
```

---

## 14. Future Mega PR B

Working title:

**[Marketing P0] Close acquisition routing, CRO truth and attribution foundation**

Scope:

1. reintegrate on a fresh branch based on current protected `main`;
2. preserve the prestaged governed PostHog binding remediation;
3. extend canonical analytics event map;
4. implement consent-gated public page-intent events;
5. instrument stable CTAs and demo start/submit;
6. implement first/last-touch attribution;
7. persist bounded attribution into leads;
8. connect signup/checkout/subscription reporting without weakening payment-first authority;
9. prove declined consent emits no marketing event;
10. prove no PII enters PostHog;
11. prove the Production bundle points to the approved connected PostHog project;
12. verify real connected-project ingestion;
13. create the Marketing Acquisition OS only after real events exist.

Because the current marketing branch is behind the protected release, **do not open it directly as the future Mega PR**. Reintegrate validated changes onto current main first.

---

## 15. Current acceptance state

```text
POSTHOG_PROJECT_EXISTS=PASS
POSTHOG_PROVIDER_ACTIONS=PASS_14_OF_14
POSTHOG_REAL_EVENT_INGESTION=FAIL_CURRENTLY
PRIVACY_FIRST_CLIENT_IMPLEMENTATION=PRESENT
PUBLIC_ACQUISITION_RUNTIME_EVENTS=MISSING
UTM_PERSISTENCE=MISSING
DEMO_ATTRIBUTION=MISSING
SIGNUP_ATTRIBUTION=MISSING
CHECKOUT_ATTRIBUTION=MISSING
SUBSCRIPTION_ATTRIBUTION=MISSING
PAYMENT_FIRST_ANALYTICS_SEMANTICS=DEFINED
MARKETING_DASHBOARD=DEFER_UNTIL_DATA
PAID_MEASUREMENT=BLOCKED
```
