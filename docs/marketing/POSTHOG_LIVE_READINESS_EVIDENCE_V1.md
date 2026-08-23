# RISCK COMPLY — POSTHOG LIVE READINESS EVIDENCE V1

Status: ROOT_CAUSE_PROVEN / PROVIDER_FUNNEL_ACTIONS_READY_14_OF_14 / REMEDIATION_PRESTAGED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Protected main: `29b40870b25e2d34a9eda921b820047b8020cfb6`
Marketing branch: `marketing/august-2026-authority-engine`

## 1. Executive verdict

RISCK COMPLY has a privacy-first PostHog foundation and the connected PostHog EU project now contains the complete reusable provider-side Action layer for the canonical acquisition funnel.

Production is still compiled with a PostHog Project API Key that does **not** match the only connected project audited by this marketing control plane. The values were compared privately and are never recorded here.

```text
POSTHOG_PROJECT_CONNECTED=YES
POSTHOG_CONNECTED_PROJECT_COUNT=1
POSTHOG_PRIVACY_BASELINE=PRESENT
POSTHOG_PRODUCTION_COMPONENTS_PRESENT=YES
POSTHOG_CSP_EU_HOSTS=PASS
POSTHOG_PRODUCTION_PUBLIC_KEY_PRESENT=YES
POSTHOG_PRODUCTION_KEY_MATCHES_CONNECTED_PROJECT=NO
POSTHOG_BINDING_DRIFT=PROVEN
POSTHOG_INGESTED_EVENT_CONNECTED_PROJECT=false
POSTHOG_RECENT_EVENTS_CONNECTED_PROJECT=NONE_OBSERVED
POSTHOG_ACTIONS=14
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
POSTHOG_CONVERSION_GOALS=0
POSTHOG_MARKETING_DASHBOARD=DEFER_UNTIL_REAL_DATA
PUBLIC_ACQUISITION_EVENT_CONTRACT=PREPARED
PUBLIC_ACQUISITION_EVENT_RUNTIME=NOT_IMPLEMENTED
LIVE_ATTRIBUTION=NO
PAID_MEASUREMENT=BLOCKED
```

`NONE_OBSERVED` describes connected-project evidence only. It is not a claim that RISCK COMPLY has no visitors or users.

---

## 2. Payment-first commercial truth

Current protected `main` includes #1794, which enforces:

```text
AUTHENTICATED != LICENSED
ORGANIZATION_SHELL != LICENSED
ONBOARDING_STATE != LICENSED
LOCAL_SUBSCRIPTION_ROW != LICENSED
```

Paid product authority requires durable commercial authority from a processed Stripe LIVE subscription or an active signed-contract entitlement source with a valid applied snapshot.

Marketing analytics therefore treats funnel states as follows:

```text
user_signed_up      = account / qualified conversion, NOT paid customer
checkout_started    = commercial intent
checkout_completed  = checkout-flow conversion, NOT standalone product authority
subscription_active = strongest canonical self-service commercial activation signal
```

The billing/commercial authority layer remains the source of truth for whether paid product access is actually licensed.

---

## 3. Connected PostHog project truth

Fresh provider reads confirm:

- one accessible non-demo project;
- `ingested_event=false`;
- no actual recent project events observed;
- Actions = `14`;
- formal conversion goals = `0`;
- Marketing Acquisition OS dashboard intentionally not created before real event ingestion.

No API token or Project API Key belongs in this document.

---

## 4. Canonical provider-side Actions

### Page-intent

| ID | Action | Event |
|---:|---|---|
| `152619` | Marketing — Landing View | `landing_view` |
| `152620` | Marketing — Pricing View | `pricing_view` |
| `152621` | Marketing — Feature View | `feature_view` |
| `152622` | Marketing — Trust View | `trust_view` |
| `152623` | Marketing — Resource View | `resource_view` |

### Engagement / demand capture

| ID | Action | Event |
|---:|---|---|
| `152611` | Marketing — CTA Click | `cta_clicked` |
| `152612` | Marketing — Demo Started | `demo_started` |
| `152613` | Marketing — Demo Submitted | `demo_submitted` |
| `152618` | Marketing — Document Downloaded | `document_downloaded` |
| `152624` | Marketing — Newsletter Subscribed | `newsletter_subscribed` |

### Lower-funnel / commercial

| ID | Action | Event |
|---:|---|---|
| `152614` | Marketing — User Signed Up | `user_signed_up` |
| `152615` | Marketing — Checkout Started | `checkout_started` |
| `152616` | Marketing — Checkout Completed | `checkout_completed` |
| `152617` | Marketing — Subscription Active | `subscription_active` |

