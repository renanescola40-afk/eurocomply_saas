# RISCK COMPLY — MARKETING MEGA PR ACTIVATION PACK V1

Status: ZERO_CLICK_SCOPE_READY / STALE_BRANCH_MUST_NOT_OPEN_DIRECTLY / PR_OPEN_NOW=NO
Checked: 2026-08-23
Protected main: `29b40870b25e2d34a9eda921b820047b8020cfb6`
Current Enterprise rule: `DEFAULT_PR_ACTION=NO_NEW_PR`

## 1. Activation doctrine

When Enterprise release authority permits release-changing marketing work, execute two coherent Mega PRs instead of reopening discovery or creating small PRs.

Current branch topology is now part of the gate:

```text
MARKETING_BRANCH_STATUS=DIVERGED
MARKETING_BRANCH_AHEAD_BY=76
MARKETING_BRANCH_BEHIND_BY=51
MERGE_BASE=9c0801d46090f63b05fc0b7d8087e0e9313a525b
CURRENT_MAIN=29b40870b25e2d34a9eda921b820047b8020cfb6
```

Therefore:

```text
DO_NOT_OPEN_CURRENT_MARKETING_BRANCH_DIRECTLY
```

Activation sequence:

```text
GATE OPENS
-> REVALIDATE #1032 + CURRENT MAIN + RUNTIME
-> CUT FRESH INTEGRATION BRANCH FROM CURRENT MAIN
-> REAPPLY / CHERRY-PICK ONLY VALIDATED MARKETING CODE CHANGES
-> REVALIDATE PAYMENT-FIRST COMMERCIAL INVARIANTS
-> MEGA PR B: CRO + ACQUISITION + ATTRIBUTION
-> PROVE REAL CONNECTED-PROJECT MEASUREMENT
-> MEGA PR A: SEO AUTHORITY + BRAND ENTITY
-> PROVE PRODUCTION CANONICALIZATION / ENTITY / INDEXABILITY
```

Marketing documents can be copied/reconciled as needed, but stale application/workflow code must never override current release work.

---

# MEGA PR B — CRO + ACQUISITION + ATTRIBUTION

Suggested title:

**[Marketing P0] Close acquisition routing, CRO truth and attribution foundation**

## MARKETING REQUIREMENT

Every high-intent public journey must tell commercial truth, route by buyer intent, and produce privacy-safe source-to-conversion evidence in one governed analytics project without weakening payment-first access control.

## Payment-first invariant inherited from #1794

```text
AUTHENTICATED != LICENSED
ORGANIZATION_SHELL != LICENSED
ONBOARDING_STATE != LICENSED
LOCAL_SUBSCRIPTION_ROW != LICENSED
```

Marketing semantics:

```text
user_signed_up      = qualified/account conversion, NOT paid customer
checkout_started    = commercial intent
checkout_completed  = checkout-flow conversion, NOT standalone authorization
subscription_active = strongest self-service commercial activation signal
```

Valid signed-contract authority must also be respected for assisted/Enterprise motion.

No analytics event may grant product authority or substitute for canonical billing/entitlement checks.

## Prestaged code to re-integrate, not blindly merge

PostHog binding root cause is proven:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
```

Validated prestaged commits:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  PostHog workflow governance
e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  workflow regression contract
f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
```

These must be reapplied or cherry-picked onto a fresh current-main integration branch and revalidated against current `.github/workflows/vercel-production.yml` before PR creation.

## Provider-side PostHog layer already exists

The connected PostHog project already contains all fourteen canonical reusable Actions:

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

State:

```text
POSTHOG_PROVIDER_FUNNEL_ACTIONS=READY_14_OF_14
POSTHOG_REAL_CONNECTED_PROJECT_INGESTION=NO
POSTHOG_CONVERSION_GOALS=0
MARKETING_DASHBOARD=DEFER_UNTIL_REAL_DATA
```

Do not recreate duplicate Actions in the Mega PR.

## Required protected provider state

The protected Production environment must bind the approved connected PostHog EU Project API Key without exposing the value.

The governed contract must preserve:

```text
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_ASSET_HOST=https://eu-assets.i.posthog.com
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true
```

## Engineering scope

### Commercial truth / CRO

