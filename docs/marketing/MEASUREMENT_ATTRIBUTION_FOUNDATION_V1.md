# RISCK COMPLY — MEASUREMENT & ATTRIBUTION FOUNDATION V1

Status: READY_FOR_ENGINEERING_HANDOFF / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23

## 1. Objective

Make RISCK COMPLY acquisition measurable from first visit through CTA, demo, signup and checkout without weakening the existing privacy-first analytics boundary.

The operating chain is:

`SOURCE -> CAMPAIGN -> LANDING -> CTA -> DEMO/SIGNUP -> CHECKOUT -> CUSTOMER`

This document defines the marketing measurement contract. It does not authorize a release-changing merge while Enterprise exact-SHA evidence is frozen.

---

## 2. Verified current state

The repository already contains a privacy-first PostHog implementation with:

- explicit analytics consent;
- manual capture;
- `autocapture: false`;
- `capture_pageview: false`;
- session replay disabled by default;
- text and element masking;
- DNT respect;
- sensitive-route protection;
- client and server capture helpers;
- sanitized event properties.

The current production-oriented event catalog is primarily product/activation focused:

- `user_signed_up`
- `user_signed_in`
- `organization_created`
- `dashboard_opened`
- `document_uploaded`
- `risk_created`
- `vendor_created`
- `checkout_started`
- `checkout_completed`
- `subscription_active`
- `subscription_cancelled`
- onboarding and upgrade events

The connected PostHog project currently has **no ingested events** and no custom actions. Therefore live attribution is not yet proven.

The current PostHog documentation in the repository also contains stale Clerk references while the live analytics provider now emits a Supabase auth-provider marker. Treat the code as current authority and reconcile the documentation in the future analytics PR.

---

## 3. P0 measurement gap

The current analytics architecture is useful for product activation, but the public acquisition funnel is not attributable because:

- public page views are not manually captured;
- `capture_pageview` is intentionally disabled;
- no canonical public events exist for landing/pricing/features/trust;
- no canonical `cta_clicked` event exists;
- the demo form does not emit `demo_started` or `demo_submitted`;
- the lead record does not retain UTM/referrer/landing attribution;
- no live events currently reach the connected PostHog project;
- the default PostHog dashboard cannot represent a real funnel without actual events.

Result:

```text
MARKETING_ATTRIBUTION: NOT_LIVE
PAID_MEASUREMENT: NOT_READY
PAID_SCALE: BLOCKED
```

---

## 4. Canonical marketing event contract

Preserve existing product events. Add the following public/acquisition events rather than renaming the established product catalog.

### Page-intent events

- `landing_view`
- `pricing_view`
- `feature_view`
- `trust_view`
- `resource_view`

### Engagement events

- `cta_clicked`
- `demo_started`
- `demo_submitted`
- `document_downloaded`
- `newsletter_subscribed`

### Funnel events

Reuse existing events where they already exist:

- `user_signed_up`
- `checkout_started`
- `checkout_completed`
- `subscription_active`

Do not create aliases such as `signup_completed` if `user_signed_up` is already the canonical product event unless an explicit migration plan justifies it.

---

## 5. Allowed marketing properties

Recommended non-sensitive properties:

- `locale`
- `path`
- `page_type`
- `funnel_stage`
- `cta_id`
- `plan`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `referrer_domain`
- `landing_path`
- `attribution_model`
- `schema_version`

Do not send to PostHog:

- names;
- email addresses;
- company names;
- free-text demo messages;
- document names/content;
- risk descriptions;
- vendor names;
- addresses;
- tax/VAT identifiers;
- raw IP addresses;
- secrets or tokens.

The existing sanitizer should remain the fail-closed boundary. Adding a new property requires explicit review of the allowlist.

---

## 6. UTM governance

Canonical fields:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Naming rules:

- lowercase;
- snake_case for campaign/content names;
- no spaces;
- stable market/language identifiers;
- one naming standard across LinkedIn, Instagram, email and future paid media.

Examples:

```text
utm_source=linkedin
utm_medium=organic-social
utm_campaign=eu_ai_act_august_2026_en
utm_content=article50_carousel_01
```

```text
utm_source=linkedin
utm_medium=organic-social
utm_campaign=ai_inventory_en
utm_content=inventory_template_01
```

First-touch/last-touch persistence must respect the analytics consent model. Do not silently convert contact consent into analytics consent.

---

## 7. Attribution model

Store two attribution contexts when technically/legal-approved:

### First touch

- first source
- first medium
- first campaign
- first content
- first term
- first landing path
- first referrer domain

### Last touch

- last source
- last medium
- last campaign
- last content
- last term
- last landing path
- last referrer domain

Recommended reporting:

- first touch for demand creation;
- last touch for conversion assistance;
- Search Console as organic search source of truth;
- Stripe/Supabase as commercial outcome source of truth.

Do not infer ROI from PostHog alone when a verified billing/revenue source exists.

---

## 8. Demo funnel contract

Current `/book-demo` submits to `/api/leads` and stores the lead in Supabase and/or sends a webhook.

