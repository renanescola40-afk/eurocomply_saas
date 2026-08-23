# RISCK COMPLY — POSTHOG LIVE READINESS EVIDENCE V1

Status: ROOT_CAUSE_PROVEN / REMEDIATION_PRESTAGED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Marketing branch: `marketing/august-2026-authority-engine`

## 1. Executive verdict

The privacy-first PostHog foundation exists, but Production is currently compiled with a PostHog Project API Key that does **not** match the only PostHog project connected to this marketing control plane.

No key value is recorded in this artifact.

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
POSTHOG_ACTIONS=0
POSTHOG_CONVERSION_GOALS=0
POSTHOG_DASHBOARD=STARTER_ONLY
PUBLIC_ACQUISITION_EVENT_TAXONOMY=NOT_IMPLEMENTED
LIVE_ATTRIBUTION=NO
PAID_MEASUREMENT=BLOCKED
```

`NONE_OBSERVED` is an analytics evidence statement, not a statement that the product has no visitors or users.

---

## 2. Connected PostHog truth

Fresh connected project read confirms:

- one accessible project in the connected PostHog organization;
- project is not demo data;
- IP anonymization enabled;
- session recording disabled;
- snippet onboarding incomplete;
- `ingested_event=false`;
- marketing attribution window = 90 days;
- marketing attribution mode = `last_touch`;
- marketing conversion goals empty;
- customer analytics signup/subscription/payment mappings unset;
- Actions = 0;
- one starter dashboard with starter insights only.

No token/key value belongs in this document.

---

## 3. Current-main implementation truth

`src/lib/analytics/posthog-client.ts` already provides a strong baseline:

- consent storage key `risckcomply.analytics.consent`;
- analytics required unless explicitly configured otherwise;
- no client initialization when the public key is absent;
- EU PostHog hosts by default;
- `autocapture: false`;
- `capture_pageview: false`;
- session recording disabled by default;
- text/attribute masking;
- DNT respect;
- sensitive-route protection;
- sanitized event properties.

`AnalyticsConsentBanner` supports allow/decline. `PostHogAnalyticsProvider` is present and currently focuses its explicit page event on authenticated dashboard activity.

The existing canonical event catalog is primarily product/auth/onboarding/billing, including `user_signed_up`, `dashboard_opened`, `checkout_started`, `checkout_completed` and `subscription_active`.

---

## 4. Production runtime evidence

Current Production is READY on exact protected main.

A current-production bundle fetch proves:

- `PostHogAnalyticsProvider` is compiled;
- `AnalyticsConsentBanner` is compiled;
- PostHog EU asset and ingestion hosts are compiled/allowed;
- a non-empty public PostHog Project API Key is compiled into the browser bundle.

A private equality comparison between that compiled public key and the connected project's Project API Key returned:

```text
PRODUCTION_KEY == CONNECTED_PROJECT_KEY -> FALSE
```

The values were deliberately not printed or stored.

This explains why reading the connected project cannot prove current Production ingestion even though the application contains PostHog runtime code.

---

## 5. Root cause in deployment governance

Current protected `main` workflow `.github/workflows/vercel-production.yml` synchronizes critical provider bindings such as Supabase, Stripe, Resend and Sentry before the Production build.

Before this remediation was prestaged, it did **not** source or synchronize:

```text
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_ASSET_HOST
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT
```

Therefore an existing/stale Vercel Production PostHog key could survive independently of the protected GitHub Production environment and independently of the PostHog project being audited.

Root-cause classification:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
CODE_CLIENT_INITIALIZATION_DEFECT=NO_EVIDENCE
POSTHOG_SERVICE_OUTAGE=NO_EVIDENCE
CONNECTED_PROJECT_INGESTION=NO
```

---

## 6. Remediation prestaged on marketing branch

The marketing branch now contains a release-dependent implementation that does **not** touch `main` or open a PR.

### Workflow remediation

Protected Production deploy now prestages:

- `NEXT_PUBLIC_POSTHOG_KEY` from protected GitHub Production variables;
- fixed PostHog EU ingestion host;
- fixed PostHog EU asset host;
- explicit `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true`;
- fail-closed validation for missing Project API Key;
- fail-closed validation for consent-policy drift;
- fail-closed validation for PostHog region drift;
- synchronization of all four public analytics bindings into Vercel before Production build.

