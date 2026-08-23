# RISCK COMPLY — MARKETING MEGA PR ACTIVATION PACK V1

Status: ZERO_CLICK_ACTIVATION_READY / PR_OPEN_NOW=NO
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Current Enterprise rule: `DEFAULT_PR_ACTION=NO_NEW_PR`

## 1. Mission

When Enterprise release authority permits release-changing marketing work, execute two coherent packages instead of reopening discovery or creating small PRs.

```text
GATE OPENS
   -> REVALIDATE CURRENT MAIN + RUNTIME
   -> CONFIRM APPROVED POSTHOG PRODUCTION PROJECT BINDING
   -> MEGA PR B: CRO + ACQUISITION + ATTRIBUTION
   -> PROVE REAL CONNECTED-PROJECT MEASUREMENT
   -> MEGA PR A: SEO AUTHORITY + BRAND ENTITY
   -> PROVE PERMANENT LOCALE CANONICALIZATION + ONE HREFLANG AUTHORITY
   -> REVALIDATE INDEXABILITY / ENTITY / CONVERSION
```

The order prioritizes truthful conversion and measurement before larger-scale distribution.

---

# MEGA PR B — CRO + ACQUISITION + ATTRIBUTION

Suggested title:

**[Marketing P0] Close acquisition routing, CRO truth and attribution foundation**

## MARKETING REQUIREMENT

Every high-intent public journey must tell commercial truth, route by buyer intent and produce privacy-safe source-to-conversion evidence in one governed analytics project.

## PRESTAGED IMPLEMENTATION ALREADY ON MARKETING BRANCH

A current Production runtime investigation proved that the browser is compiled with a PostHog Project API Key that does not match the only connected PostHog project being audited.

No key values are recorded.

Root cause:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
```

Current protected main deploy does not synchronize the PostHog project key/hosts/consent policy into Vercel. The marketing branch already contains a fail-closed remediation:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  workflow governance
e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  workflow regression contract
f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  environment mapping
8a48a893d30c8683542a894e325c1aeae8a5da1b  root-cause evidence
```

When this Mega PR is activated, preserve this implementation rather than rediscovering/rebuilding it.

### Required protected-provider state before Production activation

The protected GitHub `production` environment must contain:

```text
NEXT_PUBLIC_POSTHOG_KEY=<approved connected PostHog EU Project API Key>
```

Never place the value in source, issues, PR comments, screenshots or logs.

The prestaged deploy contract also locks:

```text
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_ASSET_HOST=https://eu-assets.i.posthog.com
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true
```

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

- self-service eligible buyer -> signup/checkout path;
- Business/Enterprise intent -> demo/sales path;
- trust/procurement intent -> Trust / Enterprise assurance path;
- educational/resource intent -> resource with contextual next step.

Do not force every user into demo.

### Measurement

Implement/preserve the contracts in `POSTHOG_LIVE_READINESS_EVIDENCE_V1.md` and `MEASUREMENT_ATTRIBUTION_FOUNDATION_V1.md`:

- governed PostHog Production project binding;
- fixed EU PostHog hosts;
- explicit Production consent requirement;
- public page-intent events;
- stable CTA IDs;
- CTA capture;
- demo start/submit capture;
- first/last-touch UTM persistence;
- bounded lead attribution;
- signup/checkout attribution bridge;
- Production bundle-to-project match proof;
- real connected-project ingestion proof;
- no marketing PII in PostHog.

## ACCEPTANCE CRITERIA

```text
DEMO_TRIAL_CONTRADICTION=0
DEMO_AI_GOVERNANCE_TAXONOMY=PASS
AI_SYSTEM_COUNT_QUALIFICATION=PASS
STABLE_CTA_IDS=PASS
INTENT_ROUTING=PASS
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
POSTHOG_REAL_CONNECTED_PROJECT_INGESTION=PASS
PII_IN_POSTHOG=NO
BILLING_AUTHORITY_CHANGED=NO
```

## TEST

- protected workflow contract tests;
- pricing/demo truth-contract tests;
- six-locale render tests;
- lead payload schema tests;
- rate-limit/fail-closed regression;
- analytics sanitizer tests;
- analytics consent tests;
- duplicate-event tests;
- source/campaign persistence tests;
- controlled Production browser proof;
- bundle fingerprint/project-key equality check without printing key;
- connected PostHog verification after deployment;
- public demo/signup/checkout smoke without synthetic LIVE billing claims.

## EXPECTED BUSINESS IMPACT

`TRUTHFUL JOURNEY -> ONE GOVERNED ANALYTICS PROJECT -> ATTRIBUTABLE DEMAND -> ATTRIBUTABLE PIPELINE`

---

# MEGA PR A — SEO AUTHORITY + BRAND ENTITY

Suggested title:

**[Marketing P0] Publish search authority cluster and canonical RISCK COMPLY entity**

## MARKETING REQUIREMENT

Own the RISCK COMPLY entity and high-intent Operational AI Governance search surface with evidence-bound content, one canonical brand identity, and one unambiguous international-SEO canonical/hreflang authority.

## PRESTAGED IMPLEMENTATION ALREADY ON MARKETING BRANCH

Fresh search/runtime investigation proved that fixed public locale-less aliases remain visible in search while the application intends explicit locale-prefixed canonical URLs. It also proved competing hreflang authorities: HTML metadata + sitemap already express canonical locale alternates while `next-intl` emitted its own HTTP alternate Link header with a competing x-default path.

Canonical evidence: `INTERNATIONAL_SEO_CANONICALIZATION_EVIDENCE_V1.md`.

Preserve these already-prestaged commits:

