# RISCK COMPLY — POSTHOG LIVE READINESS EVIDENCE V1

Status: LIVE_STATE_CHARACTERIZED / IMPLEMENTATION_STAGED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Marketing branch: `marketing/august-2026-authority-engine`

## 1. Executive verdict

The PostHog foundation exists and the application contains a privacy-first client boundary, but acquisition measurement is **not live**.

```text
POSTHOG_PROJECT_CONNECTED=YES
POSTHOG_PRIVACY_BASELINE=PRESENT
POSTHOG_PRODUCTION_COMPONENTS_PRESENT=YES
POSTHOG_CSP_EU_HOSTS=PASS
POSTHOG_INGESTED_EVENT=false
POSTHOG_RECENT_EVENTS=NONE_OBSERVED
POSTHOG_ACTIONS=0
POSTHOG_CONVERSION_GOALS=0
POSTHOG_DASHBOARD=STARTER_ONLY
PUBLIC_ACQUISITION_EVENT_TAXONOMY=NOT_IMPLEMENTED
POSTHOG_PUBLIC_KEY_BINDING=NOT_PROVEN_BY_THIS_EVIDENCE
LIVE_ATTRIBUTION=NO
PAID_MEASUREMENT=BLOCKED
```

`NONE_OBSERVED` is an analytics evidence statement, not a statement that the product has no users.

---

## 2. Connected PostHog truth

Fresh connected project read confirms:

- project exists and is not demo data;
- IP anonymization is enabled;
- session recording is disabled;
- snippet onboarding is incomplete;
- `ingested_event=false`;
- marketing attribution window is 90 days;
- configured marketing attribution mode is `last_touch`;
- marketing conversion goals are empty;
- customer analytics signup/subscription/payment event mappings are unset.

Fresh event-schema read shows no event seen in the last 30 days, including `$pageview`.

Fresh action read: `ACTIONS=0`.

Fresh reporting read:

- one dashboard exists: the default starter dashboard;
- eight saved insights exist and are default starter insights created with the project;
- these starter objects receive no conversion/readiness credit because no real event ingestion exists.

No token, secret or customer data belongs in this evidence file.

---

## 3. Current-main implementation truth

### Consent and client initialization

`src/lib/analytics/posthog-client.ts` currently:

- uses `risckcomply.analytics.consent`;
- requires consent unless explicitly configured otherwise;
- does not initialize when the public key is absent;
- uses EU PostHog hosts by default;
- sets `autocapture: false`;
- sets `capture_pageview: false`;
- disables session recording by default;
- masks text and element attributes;
- respects Do Not Track;
- protects sensitive application paths;
- sanitizes analytics properties before capture.

### Consent UX

`AnalyticsConsentBanner` presents allow/decline choices when no decision exists; decline opts out; allow stores consent and initializes PostHog.

### Provider

`PostHogAnalyticsProvider` is present and initializes on path changes, but its explicit page-level event is currently focused on authenticated dashboard activity (`dashboard_opened`).

### Event catalog

The canonical event map is mainly product/activation/billing oriented, including `user_signed_up`, `user_signed_in`, `organization_created`, `dashboard_opened`, `document_uploaded`, `risk_created`, `vendor_created`, `checkout_started`, `checkout_completed`, `subscription_active` and `subscription_cancelled`.

It does not yet define the public acquisition events needed to attribute marketing demand.

---

## 4. Production runtime evidence

The exact current Production deployment is READY on the protected main SHA.

A fresh fetch of `https://www.risckcomply.com/en` confirms that the production client bundle includes `PostHogAnalyticsProvider` and `AnalyticsConsentBanner`. Current production CSP allows the intended EU PostHog asset and ingestion hosts.

This proves the client components and network policy are deployable in the current runtime. It does **not** prove the public PostHog key is bound, consent has been granted by a visitor, an event has been delivered, attribution is persisted or conversion reporting works.

---

## 5. Root measurement gap

```text
DISCOVERY
  -> PUBLIC PAGE INTENT
  -> CTA
  -> DEMO / LEAD / SIGNUP
  -> CHECKOUT
  -> ACTIVE CUSTOMER
```

