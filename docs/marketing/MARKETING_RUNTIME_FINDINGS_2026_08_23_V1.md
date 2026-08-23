# RISCK COMPLY — MARKETING RUNTIME FINDINGS — 2026-08-23 V1

Status: FINDINGS_PROVEN_AND_ROUTED / CURRENT_MAIN_AWARE / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Current protected main: `29b40870b25e2d34a9eda921b820047b8020cfb6`
Release freeze: `STABLE`

## Purpose

Consolidate only attributable CRO, SEO, brand, measurement and activation-safety findings that belong in owner actions or the two future Marketing Mega PRs.

This is not a task dump.

---

# COMMERCIAL-001 — Payment-first is now canonical product truth

Severity: P0 commercial semantics
Status: `MERGED_CURRENT_MAIN / MUST_PRESERVE`

#1794 established:

```text
AUTHENTICATED != LICENSED
ORGANIZATION_SHELL != LICENSED
ONBOARDING_STATE != LICENSED
LOCAL_SUBSCRIPTION_ROW != LICENSED
```

Marketing/analytics consequences:

```text
user_signed_up      = account / qualified conversion, NOT paid customer
checkout_started    = commercial intent
checkout_completed  = checkout-flow conversion, NOT standalone product authority
subscription_active = strongest self-service commercial activation signal
```

Valid signed-contract authority also remains a legitimate Enterprise/assisted licensing source.

Route: every future CRO/analytics change must preserve canonical billing/entitlement authority and must never grant product access from analytics state.

---

# CRO-001 — Demo implies a trial that canonical pricing denies

Severity: P0 marketing truth
Status: `PROVEN / REVALIDATE_ON_CURRENT_MAIN_BEFORE_FIX`

Previously proven demo wording included:

`pricing motion: trial, Business pilot or Enterprise review`

Canonical pricing truth states no free trial is offered.

Route: future **CRO + Acquisition + Attribution Mega PR** after fresh current-main revalidation.

Acceptance:

```text
DEMO_FREE_TRIAL_IMPLICATION=0
PAYMENT_FIRST_REGRESSION=0
BILLING_AUTHORITY_CHANGED=NO
```

---

# BRAND-001 — LinkedIn entity mismatch

Severity: P0 brand authority
Status: `PROVEN_EXTERNAL / OWNER_ACTION`

Public LinkedIn previously exposed non-canonical product naming/tagline/category/About variants.

Route: owner normalization to:

```text
NAME=RISCK COMPLY
TAGLINE=Operational AI Governance for European Teams
```

No repository PR can perform the LinkedIn owner action.

---

# BRAND-002 — Owned entity graph reinforces non-canonical casing

Severity: P1 entity SEO
Status: `PROVEN_RUNTIME / RELEASE_CHANGE_STAGED`

Production entity graph already uses canonical `name = RISCK COMPLY` but also emitted:

```text
alternateName=Risck Comply
sameAs=ABSENT
```

Route: future **SEO Authority + Brand Entity Mega PR**. Add `sameAs` only after target profiles are verified, owner-controlled and normalized.

---

# SEO-001 — Search Console ownership/measurement not evidenced

Severity: P0 measurement readiness
Status: `OWNER_ACTION / NOT_A_CODE_DEFECT`

```text
SITEMAP_CODE=PASS
ROBOTS_CODE=PASS
PUBLIC_DISCOVERY=PARTIAL_PASS
SEARCH_CONSOLE_VERIFIED=NO_EVIDENCE
SEARCH_CONSOLE_INDEXING_BASELINE=NO_EVIDENCE
SEARCH_CONSOLE_QUERY_BASELINE=NO_DATA
```

Route: `SEARCH_CONSOLE_OWNER_EXECUTION_HANDOFF_V2.md`.

Never place DNS verification tokens in repository artifacts.

---

# SEO-002 — Locale-less aliases + competing hreflang authority

Severity: P0/P1 international SEO
Status: `ROOT_CAUSE_PROVEN / REMEDIATION_PRESTAGED / PREVIEW_READY / REINTEGRATION_REQUIRED`

Proven before-fix state:

```text
EXPLICIT_LOCALE_ARCHITECTURE=PRESENT
LOCALELESS_PUBLIC_REDIRECT=TEMPORARY_DYNAMIC
SEARCH_LOCALELESS_ALIASES=OBSERVED
HTML_HREFLANG=PRESENT
SITEMAP_HREFLANG=PRESENT
NEXT_INTL_HTTP_HREFLANG=COMPETING
X_DEFAULT_AUTHORITY=CONFLICTING
```

Validated prestaged commits:

```text
e25cd546cebf942655c6367b85aa1ecd6fb1d049  one hreflang authority
202f191680a6d2176bffea92687b33432b20c0b6  permanent fixed public alias canonicalization
4cdca44ab0173e79aad26bc755e0b51ff40a5be8  international SEO regression contract
```

Vercel Preview reached `READY`. Direct preview 308 remains uncredited due SSO protection.

Current-main compatibility note: `next.config.ts` on the marketing branch was explicitly compared with current `main@29b40870...`; it retains current main configuration plus the bounded locale-less public alias redirects. The overall branch is still stale and must not be opened directly.

Route: reintegrate onto a fresh current-main branch inside future Mega PR A.

---

# ANALYTICS-001 — PostHog Production binding drift