Required after the release freeze:

### Client

Capture `demo_started` only after meaningful first form interaction, not merely page load.

Capture `demo_submitted` only after the API returns a successful response.

Properties:

```text
locale
path
utm_source
utm_medium
utm_campaign
utm_content
utm_term
landing_path
schema_version
```

Never attach demo form PII to the analytics event.

### Lead persistence

Extend the sales lead attribution model with bounded non-sensitive fields such as:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `landing_path`
- `referrer_domain`

Keep PII in the lead system, not in PostHog.

Contact consent and analytics consent remain separate concepts.

---

## 9. Public page capture

Because automatic pageview capture is intentionally disabled, capture explicit high-value public page events from the marketing surface.

Suggested mapping:

```text
/{locale}                         -> landing_view
/{locale}/pricing                 -> pricing_view
/{locale}/features/*              -> feature_view
/{locale}/trust or trust pages    -> trust_view
/{locale}/resources/*             -> resource_view
```

Avoid firing duplicate events during client navigation. One canonical page-intent event per meaningful route view is sufficient.

---

## 10. Conversion definitions

### Micro conversions

- CTA click from regulatory/feature page
- pricing view
- AI inventory resource view
- resource download

### Qualified conversions

- demo submitted
- user signed up
- checkout started

### Commercial conversions

- checkout completed
- subscription active

Primary marketing reporting must separate micro activity from qualified/commercial outcomes.

---

## 11. PostHog reporting design

Do not build a production marketing dashboard until real events are ingested.

After ingestion is verified, create:

### `RISCK COMPLY — Marketing Acquisition OS`

Recommended views:

1. Landing -> CTA -> Demo
2. Landing -> Signup -> Checkout -> Subscription Active
3. Organic source/campaign breakdown
4. Content-assisted conversions
5. Feature page -> signup/demo conversion
6. Country/locale acquisition
7. First-touch vs last-touch source
8. Demo submit rate
9. Checkout completion rate

Default period: last 30 days once data volume is meaningful.

---

## 12. Search Console foundation

Search Console should remain the source of truth for organic Google discovery.

Required configuration:

- verify the canonical domain property for `risckcomply.com`;
- submit the canonical sitemap;
- confirm indexed pages and crawl errors;
- monitor branded and non-branded queries;
- segment by page, country and device;
- use URL inspection after major SEO launches;
- compare Search Console clicks with privacy-safe onsite conversion data.

Do not substitute PostHog for Search Console query/impression data.

---

## 13. Paid measurement readiness

Before Google Ads / remarketing:

```text
POSTHOG_INGESTION_VERIFIED = YES
PUBLIC_FUNNEL_EVENTS = YES
DEMO_ATTRIBUTION = YES
SIGNUP_ATTRIBUTION = YES
CHECKOUT_ATTRIBUTION = YES
CONSENT_BOUNDARY_VALIDATED = YES
SEARCH_CONSOLE_VERIFIED = YES
PAID_CONVERSION_TAGS_VALIDATED = YES
```

For EEA Google advertising, implement the current required consent signals and Consent Mode configuration before using ad personalization/remarketing or measurement that requires them.

Until then:

`PAID_SCALE: BLOCKED`

---

## 14. Engineering mega-PR after release freeze

Working title:

**[Marketing P0] Acquisition analytics + attribution foundation**

Scope:

1. extend canonical analytics event map;
2. extend sanitizer allowlist with bounded attribution properties;
3. add consent-gated public page-intent capture;
4. add CTA instrumentation;
5. add demo-start/demo-submit instrumentation;
6. persist bounded UTM attribution into sales leads;
7. connect signup and checkout to attribution context;
8. update stale PostHog documentation from Clerk to current auth reality;
9. add tests proving declined consent emits no client analytics;
10. add tests proving no PII enters PostHog payloads;
11. validate real EU PostHog ingestion in production after deployment;
12. create Marketing Acquisition OS only after events exist.

Expected impact:

`CONTENT -> ATTRIBUTABLE_LEADS -> ATTRIBUTABLE_PIPELINE`

---

## 15. Acceptance criteria

```text
POSTHOG_PROJECT_EXISTS: PASS
POSTHOG_REAL_EVENT_INGESTION: FAIL_CURRENTLY
PRIVACY_FIRST_CLIENT_IMPLEMENTATION: PRESENT
PUBLIC_ACQUISITION_EVENTS: MISSING
UTM_PERSISTENCE: MISSING
DEMO_ATTRIBUTION: MISSING
MARKETING_DASHBOARD: DEFER_UNTIL_DATA
PAID_MEASUREMENT: BLOCKED
```

Definition of done after implementation:

- allowed-consent test visit produces expected events;
- declined-consent test visit produces no client PostHog event;
- no PII appears in event properties;
- UTM values survive to demo/signup/checkout attribution where approved;
- successful demo submission can be attributed to source/campaign;
- successful checkout can be attributed to source/campaign;
- Search Console and onsite conversion reporting can be reconciled;
- paid conversion measurement is validated before budget scale.