```text
e25cd546cebf942655c6367b85aa1ecd6fb1d049  make HTML metadata + sitemap the hreflang authority
202f191680a6d2176bffea92687b33432b20c0b6  permanently canonicalize fixed locale-less public aliases
4cdca44ab0173e79aad26bc755e0b51ff40a5be8  lock international SEO regression contract
705e23afa8a94356e462bb632465220ecd9d987b  canonical SEO-002 evidence
```

The runtime commit `202f191...` has a Vercel Preview deployment in `READY` state. Direct preview 308 observation is still uncredited because the preview is protected by Vercel SSO in the available connector.

### International SEO remediation contract

- explicit locale-prefixed URLs remain canonical (`/en`, `/pt`, `/es`, `/fr`, `/it`, `/de`);
- HTML metadata + sitemap remain the single hreflang/x-default authority;
- `next-intl` automatic response alternate links stay disabled;
- fixed-slug public locale-less aliases permanently converge on `/en/...` before middleware;
- auth/checkout/private route locale negotiation remains unchanged;
- generic `/features/* -> /en/features/*` redirect remains forbidden because feature slugs are localized;
- Production must prove actual 308 behavior after activation;
- Search Console canonical/index consolidation is measured only after owner verification and recrawl.

## ENGINEERING BRIEF

### Search authority pages

Implement the already-specified flagship cluster:

- `/en/guides/eu-ai-act-article-50-transparency`
- `/en/guides/eu-ai-act-provider-vs-deployer`
- `/en/guides/how-to-build-ai-system-inventory`
- `/en/guides/ai-governance-evidence`
- `/en/resources/ai-system-inventory-template`

Use official regulatory sources for time-sensitive legal/regulatory facts and maintain the non-legal-advice boundary.

### Entity normalization

- canonical product name: `RISCK COMPLY`;
- canonical category: `Operational AI Governance`;
- canonical URL: `https://www.risckcomply.com`;
- normalize accidental user-visible brand casing variants;
- normalize image alt/wordmark labels where appropriate;
- review/remove structured-data `alternateName` values reinforcing non-canonical casing unless deliberately justified;
- keep one canonical Organization/WebSite/SoftwareApplication entity graph;
- add `sameAs` only after target profile is verified, owner-controlled and normalized;
- add only verified official social links.

### SEO infrastructure

- preserve self-referential canonical URLs on locale-prefixed public pages;
- preserve the prestaged fixed alias permanent-redirect contract;
- preserve one hreflang/x-default authority;
- include new public resources in sitemap;
- connect regulatory -> inventory -> evidence -> product intent internal links;
- preserve robots/private-route protections;
- add regression coverage against accidental product-name variants;
- preserve regression coverage against unsafe localized-feature redirect behavior.

## ACCEPTANCE CRITERIA

```text
FLAGSHIP_GUIDES=5_PUBLIC_SURFACES_READY
CANONICAL_BRAND_NAME=RISCK_COMPLY
ACCIDENTAL_PUBLIC_BRAND_VARIANTS=0_OR_DOCUMENTED_INTENTIONAL
ORGANIZATION_ENTITY=ONE_CANONICAL_IDENTITY
NONCANONICAL_ALTERNATENAME_REVIEWED=YES
SAMEAS=VERIFIED_ONLY
FOOTER_SOCIAL_LINKS=VERIFIED_ONLY
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

## TEST

- international SEO regression contract;
- full production build/type/lint/security normal gates;
- Production HTTP smoke for `/trust`, `/dpa`, `/data-processing`, `/pricing`, `/book-demo` -> 308 `/en/...`;
- locale-prefixed 200/self-canonical smoke;
- HTML canonical/hreflang extraction;
- absence of competing `next-intl` alternate Link header;
- sitemap/robots checks;
- JSON-LD validation;
- internal-link crawl;
- Search Console canonical/indexing follow-up after owner property verification.

## EXPECTED BUSINESS IMPACT

`FEWER COMPETING URL/ENTITY SIGNALS -> CLEANER INTERNATIONAL CANONICAL CONSOLIDATION -> STRONGER SEARCH AUTHORITY -> MORE QUALIFIED ORGANIC DEMAND`

---

## 4. Activation gate

Do not open either PR until current Enterprise authority is re-read.

Minimum activation state:

```text
CONTROL_TOWER_REVALIDATED=YES
DEFAULT_PR_ACTION!=NO_NEW_PR
RELEASE_FREEZE_ALLOWS_MARKETING_CHANGE=YES
CURRENT_MAIN_SHA_REBOUND=YES
CURRENT_RUNTIME_REVALIDATED=YES
APPROVED_POSTHOG_PROJECT_IDENTIFIED=YES
PROTECTED_POSTHOG_VARIABLE_READY=YES
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
- do not rebuild either already-prestaged PostHog or SEO-002 remediation from scratch;
- do not split either package into cosmetic PRs;
- do not create issue spam;
- do not carry stale current-main assumptions forward;
- do not claim PostHog PASS until Production bundle and connected project match and ingestion is observed;
- do not claim SEO-002 Production PASS from Preview READY alone;
- do not add `sameAs` to unverified profiles;
- do not publish unsupported legal, certification, customer or ROI claims.

---

## 7. Current state

```text
MEGA_PR_B_SCOPE=READY
MEGA_PR_B_POSTHOG_GOVERNANCE_FIX=PRESTAGED_BRANCH_ONLY
MEGA_PR_A_SCOPE=READY
MEGA_PR_A_SEO_002_CANONICALIZATION_FIX=PRESTAGED_BRANCH_ONLY
MEGA_PR_A_SEO_002_RUNTIME_PREVIEW=READY
MEGA_PR_SEQUENCE=READY
RELEASE_ACTIVATION_GATE=READY
PR_OPEN_NOW=NO
RELEASE_PR_OPENED=NO
MAIN_CHANGED_BY_MARKETING=NO
PAID_SCALE=BLOCKED
```