- remove the demo implication that a free trial is a commercial motion;
- align pricing/demo copy with current canonical pricing truth;
- revalidate Essential/Professional self-service and Business/Enterprise assisted motion on current main;
- use AI-governance-specific demo qualification;
- add bounded AI-system-count qualification;
- preserve lead API rate-limit/privacy/fail-closed boundaries.

### Intent routing

- eligible self-service buyer -> account/checkout activation path;
- Business/Enterprise buyer -> demo/sales path;
- trust/procurement intent -> assurance path;
- resource intent -> educational asset + contextual next step.

Do not force every visitor into demo.

### Measurement

- governed PostHog Production project binding;
- fixed EU hosts + explicit consent;
- public page-intent emitters;
- stable CTA IDs;
- CTA/demo/download/newsletter capture;
- first/last-touch UTM persistence;
- bounded lead attribution;
- signup/checkout/subscription attribution bridge;
- payment-first semantic separation;
- real connected-project ingestion proof;
- no marketing PII.

## Mega PR B acceptance criteria

```text
FRESH_BRANCH_BASE=CURRENT_PROTECTED_MAIN
STALE_BRANCH_DIRECT_MERGE=NO
PAYMENT_FIRST_INVARIANT_REGRESSION=0
SIGNUP_TREATED_AS_LICENSE=NO
ORG_SHELL_TREATED_AS_LICENSE=NO
DEMO_TRIAL_CONTRADICTION=0
DEMO_AI_GOVERNANCE_TAXONOMY=PASS
AI_SYSTEM_COUNT_QUALIFICATION=PASS
STABLE_CTA_IDS=PASS
INTENT_ROUTING=PASS
POSTHOG_PROVIDER_ACTIONS=14_EXISTING_NO_DUPLICATES
POSTHOG_APPROVED_PROJECT_BINDING=PASS
POSTHOG_PRODUCTION_KEY_MATCH=PASS_WITHOUT_DISCLOSURE
POSTHOG_EU_HOST_POLICY=PASS
ANALYTICS_CONSENT_REQUIRED=PASS
PUBLIC_FUNNEL_EVENTS=PASS
CONSENT_GRANTED_EVENT_FLOW=PASS
CONSENT_DECLINED_EVENT_FLOW=PASS_NO_EVENT
UTM_FIRST_TOUCH=PASS
UTM_LAST_TOUCH=PASS
DEMO_ATTRIBUTION=PASS
SIGNUP_ATTRIBUTION=PASS
CHECKOUT_ATTRIBUTION=PASS
SUBSCRIPTION_ATTRIBUTION=PASS_OR_COMMERCIAL_TRUTH_BRIDGE
POSTHOG_REAL_CONNECTED_PROJECT_INGESTION=PASS
PII_IN_POSTHOG=NO
BILLING_AUTHORITY_CHANGED=NO
```

Expected impact:

`TRUTHFUL PAYMENT-FIRST JOURNEY -> GOVERNED ANALYTICS -> ATTRIBUTABLE DEMAND -> ATTRIBUTABLE PIPELINE`

---

# MEGA PR A — SEO AUTHORITY + BRAND ENTITY

Suggested title:

**[Marketing P0] Publish search authority cluster and canonical RISCK COMPLY entity**

## Prestaged SEO-002 code to re-integrate

Validated commits:

```text
e25cd546cebf942655c6367b85aa1ecd6fb1d049  one HTML/sitemap hreflang authority
202f191680a6d2176bffea92687b33432b20c0b6  permanent fixed public aliases
4cdca44ab0173e79aad26bc755e0b51ff40a5be8  SEO regression contract
```

The current branch `next.config.ts` was explicitly rechecked against `main@29b40870...` and preserves the current configuration while adding the bounded locale-less public alias redirects. Nevertheless, because the overall branch is 51 commits behind, the future PR must still integrate from fresh current main rather than assume branch-wide compatibility.

## Scope

### Search authority

- Article 50 transparency guide;
- Provider vs Deployer guide;
- AI System Inventory guide;
- AI Governance Evidence guide;
- AI System Inventory resource landing.

### Entity normalization

