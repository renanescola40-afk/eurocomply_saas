# RISCK COMPLY — MARKETING CONTROL TOWER V1

Status: ACTIVE_MARKETING_AUTHORITY
Checked: 2026-08-23
Branch: `marketing/august-2026-authority-engine`

## 1. Release-aware state

```text
MARKETING_MODE=PRELAUNCH_CONTROLLED
CURRENT_PRODUCTION_SHA=29b40870b25e2d34a9eda921b820047b8020cfb6
LATEST_MAIN_MERGE=#1794_PAYMENT_FIRST_COMMERCIAL_ACCESS
OPEN_RELEASE_CHANGING_P0=#1801
FINAL_RELEASE_SHA=NOT_FROZEN_WHILE_P0_1801_OPEN
PRODUCTION_GO=NO_GO
DEFAULT_PR_ACTION=NO_NEW_PR
MAIN_CHANGED_BY_MARKETING=NO
PAID_SCALE=BLOCKED
```

The previous `RELEASE_FREEZE=STABLE` assumption is superseded by open P0 #1801 (`[P0] Fail closed on managed Auth schema drift in recovery restore`). Current Production remains READY on `29b40870...`, but the final release SHA is not frozen while #1801 remains open.

#1801 is mergeable and its current head is `f406713ccfde87ba60da77e99905c5923588414a`. A large majority of visible workflows are already green, including Public Claims Guard, Code Review, Dependency Review, EU AI Act Product Coverage, Qualified Review Assurance, secret scanning, Upload Security CI, Security CI, P0 Runtime Gap Report, Enterprise Evidence Tests, Safe Runtime Promotion, Readiness Scorecard, Supabase Forward Reconciliation Rehearsal/Dry Run, Gitleaks, Actionlint, Ephemeral Supabase smoke, CodeQL and Ephemeral Restore Smoke. At the latest read, DAST, Full Security Suite, Enterprise Production Gate, CI and Legacy Required Status Contexts were still `in_progress`.

Marketing must not bind external claims, final SEO release proof, legal/pentest acceptance, or production analytics evidence to a SHA that is not final.

---

## 2. Readiness scorecard

Internal preparation estimates only — not claims of traffic, authority, pipeline or revenue.

```text
MARKETING_READINESS=94
SEO_READINESS=91
CONTENT_ENGINE=93
BRAND_AUTHORITY=27
SOCIAL_ENGINE=84
CRO_READINESS=83
ANALYTICS_READINESS=64
PAID_READINESS=24
EUROPE_EXPANSION=84
SALES_ENABLEMENT_READINESS=97
MARKETING_OPERATIONS_READINESS=98
ABM_OUTBOUND_READINESS=98
PARTNER_ECOSYSTEM_READINESS=92

OVERALL_PREPARED=94
OVERALL_REMAINING=6
```

Score remains **94 / 6**. No increase is credited for provider definitions or documentation without live ingestion, attribution, Search Console proof, external brand normalization, buyer response or release activation.

---

## 3. Branch activation safety

Fresh compare against current protected main:

```text
MARKETING_BRANCH_STATUS=DIVERGED
MARKETING_BRANCH_AHEAD_BY=81
MARKETING_BRANCH_BEHIND_BY=51
MERGE_BASE=9c0801d46090f63b05fc0b7d8087e0e9313a525b
DO_NOT_OPEN_STALE_MARKETING_BRANCH_DIRECTLY
```

Activation rule after release authority opens:

1. determine the actual final protected `main` after #1801 and any succeeding release-changing P0;
2. cut a fresh integration branch from that exact SHA;
3. selectively reapply validated marketing code changes;
4. preserve payment-first, billing, recovery and security invariants from current main;
5. run the current release gates;
6. then open Mega PR B, followed by Mega PR A.

The current marketing branch is a staging/evidence source, not a safe direct merge vehicle.

---

## 4. Commercial truth

Current Production contains #1794 payment-first enforcement:

```text
AUTHENTICATED != LICENSED
ORGANIZATION_SHELL != LICENSED
ONBOARDING_STATE != LICENSED
LOCAL_SUBSCRIPTION_ROW != LICENSED
```

Analytics semantics:

```text
user_signed_up      = account / qualified conversion
checkout_started    = commercial intent
checkout_completed  = checkout-flow conversion
subscription_active = strongest self-service commercial activation signal
```

None of those analytics events independently grants product access. Billing/commercial authority remains canonical.

---

## 5. PostHog live truth

Connected project state:

```text
POSTHOG_PROJECT_CONNECTED=YES
POSTHOG_CONNECTED_PROJECT_COUNT=1
POSTHOG_PRIVACY_BASELINE=PRESENT
POSTHOG_PRODUCTION_KEY_MATCH=FAIL_CURRENTLY
POSTHOG_BINDING_DRIFT=ROOT_CAUSE_PROVEN
POSTHOG_BINDING_REMEDIATION=PRESTAGED_REINTEGRATION_REQUIRED
POSTHOG_ACTIONS=14
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
POSTHOG_CONVERSION_GOALS=0
PUBLIC_ACQUISITION_EVENT_RUNTIME=NOT_IMPLEMENTED
LIVE_ATTRIBUTION=NO
```

A fresh 30-day connected-project funnel query using the prepared Actions:

```text
landing_view -> cta_clicked -> demo_submitted -> subscription_active
```

returned:

```text
POSTHOG_30D_PREPARED_FUNNEL_RESULTS=[]
REAL_CONNECTED_PROJECT_FUNNEL_TRAFFIC_OBSERVED=NO
```

