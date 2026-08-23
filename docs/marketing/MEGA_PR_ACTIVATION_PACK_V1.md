# RISCK COMPLY — MARKETING MEGA PR ACTIVATION PACK V1

Status: ZERO_CLICK_ACTIVATION_READY / PR_OPEN_NOW=NO
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Current Enterprise rule: `DEFAULT_PR_ACTION=NO_NEW_PR`

## 1. Mission

When the Enterprise release authority permits release-changing marketing work, execute two coherent packages instead of reopening discovery or creating small PRs.

```text
GATE OPENS
   -> REVALIDATE CURRENT MAIN + RUNTIME
   -> MEGA PR B: CRO + ACQUISITION + ATTRIBUTION
   -> PROVE MEASUREMENT
   -> MEGA PR A: SEO AUTHORITY + BRAND ENTITY
   -> REVALIDATE INDEXABILITY / ENTITY / CONVERSION
```

The order prioritizes truthful conversion and measurement before larger-scale distribution. If release authority explicitly prefers a single combined marketing PR and engineering risk remains bounded, both packages may be consolidated without weakening acceptance criteria.

---

# MEGA PR B — CRO + ACQUISITION + ATTRIBUTION

Suggested title:

**[Marketing P0] Close acquisition routing, CRO truth and attribution foundation**

## MARKETING REQUIREMENT

Every high-intent public journey must tell commercial truth, route by buyer intent and produce privacy-safe source-to-conversion evidence.

## ENGINEERING BRIEF

### Commercial truth / demo

- remove the current demo implication that a free trial is a commercial motion;
- align demo wording with canonical pricing truth;
- preserve Essential/Professional self-service and Business/Enterprise assisted/demo motion;
- replace generic GRC demo driver choices with AI-governance-specific intent;
- add bounded AI-system-count qualification;
- preserve existing lead API validation/rate-limit/privacy boundaries.

Recommended English agenda line:

`5 min — commercial fit: self-service checkout, Business-assisted motion or Enterprise review`

### Intent routing

Stable high-intent surfaces should route to the most appropriate action:

- self-service eligible buyer -> signup/checkout path;
- Business/Enterprise intent -> demo/sales path;
- trust/procurement intent -> Trust / Enterprise assurance path;
- educational/resource intent -> resource with contextual next step.

Do not force every user into demo.

### Measurement

Implement the contract in `POSTHOG_LIVE_READINESS_EVIDENCE_V1.md` and `MEASUREMENT_ATTRIBUTION_FOUNDATION_V1.md`:

- public page-intent events;
- stable CTA IDs;
- CTA capture;
- demo start/submit capture;
- first/last-touch UTM persistence;
- bounded lead attribution;
- signup/checkout attribution bridge;
- Production PostHog binding/ingestion proof;
- no marketing PII in PostHog.

## ACCEPTANCE CRITERIA

```text
DEMO_TRIAL_CONTRADICTION=0
DEMO_AI_GOVERNANCE_TAXONOMY=PASS
AI_SYSTEM_COUNT_QUALIFICATION=PASS
STABLE_CTA_IDS=PASS
INTENT_ROUTING=PASS
PUBLIC_FUNNEL_EVENTS=PASS
CONSENT_GRANTED_EVENT_FLOW=PASS
CONSENT_DECLINED_EVENT_FLOW=PASS_NO_EVENT
UTM_FIRST_TOUCH=PASS
UTM_LAST_TOUCH=PASS
DEMO_ATTRIBUTION=PASS
SIGNUP_ATTRIBUTION=PASS
CHECKOUT_ATTRIBUTION=PASS
POSTHOG_REAL_INGESTION=PASS
PII_IN_POSTHOG=NO
BILLING_AUTHORITY_CHANGED=NO
```

## TEST

- pricing/demo truth-contract tests;
- six-locale render tests;
- lead payload schema tests;
- rate-limit/fail-closed regression;
- analytics sanitizer tests;
- analytics consent tests;
- duplicate-event tests;
- source/campaign persistence tests;
- controlled Production browser proof;
- connected PostHog verification after deployment;
- public demo/signup/checkout smoke without synthetic LIVE billing claims.

## EXPECTED BUSINESS IMPACT

- less commercial confusion;
- higher trust at high-intent conversion points;
- attributable organic/outbound demand;
- a credible measurement layer before paid acquisition.

---

# MEGA PR A — SEO AUTHORITY + BRAND ENTITY

Suggested title:

**[Marketing P0] Publish search authority cluster and canonical RISCK COMPLY entity**

## MARKETING REQUIREMENT

Own the RISCK COMPLY entity and high-intent Operational AI Governance search surface with evidence-bound content and one canonical brand identity.