### Contract test

`tests/security/vercel-production-workflow-contract.test.ts` now prestages regression coverage proving:

- PostHog public key comes from the protected Production variable contract;
- EU hosts are locked;
- consent requirement is locked;
- all four bindings occur inside the protected synchronization boundary;
- Project API Key is treated as a public browser binding rather than a server secret.

### Environment contract

`.env.example` now prestages the same Production mapping and post-deploy verification rule.

Prestaged commits:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  workflow governance

e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  regression contract

f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
```

---

## 7. Required owner/provider binding before activation

The protected GitHub `production` environment must contain:

```text
NEXT_PUBLIC_POSTHOG_KEY=<Project API Key of the approved connected PostHog EU project>
```

Do not place the actual value in repository files, issues, comments or screenshots.

Once the release authority permits the marketing Mega PR and the workflow change is merged, the exact-SHA Production deploy will synchronize this approved value into Vercel before build.

---

## 8. Public acquisition instrumentation still missing

Fixing the project binding alone does not create acquisition attribution.

Future Mega PR B still needs:

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

Also implement bounded first/last-touch attribution and stable CTA IDs.

---

## 9. Required bounded properties

Approved design remains:

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

## 10. Production proof after activation

A real analytics PASS requires:

1. protected Production variable points to the approved connected PostHog EU project;
2. exact-SHA deploy synchronizes it into Vercel without printing the value;
3. current browser bundle fingerprint matches the approved connected project key;
4. consent-granted controlled visit emits expected acquisition event;
5. consent-declined controlled visit emits no client marketing event;
6. connected PostHog project observes the expected event;
7. no PII appears in payloads;
8. UTM context persists through approved funnel boundaries;
9. demo/signup/checkout attribution is proven;
10. only then create Actions/conversion goals and Marketing Acquisition OS reporting.

---

## 11. Engineering handoff

### MARKETING REQUIREMENT

Make qualified demand attributable to the **same governed PostHog project** that marketing and release evidence audits.

### ENGINEERING BRIEF

Preserve the prestaged deployment-governance fix inside future **CRO + ACQUISITION + ATTRIBUTION MEGA PR**, then implement public events, attribution persistence and Production proof.

### ACCEPTANCE CRITERIA

```text
POSTHOG_APPROVED_PROJECT_BINDING=PASS
POSTHOG_PRODUCTION_KEY_MATCH=PASS_WITHOUT_DISCLOSURE
POSTHOG_EU_HOST_POLICY=PASS
ANALYTICS_CONSENT_REQUIRED=PASS
CONSENT_GRANTED_CAPTURE=PASS
CONSENT_DECLINED_CAPTURE=PASS_NO_EVENT
PUBLIC_FUNNEL_EVENTS=PASS
UTM_FIRST_TOUCH=PASS
UTM_LAST_TOUCH=PASS
DEMO_ATTRIBUTION=PASS
SIGNUP_ATTRIBUTION=PASS
CHECKOUT_ATTRIBUTION=PASS
PII_IN_POSTHOG=NO
REAL_CONNECTED_POSTHOG_INGESTION=PASS
```

### EXPECTED BUSINESS IMPACT

`ONE GOVERNED ANALYTICS PROJECT -> TRUSTED ATTRIBUTION -> ATTRIBUTABLE PIPELINE -> CONTROLLED ACQUISITION LEARNING`

---

## 12. Truth boundary

```text
POSTHOG_FOUNDATION=READY
POSTHOG_RUNTIME_COMPONENTS=PROVEN_PRESENT
POSTHOG_PRODUCTION_PUBLIC_KEY=PRESENT
POSTHOG_PRODUCTION_KEY_MATCH=FAIL_CURRENTLY
POSTHOG_BINDING_DRIFT=ROOT_CAUSE_PROVEN
POSTHOG_BINDING_REMEDIATION=PRESTAGED_BRANCH_ONLY
POSTHOG_LIVE_INGESTION_CONNECTED_PROJECT=NO
POSTHOG_LIVE_ATTRIBUTION=NO
POSTHOG_CUSTOM_ACTIONS=0
PAID_SCALE=BLOCKED
RELEASE_PR_OPENED=NO
MAIN_CHANGED=NO
```
