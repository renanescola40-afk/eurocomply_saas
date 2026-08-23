# RISCK COMPLY — POSTHOG LIVE READINESS EVIDENCE V1

Status: ROOT_CAUSE_PROVEN / PROVIDER_FUNNEL_ACTIONS_PREPARED / REMEDIATION_PRESTAGED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Marketing branch: `marketing/august-2026-authority-engine`

## 1. Executive verdict

The privacy-first PostHog foundation exists. The only PostHog project connected to this marketing control plane now also contains the canonical reusable acquisition/conversion Actions needed for future funnel reporting.

Production is still compiled with a PostHog Project API Key that does **not** match this connected project. No key value is recorded in this artifact.

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
POSTHOG_ACTIONS=8
POSTHOG_CONVERSION_GOALS=0
POSTHOG_MARKETING_DASHBOARD=DEFER_UNTIL_REAL_DATA
PUBLIC_ACQUISITION_EVENT_CONTRACT=PREPARED
PUBLIC_ACQUISITION_EVENT_RUNTIME=NOT_IMPLEMENTED
LIVE_ATTRIBUTION=NO
PAID_MEASUREMENT=BLOCKED
```

`NONE_OBSERVED` is an analytics evidence statement, not a statement that the product has no visitors or users.

---

## 2. Connected PostHog truth

Fresh connected-project reads confirm:

- one accessible, non-demo project;
- `ingested_event=false`;
- no actual project events observed in the recent event schema;
- Actions were initially `0` and now equal `8` after controlled provider-side preparation;
- no conversion goals were created;
- no Marketing Acquisition OS dashboard was created because real event ingestion is still absent.

No token or Project API Key belongs in this document.

---

## 3. Canonical provider-side acquisition Actions now prepared

The connected project now contains these reusable definitions:

| PostHog Action ID | Action | Canonical event | Reporting role |
|---:|---|---|---|
| `152611` | Marketing — CTA Click | `cta_clicked` | engagement |
| `152612` | Marketing — Demo Started | `demo_started` | qualified intent |
| `152613` | Marketing — Demo Submitted | `demo_submitted` | qualified conversion |
| `152614` | Marketing — User Signed Up | `user_signed_up` | qualified conversion |
| `152615` | Marketing — Checkout Started | `checkout_started` | commercial intent |
| `152616` | Marketing — Checkout Completed | `checkout_completed` | commercial conversion |
| `152617` | Marketing — Subscription Active | `subscription_active` | commercial conversion |
| `152618` | Marketing — Document Downloaded | `document_downloaded` | content conversion |

These Actions are definitions only. They do **not** assert that any corresponding event, lead, signup, payment, subscription, download or customer exists.

The action names intentionally reuse the canonical event contract rather than creating aliases such as `signup_completed`.

---

## 4. Current implementation truth

`src/lib/analytics/posthog-client.ts` already provides a privacy-first baseline:

- explicit analytics consent storage;
- no initialization when the public key is absent;
- EU PostHog hosts by default;
- `autocapture: false`;
- `capture_pageview: false`;
- session recording disabled by default;
- masking and DNT respect;
- sensitive-route protection;
- sanitized event properties.

The established product catalog includes lower-funnel events such as `user_signed_up`, `checkout_started`, `checkout_completed` and `subscription_active`.

Public acquisition events such as `cta_clicked`, `demo_started`, `demo_submitted` and `document_downloaded` are still a **contract**, not a live runtime implementation.

---

## 5. Production runtime and root cause

Current Production is READY on exact protected main. Runtime inspection previously proved PostHog components and a non-empty public Project API Key are compiled, but a private equality comparison returned:

```text
PRODUCTION_KEY == CONNECTED_PROJECT_KEY -> FALSE
```

The values were deliberately not printed or stored.

Root-cause classification remains:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
CODE_CLIENT_INITIALIZATION_DEFECT=NO_EVIDENCE
POSTHOG_SERVICE_OUTAGE=NO_EVIDENCE
CONNECTED_PROJECT_INGESTION=NO
```

---

## 6. Remediation prestaged on marketing branch

The marketing branch already contains the release-dependent binding remediation:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  workflow governance
e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  regression contract
f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
```

The protected deploy contract prestages:

- `NEXT_PUBLIC_POSTHOG_KEY` from the approved protected Production variable;
- fixed EU ingestion and asset hosts;
- explicit Production analytics-consent requirement;
- fail-closed validation of missing/drifted bindings;
- synchronization to Vercel before Production build.

The protected environment must ultimately bind the approved connected PostHog EU project. The actual value must never be stored in repository artifacts.

---

## 7. Runtime acquisition instrumentation still missing

Provider-side Actions do not create events. Future Mega PR B still must implement the public event emitters:

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
- bounded first/last-touch attribution;
- demo/signup/checkout attribution bridge;
- consent-granted capture proof;
- consent-declined no-event proof;
- no-PII regression tests.

---

## 8. Bounded property contract

Approved non-sensitive design remains:

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

Never send names, email, company name, free text, document content, risk descriptions, vendor names, addresses, tax/VAT/payment data, credentials, tokens or secrets to PostHog.

---

## 9. Production proof after release activation

A real analytics PASS requires:

1. protected Production binding points to the approved connected project;
2. exact-SHA deploy synchronizes it into Vercel without printing the value;
3. Production browser bundle matches the approved connected project;
4. public acquisition emitters are live;
5. consent-granted controlled visit emits expected events;
6. consent-declined controlled visit emits no client marketing event;
7. connected PostHog project observes the expected event;
8. no PII appears in payloads;
9. UTM context survives approved funnel boundaries;
10. demo/signup/checkout attribution is proven;
11. only after real data exists should Marketing Acquisition OS reporting and formal conversion goals be created.

---

## 10. Acceptance criteria

```text
POSTHOG_PROVIDER_ACTIONS=PASS_8_PREPARED
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
REAL_CONNECTED_POSTHOG_INGESTION=NO
MARKETING_DASHBOARD=DEFER_UNTIL_DATA
PII_IN_POSTHOG=NO_EVIDENCE_OF_LIVE_MARKETING_PAYLOADS
```

### Expected business impact

`PREBUILT REPORTING DEFINITIONS -> GOVERNED LIVE INGESTION -> TRUSTED ATTRIBUTION -> ATTRIBUTABLE PIPELINE`

---

## 11. Truth boundary

```text
POSTHOG_FOUNDATION=READY
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_8_OF_8
POSTHOG_RUNTIME_COMPONENTS=PROVEN_PRESENT
POSTHOG_PRODUCTION_PUBLIC_KEY=PRESENT
POSTHOG_PRODUCTION_KEY_MATCH=FAIL_CURRENTLY
POSTHOG_BINDING_DRIFT=ROOT_CAUSE_PROVEN
POSTHOG_BINDING_REMEDIATION=PRESTAGED_BRANCH_ONLY
POSTHOG_LIVE_INGESTION_CONNECTED_PROJECT=NO
POSTHOG_LIVE_ATTRIBUTION=NO
POSTHOG_CONVERSION_GOALS=0
POSTHOG_MARKETING_DASHBOARD=DEFERRED
PAID_SCALE=BLOCKED
RELEASE_PR_OPENED=NO
MAIN_CHANGED=NO
```