This is evidence about the connected PostHog project only; it is not a claim that RISCK COMPLY has no website visitors or users. It confirms that formal goals/dashboards should remain deferred until real ingestion exists.

Prepared provider Actions remain 14/14 and must not be duplicated during future implementation.

---

## 6. SEO / Brand state

```text
SEO_002_ROOT_CAUSE=PROVEN
SEO_002_ONE_HREFLANG_AUTHORITY_FIX=PRESTAGED
SEO_002_FIXED_ALIAS_308_FIX=PRESTAGED
SEO_002_REGRESSION_CONTRACT=PRESTAGED
SEO_002_PREVIEW=READY
SEO_002_PRODUCTION=NOT_LIVE
SEARCH_CONSOLE_VERIFIED=NO_EVIDENCE
LINKEDIN_NORMALIZED=NO
SAMEAS=ABSENT_CURRENT_RUNTIME
BRAND_AUTHORITY_LIVE=EARLY
```

SEO-002 must be reintegrated onto the eventual final-main base; Preview READY is not Production proof.

---

## 7. Demand / sales live state

Prepared:

```text
POSITIONING=READY
EUROPE_SEARCH_STRATEGY=READY
CONTENT_SYSTEM=READY
WEEKS_1_TO_4=READY
AI_INVENTORY_LEAD_MAGNET=READY
SALES_ENABLEMENT=READY
ABM_ENGINE=READY
ECOSYSTEM_PACKET=READY
COHORT_1_GMAIL_DRAFTS=5_OF_5
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
```

Live truth:

```text
COHORT_1_EMAILS_SENT=0_OF_5
COHORT_1_RESPONSES=0
CONFIRMED_BUYING_INTENT=0
CONFIRMED_OPPORTUNITIES=0
ECOSYSTEM_SUBMISSIONS_SENT=0
ECOSYSTEM_RESPONSES=0
PARTNERSHIPS_CONFIRMED=0
LIVE_POSTHOG_INGESTION=NO
LIVE_ATTRIBUTION=NO
LIVE_SEARCH_CONSOLE=NO_EVIDENCE
LIVE_SEO_002_PRODUCTION=NO
LIVE_REPEATABLE_PIPELINE=NOT_VERIFIED
LIVE_PAID_SCALE=NO
```

No automatic email send or external submission is authorized.

---

## 8. Mega PR activation order

### Mega PR B — CRO + Acquisition + Attribution

Start only from the eventual final current-main SHA. Preserve:

- payment-first invariants;
- PostHog governed binding remediation;
- 14 existing provider Actions without duplication;
- demo commercial truth;
- AI-governance qualification/system count;
- stable CTA IDs and intent routing;
- public event emitters;
- first/last-touch UTM persistence;
- lead/demo/signup/checkout/subscription attribution;
- consent/no-PII tests;
- real connected-project ingestion proof.

### Mega PR A — SEO Authority + Brand Entity

Start only from current-main-compatible code. Preserve/reapply:

- SEO-002 canonicalization/hreflang remediation;
- Article 50 / Provider-vs-Deployer / Inventory / Evidence cluster;
- lead-magnet landing;
- canonical entity normalization;
- verified-only `sameAs` and social links;
- sitemap/internal links;
- Production 308/canonical/hreflang proof.

```text
PR_OPEN_NOW=NO
DEFAULT_PR_ACTION=NO_NEW_PR
FINAL_RELEASE_SHA=NOT_FROZEN
```

---

## 9. Remaining 6%

```text
POSTHOG_GOVERNED_PRODUCTION_BINDING=NOT_LIVE
POSTHOG_REAL_INGESTION=NO
PUBLIC_ATTRIBUTION_RUNTIME=NO
SEARCH_CONSOLE=NO_EVIDENCE
LINKEDIN_NORMALIZED=NO
SEO_002_PRODUCTION=NO
COHORT_1_SENT=0_OF_5
BUYER_RESPONSES=0
OPPORTUNITIES=0
REPEATABLE_PIPELINE=NO
PAID_VALIDATION=NO
FINAL_RELEASE_SHA=NOT_FROZEN_DUE_P0_1801
```

---

## 10. Next transition rule

On every `continue`:

1. re-read #1032 **including its newest comments**, not only the issue body;
2. refresh current main, open release-changing PRs and final-SHA authority;
3. while any release-changing P0 keeps the final SHA unfrozen, do not activate marketing release work;
4. execute only genuinely new provider/runtime/external evidence;
5. do not create Week 5 or issue spam;
6. do not open the stale marketing branch;
7. when final release authority opens, cut fresh from final current main and activate Mega PR B;
8. after live measurement proof, activate Mega PR A;
9. do not increase live scores from definitions or docs alone.

---

## 11. Current verdict

```text
MARKETING_PREPARED=94%
MARKETING_REMAINING=6%
FINAL_RELEASE_SHA=NOT_FROZEN
OPEN_RELEASE_CHANGING_P0=#1801
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
POSTHOG_30D_PREPARED_FUNNEL_RESULTS=EMPTY
LIVE_POSTHOG_INGESTION=NO
LIVE_ATTRIBUTION=NO
LIVE_SEARCH_CONSOLE=NO_EVIDENCE
LIVE_SEO_002_PRODUCTION=NO
LINKEDIN_NORMALIZED=NO
LIVE_EMAIL_SENDS=0
LIVE_RESPONSES=0
LIVE_OPPORTUNITIES=0
LIVE_REPEATABLE_PIPELINE=NOT_VERIFIED
LIVE_PAID_SCALE=NO
MAIN_CHANGED_BY_MARKETING=NO
```