These Actions are definitions only. They do **not** assert that any corresponding event, lead, signup, checkout, subscription, customer or download exists.

The provider-side Action taxonomy is now complete. Runtime emitters are not.

---

## 5. Privacy-first implementation truth

`src/lib/analytics/posthog-client.ts` already provides the intended baseline:

- explicit analytics consent storage;
- no client initialization when the public key is absent;
- EU PostHog hosts by default;
- `autocapture: false`;
- `capture_pageview: false`;
- session recording disabled by default;
- masking and DNT respect;
- sensitive-route protection;
- sanitized event properties.

The public acquisition events remain a runtime implementation contract for future Mega PR B.

---

## 6. Binding root cause

Runtime inspection previously proved a non-empty public PostHog key is compiled into Production. A private equality comparison returned:

```text
PRODUCTION_KEY == CONNECTED_PROJECT_KEY -> FALSE
```

Root cause:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
CODE_CLIENT_INITIALIZATION_DEFECT=NO_EVIDENCE
POSTHOG_SERVICE_OUTAGE=NO_EVIDENCE
CONNECTED_PROJECT_INGESTION=NO
```

Protected deploy on the predecessor release did not govern the PostHog Project API Key, EU hosts and analytics-consent policy through the same protected environment contract as other providers.

---

## 7. Prestaged remediation

The marketing branch contains a release-dependent fail-closed remediation:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  workflow governance
e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  regression contract
f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
```

It prestages governance for:

```text
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_ASSET_HOST=https://eu-assets.i.posthog.com
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true
```

The actual approved key must live only in the protected provider/environment configuration and must never be copied into repository artifacts.

Because the marketing branch is currently diverged from protected `main`, these commits must be **reintegrated onto a fresh current-main base** when release authority opens. Do not open the stale branch directly.

---

## 8. Runtime work still required

Future Mega PR B must implement the emitters and attribution bridge for:

```text
landing_view
pricing_view
feature_view
trust_view
resource_view
cta_clicked
demo_started
demo_submitted
document_downloaded
newsletter_subscribed
```

Reuse existing lower-funnel events:

```text
user_signed_up
checkout_started
checkout_completed
subscription_active
```

Also required:

- stable CTA IDs;
- bounded first-touch and last-touch attribution;
- lead/demo/signup/checkout attribution bridge;
- payment-first commercial semantics;
- consent-granted capture proof;
- consent-declined no-event proof;
- no-PII regression tests.

---

## 9. Allowed property contract

Approved non-sensitive properties remain:

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

Never send names, emails, company names, free text, document content, risk descriptions, vendor names, addresses, tax/VAT/payment data, credentials, tokens or secrets to PostHog.

---

## 10. Production proof after activation

Analytics PASS requires all of the following:

1. protected Production binding points to the approved connected PostHog EU project;
2. exact-SHA deploy synchronizes it into Vercel without printing the value;
3. Production browser bundle matches the approved connected project;
4. public acquisition emitters are live;
5. consent-granted controlled visit emits expected events;
6. consent-declined controlled visit emits no client marketing event;
7. connected project observes expected events;
8. no PII appears in payloads;
9. UTM context survives approved funnel boundaries;
10. signup remains distinct from paid/licensed authority;
11. demo/signup/checkout/subscription attribution is proven;
12. only then create Marketing Acquisition OS reporting and formal conversion-goal configuration.

---

## 11. Acceptance state

```text
POSTHOG_PROVIDER_ACTIONS=PASS_14_PREPARED
POSTHOG_APPROVED_PROJECT_BINDING=NOT_LIVE
POSTHOG_PRODUCTION_KEY_MATCH=FAIL_CURRENTLY
POSTHOG_EU_HOST_POLICY=PASS_CODE
ANALYTICS_CONSENT_REQUIRED=PASS_CODE
PUBLIC_FUNNEL_EVENTS=NOT_LIVE
UTM_FIRST_TOUCH=NOT_LIVE
UTM_LAST_TOUCH=NOT_LIVE
DEMO_ATTRIBUTION=NOT_LIVE
SIGNUP_ATTRIBUTION=NOT_LIVE
CHECKOUT_ATTRIBUTION=NOT_LIVE
SUBSCRIPTION_ATTRIBUTION=NOT_LIVE
REAL_CONNECTED_POSTHOG_INGESTION=NO
MARKETING_DASHBOARD=DEFER_UNTIL_DATA
PAID_SCALE=BLOCKED
RELEASE_PR_OPENED=NO
MAIN_CHANGED=NO
```

Expected business impact:

`PREBUILT PROVIDER FUNNEL -> GOVERNED LIVE INGESTION -> TRUSTED ATTRIBUTION -> ATTRIBUTABLE PIPELINE`