- canonical name `RISCK COMPLY`;
- category `Operational AI Governance`;
- canonical URL `https://www.risckcomply.com`;
- normalize accidental public casing variants;
- review/remove non-canonical structured-data `alternateName` where not intentionally required;
- add `sameAs` only after official target profiles are owner-controlled and normalized;
- add verified social links only.

### International SEO

- explicit locale-prefixed URLs remain canonical;
- HTML metadata + sitemap remain single hreflang/x-default authority;
- `next-intl` automatic response alternate links remain disabled;
- fixed public locale-less aliases permanently converge to `/en/...`;
- auth/checkout/private locale negotiation remains unchanged;
- localized feature slugs must not be forced into English;
- Production 308/canonical/hreflang proof required;
- Search Console measures consolidation only after owner verification and recrawl.

## Mega PR A acceptance criteria

```text
FRESH_BRANCH_BASE=CURRENT_PROTECTED_MAIN
STALE_BRANCH_DIRECT_MERGE=NO
PAYMENT_FIRST_REGRESSION=0
FLAGSHIP_PUBLIC_SURFACES=READY
CANONICAL_BRAND_NAME=RISCK_COMPLY
ORGANIZATION_ENTITY=ONE_CANONICAL_IDENTITY
SAMEAS=VERIFIED_ONLY
FIXED_PUBLIC_LOCALELESS_ALIASES=308_TO_ENGLISH_CANONICAL
HREFLANG_AUTHORITY=ONE
NEXT_INTL_HTTP_ALTERNATE_LINKS=DISABLED
X_DEFAULT_CONFLICT=0
LOCALIZED_FEATURE_REDIRECT_REGRESSION=0
CANONICALS=PASS
HREFLANG=PASS
SITEMAP=PASS
ROBOTS_PRIVATE_BOUNDARY=PASS
UNSUPPORTED_LEGAL_CLAIMS=0
```

Expected impact:

`FEWER COMPETING URL/ENTITY SIGNALS -> CLEANER INTERNATIONAL AUTHORITY -> MORE QUALIFIED ORGANIC DEMAND`

---

## 4. Activation gate

Do not open either PR until current Enterprise authority is re-read.

```text
CONTROL_TOWER_REVALIDATED=YES
DEFAULT_PR_ACTION!=NO_NEW_PR
RELEASE_FREEZE_ALLOWS_MARKETING_CHANGE=YES
CURRENT_MAIN_SHA_REBOUND=YES
FRESH_INTEGRATION_BRANCH_FROM_CURRENT_MAIN=YES
CURRENT_RUNTIME_REVALIDATED=YES
APPROVED_POSTHOG_PROJECT_IDENTIFIED=YES
PROTECTED_POSTHOG_VARIABLE_READY=YES
```

Paid activation remains a separate, stricter gate.

---

## 5. No-op / stale-branch prevention

When activation becomes possible:

- do not open `marketing/august-2026-authority-engine` directly against current main;
- do not force-update current main from the marketing branch;
- do not blindly merge `.github/workflows`, `.env.example`, `next.config.ts`, auth, billing or security-adjacent files;
- cut a fresh integration branch from current protected main;
- selectively reapply validated marketing changes;
- run current payment-first and release gates;
- preserve existing 14 PostHog provider Actions rather than duplicating them;
- do not claim PostHog PASS until bundle/project match and ingestion are observed;
- do not claim SEO-002 Production PASS from Preview READY alone;
- do not add unverified `sameAs`;
- do not create issue spam.

---

## 6. Current state

```text
CURRENT_MAIN=29b40870b25e2d34a9eda921b820047b8020cfb6
MARKETING_BRANCH_AHEAD=76
MARKETING_BRANCH_BEHIND=51
MARKETING_BRANCH_STATUS=DIVERGED
MEGA_PR_B_SCOPE=READY
MEGA_PR_B_POSTHOG_GOVERNANCE_FIX=PRESTAGED_REINTEGRATION_REQUIRED
POSTHOG_PROVIDER_ACTIONS=READY_14_OF_14
MEGA_PR_A_SCOPE=READY
MEGA_PR_A_SEO_002_FIX=PRESTAGED_REINTEGRATION_REQUIRED
PR_OPEN_NOW=NO
RELEASE_PR_OPENED=NO
MAIN_CHANGED_BY_MARKETING=NO
PAID_SCALE=BLOCKED
```