## ENGINEERING BRIEF

### Search authority pages

Implement the already-specified flagship cluster:

- `/en/guides/eu-ai-act-article-50-transparency`
- `/en/guides/eu-ai-act-provider-vs-deployer`
- `/en/guides/how-to-build-ai-system-inventory`
- `/en/guides/ai-governance-evidence`
- `/en/resources/ai-system-inventory-template`

Use official regulatory sources for time-sensitive legal/regulatory facts and maintain the product's non-legal-advice boundary.

### Entity normalization

- canonical product name: `RISCK COMPLY`;
- canonical category: `Operational AI Governance`;
- canonical URL: `https://www.risckcomply.com`;
- normalize accidental user-visible brand casing variants;
- normalize image alt/wordmark labels where appropriate;
- review current structured-data `alternateName` values that reinforce non-canonical casing;
- keep one canonical Organization/WebSite/SoftwareApplication entity graph;
- add `sameAs` only after the target profile is verified, owner-controlled and normalized;
- add only verified official social links to footer/entity surfaces.

### SEO infrastructure

- preserve canonical URLs;
- preserve correct locale alternates/hreflang;
- include new public resources in sitemap;
- connect internal links between regulatory -> inventory -> evidence -> product intent;
- preserve robots/private-route protections;
- add regression coverage against accidental product-name variants.

## ACCEPTANCE CRITERIA

```text
FLAGSHIP_GUIDES=5_PUBLIC_SURFACES_READY
CANONICAL_BRAND_NAME=RISCK_COMPLY
ACCIDENTAL_PUBLIC_BRAND_VARIANTS=0_OR_DOCUMENTED_INTENTIONAL
ORGANIZATION_ENTITY=ONE_CANONICAL_IDENTITY
NONCANONICAL_ALTERNATENAME_REVIEWED=YES
SAMEAS=VERIFIED_ONLY
FOOTER_SOCIAL_LINKS=VERIFIED_ONLY
CANONICALS=PASS
HREFLANG=PASS
SITEMAP=PASS
ROBOTS_PRIVATE_BOUNDARY=PASS
UNSUPPORTED_LEGAL_CLAIMS=0
```

## TEST

- build/type/lint/security normal release gates;
- grep/regression test for public product-name variants;
- render all new pages in required locale strategy;
- canonical/hreflang checks;
- sitemap/robots checks;
- JSON-LD validation;
- internal-link crawl;
- Production HTTP/indexability smoke;
- Search Console URL Inspection after owner property verification.

## EXPECTED BUSINESS IMPACT

- stronger branded entity disambiguation;
- higher topical authority around operational AI governance;
- more qualified high-intent organic entry points;
- stronger bridge from regulatory research to product evaluation.

---

## 4. Activation gate

Do not open either PR until the current Enterprise authority is re-read.

Minimum activation state:

```text
CONTROL_TOWER_REVALIDATED=YES
DEFAULT_PR_ACTION!=NO_NEW_PR
RELEASE_FREEZE_ALLOWS_MARKETING_CHANGE=YES
CURRENT_MAIN_SHA_REBOUND=YES
CURRENT_RUNTIME_REVALIDATED=YES
```

Paid scale has a separate and stricter gate and is **not** automatically enabled when these PRs merge.

---

## 5. Paid activation remains separate

```text
PRODUCTION_GO=PASS
LEGAL_PUBLICATION_STATE=SUITABLE_FOR_CAMPAIGN_CLAIMS
STRIPE_LIVE_LIFECYCLE=ACCEPTED
POSTHOG_PRODUCTION_INGESTION=VERIFIED
ATTRIBUTION=VERIFIED
CONSENT=VERIFIED
SEARCH_CONSOLE=VERIFIED
LANDING_PRICING_DEMO_TRUTH=REVALIDATED
INITIAL_ICP_WEDGE_SIGNAL=OBSERVED
```

Only after this should paid high-intent tests begin at bounded spend.

---

## 6. No-op prevention

When activation becomes possible:

- do not write a new strategy document first;
- do not split either package into cosmetic PRs;
- do not create issue spam;
- do not carry stale current-main assumptions forward;
- do not claim Search Console/PostHog/market PASS from implementation alone;
- do not add `sameAs` to unverified profiles;
- do not publish unsupported legal, certification, customer or ROI claims.

---

## 7. Current state

```text
MEGA_PR_B_SCOPE=READY
MEGA_PR_A_SCOPE=READY
MEGA_PR_SEQUENCE=READY
RELEASE_ACTIVATION_GATE=READY
PR_OPEN_NOW=NO
RELEASE_PR_OPENED=NO
MAIN_CHANGED_BY_MARKETING=NO
PAID_SCALE=BLOCKED
```