Current product events cover parts of the lower funnel. Missing pieces are mainly the public/top-of-funnel bridge and attribution persistence.

### Missing public events

After release authority permits implementation:

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

Reuse existing lower-funnel events instead of creating aliases: `user_signed_up`, `checkout_started`, `checkout_completed`, `subscription_active`.

---

## 6. Required bounded properties

Proposed non-sensitive marketing properties:

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

The existing sanitizer must remain fail-closed and its allowlist must be deliberately extended for approved properties.

Never send full name, email, company name, message/free text, document names/content, risk descriptions, vendor names, address/tax/VAT/payment data, credentials, tokens or secrets to PostHog.

Lead PII remains in the lead system. Billing truth remains in Stripe/Supabase. Search query/impression truth remains in Search Console.

---

## 7. Attribution contract

When implemented and approved, preserve bounded first-touch and last-touch source / medium / campaign / content / term plus landing path and referrer domain.

Contact consent and analytics consent must remain separate.

The project currently has a 90-day `last_touch` marketing configuration, but that setting alone creates no attribution evidence without real events and persisted campaign context.

---

## 8. Production proof required after implementation

Definition of real measurement PASS:

1. controlled browser visit with analytics consent granted emits expected public events;
2. controlled visit with analytics consent declined emits no client marketing event;
3. no PII appears in event payloads;
4. UTM context persists through the approved funnel boundary;
5. successful demo submission can be tied to source/campaign without copying lead PII into PostHog;
6. signup and checkout preserve attribution context where approved;
7. expected events appear in the connected EU PostHog project;
8. only then create conversion Actions/goals and the Marketing Acquisition OS dashboard;
9. compare Search Console organic clicks with privacy-safe onsite outcomes when Search Console is live;
10. paid conversion measurement stays blocked until the full gate passes.

---

## 9. Engineering handoff

### MARKETING REQUIREMENT

Make qualified demand attributable from first public interaction to commercial outcome without weakening consent/privacy boundaries.

### ENGINEERING BRIEF

Fold the full implementation into the future **CRO + ACQUISITION + ATTRIBUTION MEGA PR**: public event taxonomy, sanitizer extensions, consent-gated page-intent events, stable CTA IDs/capture, demo start/submit, first/last-touch UTM persistence, lead attribution persistence, signup/checkout attribution bridge, Production PostHog binding/ingestion proof, conversion definitions after ingestion, and consent/PII tests.

### ACCEPTANCE CRITERIA

```text
POSTHOG_PRODUCTION_KEY_BINDING=PROVEN_WITHOUT_SECRET_DISCLOSURE
CONSENT_GRANTED_CAPTURE=PASS
CONSENT_DECLINED_CAPTURE=PASS_NO_EVENT
PUBLIC_FUNNEL_EVENTS=PASS
UTM_FIRST_TOUCH=PASS
UTM_LAST_TOUCH=PASS
DEMO_ATTRIBUTION=PASS
SIGNUP_ATTRIBUTION=PASS
CHECKOUT_ATTRIBUTION=PASS
PII_IN_POSTHOG=NO
REAL_POSTHOG_INGESTION=PASS
```

### TEST

Unit sanitizer/allowlist tests; consent-state tests; duplicate page-event prevention; six-locale route tests; demo success/failure instrumentation; controlled Production browser proof; connected PostHog read after the proof event.

### EXPECTED BUSINESS IMPACT

`CONTENT -> ATTRIBUTABLE LEADS -> ATTRIBUTABLE PIPELINE -> CONTROLLED ACQUISITION LEARNING`

---

## 10. Truth boundary

```text
POSTHOG_FOUNDATION=READY
POSTHOG_RUNTIME_COMPONENTS=PROVEN_PRESENT
POSTHOG_PRIVACY_DESIGN=STRONG_BASELINE
POSTHOG_LIVE_INGESTION=NO
POSTHOG_LIVE_ATTRIBUTION=NO
POSTHOG_REAL_MARKETING_DASHBOARD=NO
POSTHOG_CUSTOM_ACTIONS=0
PAID_SCALE=BLOCKED
RELEASE_PR_OPENED=NO
MAIN_CHANGED=NO
```