Severity: P0 acquisition measurement
Status: `ROOT_CAUSE_PROVEN / REMEDIATION_PRESTAGED / REINTEGRATION_REQUIRED`

Connected-project truth:

```text
POSTHOG_PROJECT_CONNECTED=YES
POSTHOG_CONNECTED_PROJECT_COUNT=1
INGESTED_EVENT=false
RECENT_REAL_EVENTS=NONE_OBSERVED
POSTHOG_ACTIONS=14
POSTHOG_CONVERSION_GOALS=0
MARKETING_DASHBOARD=DEFER_UNTIL_REAL_DATA
```

Production runtime previously proved:

```text
POSTHOG_RUNTIME=PRESENT
CONSENT_UI=PRESENT
EU_HOSTS=PRESENT
PRODUCTION_PUBLIC_KEY=PRESENT
PRODUCTION_KEY == CONNECTED_PROJECT_KEY -> FALSE
```

No key values were printed or stored.

Root cause:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
CODE_CLIENT_INITIALIZATION_DEFECT=NO_EVIDENCE
POSTHOG_SERVICE_OUTAGE=NO_EVIDENCE
```

Prestaged remediation:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  Production binding governance
e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  regression contract
f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
```

Route: selectively reintegrate on fresh current main inside Mega PR B.

---

# ANALYTICS-002 — Provider funnel definitions are complete; runtime attribution is not

Severity: P0/P1 measurement readiness
Status: `PROVIDER_READY_14_OF_14 / RUNTIME_MISSING`

The connected PostHog project now contains canonical Actions for:

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
user_signed_up
checkout_started
checkout_completed
subscription_active
```

These are definitions only. They do not prove any traffic, lead, signup, payment, subscription or customer.

Still missing:

```text
PUBLIC_EVENT_EMITTERS
STABLE_CTA_IDS
FIRST_TOUCH_UTM
LAST_TOUCH_UTM
LEAD_ATTRIBUTION
DEMO_ATTRIBUTION
SIGNUP_ATTRIBUTION
CHECKOUT_ATTRIBUTION
SUBSCRIPTION_ATTRIBUTION
REAL_CONNECTED_PROJECT_INGESTION
```

Route: Mega PR B.

---

# ACTIVATION-001 — Marketing branch is materially diverged from current main

Severity: P0 merge/release safety
Status: `PROVEN / ACTIVATION_RULE_CHANGED`

Fresh compare:

```text
CURRENT_MAIN=29b40870b25e2d34a9eda921b820047b8020cfb6
MARKETING_BRANCH_STATUS=DIVERGED
AHEAD_BY=76
BEHIND_BY=51
MERGE_BASE=9c0801d46090f63b05fc0b7d8087e0e9313a525b
```

Therefore:

```text
DO_NOT_OPEN_MARKETING_BRANCH_DIRECTLY
DO_NOT_FORCE_BRANCH_ONTO_MAIN
```

When release authority opens:

1. create a fresh integration branch from current protected main;
2. selectively reapply/cherry-pick validated marketing code changes;
3. preserve payment-first, billing, security and release engineering changes;
4. run current gates;
5. only then open Mega PR B/A.

This finding prevents a future marketing PR from silently reverting release work.

---

## Mega PR packing

### Mega PR B — CRO + Acquisition + Attribution

Pack:

- COMMERCIAL-001 preservation;
- CRO-001;
- ANALYTICS-001 binding remediation;
- ANALYTICS-002 runtime instrumentation;
- payment-first attribution semantics;
- privacy/consent/no-PII tests;
- real connected-project ingestion proof.

### Mega PR A — SEO Authority + Brand Entity

Pack:

- BRAND-002;
- SEO-002;
- flagship search authority cluster;
- lead-magnet public landing;
- canonical entity normalization;
- verified-only socials/sameAs;
- sitemap/internal linking;
- Production canonical/hreflang proof.

Both must respect ACTIVATION-001.

---

## Current finding state

```text
COMMERCIAL_001_PAYMENT_FIRST=MERGED_MUST_PRESERVE
CRO_001_DEMO_TRIAL_MISMATCH=PROVEN_REVALIDATE_CURRENT_MAIN
BRAND_001_LINKEDIN_MISMATCH=PROVEN_OWNER_ACTION
BRAND_002_STRUCTURED_ENTITY_VARIANT=PROVEN_RUNTIME
SEO_001_SEARCH_CONSOLE=OWNER_ACTION_NOT_CODE_DEFECT
SEO_002_ROOT_CAUSE=PROVEN
SEO_002_REMEDIATION=PRESTAGED_REINTEGRATION_REQUIRED
SEO_002_RUNTIME_PREVIEW=READY
ANALYTICS_001_POSTHOG_BINDING_DRIFT=ROOT_CAUSE_PROVEN
ANALYTICS_001_BINDING_REMEDIATION=PRESTAGED_REINTEGRATION_REQUIRED
ANALYTICS_002_PROVIDER_ACTIONS=READY_14_OF_14
ANALYTICS_002_LIVE_INGESTION=NO
ANALYTICS_002_LIVE_ATTRIBUTION=NO
ACTIVATION_001_BRANCH_DIVERGENCE=PROVEN
MARKETING_BRANCH_DIRECT_PR=FORBIDDEN
NEW_RELEASE_PR_OPENED=NO
NEW_MARKETING_ISSUE_CREATED=NO
MAIN_CHANGED_BY_MARKETING=NO
```
