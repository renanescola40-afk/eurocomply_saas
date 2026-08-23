# RISCK COMPLY — MARKETING RUNTIME FINDINGS — 2026-08-23 V1

Status: FINDINGS_PROVEN_AND_ROUTED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Current protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Release freeze: `STABLE`

## Purpose

Consolidate only attributable marketing/CRO/SEO/measurement findings that deserve owner action or inclusion in a future high-density Mega PR.

This file is not a task dump. Related findings are deliberately packed into two future Mega PRs.

---

# CRO-001 — Demo implies a trial that pricing truth explicitly denies

Severity: P0 marketing truth / P1 release engineering priority depending release gate
Status: `PROVEN`

## Evidence

Current main `src/app/[locale]/book-demo/page.tsx` contains:

`5 min — pricing motion: trial, Business pilot or Enterprise review`

Canonical `src/lib/i18n/pricing-commercial-truth.ts` states in all six locales that no free trial is currently offered. English truth:

`No free trial is currently offered. Essential and Professional use self-serve monthly checkout. Business and Enterprise start with assisted sales or a demo.`

## Route

Future CRO + Acquisition + Attribution Mega PR.

Recommended line:

`5 min — commercial fit: self-service checkout, Business-assisted motion or Enterprise review`

Also replace generic GRC demo drivers with the approved AI-governance taxonomy and add AI-system-count qualification in the same package.

## Acceptance

- no public demo copy offers/implies a free trial;
- Essential/Professional remain self-service monthly checkout;
- Business/Enterprise remain assisted/demo motions;
- six locales preserve the same commercial truth;
- billing entitlement authority does not change.

---

# BRAND-001 — LinkedIn entity mismatch

Severity: P0 brand authority
Status: `PROVEN_EXTERNAL / OWNER_ACTION`

Current public LinkedIn still exposes non-canonical name/tagline/category/About variants.

Route: `BRAND_SERP_AUTHORITY_CLOSURE_PACKET_V2.md`.

No repository PR can change LinkedIn.

---

# BRAND-002 — Owned/indexed entity signals still reinforce non-canonical casing

Severity: P1 brand/entity SEO
Status: `PROVEN_RUNTIME_AND_EXTERNAL / RELEASE_CHANGE_STAGED`

## Fresh runtime evidence

A current-production fetch of `https://www.risckcomply.com/en` shows the canonical entity graph already exists and uses:

- Organization `name = RISCK COMPLY`;
- WebSite `name = RISCK COMPLY`;
- SoftwareApplication `name = RISCK COMPLY`.

However, all three currently also emit:

`alternateName = Risck Comply`

The same production graph currently has no `sameAs`.

This is now stronger evidence than search-result casing alone: the owned structured-data source itself is intentionally reinforcing a non-canonical casing variant.

Search discovery also exposes some owned surfaces with non-canonical casing.

## Route

Future SEO Authority + Brand Entity Mega PR:

- normalize unintended user-visible product references;
- review/remove non-canonical `alternateName` where it weakens one-entity consistency;
- preserve one canonical Organization/WebSite/SoftwareApplication graph;
- add `sameAs` only after official profile ownership and normalization are verified;
- add only verified official social links;
- preserve stable URLs/slugs unless a redirect/migration is justified.

## Acceptance

```text
CANONICAL_ENTITY_NAME=RISCK_COMPLY
NONCANONICAL_ALTERNATENAME_REVIEWED=YES
UNINTENDED_PUBLIC_BRAND_VARIANTS=0_OR_DOCUMENTED_INTENTIONAL
SAMEAS=VERIFIED_ONLY
```

---

# SEO-001 — Search Console ownership/measurement not evidenced

Severity: P0 measurement readiness
Status: `OWNER_ACTION / NOT_A_CODE_DEFECT`

Evidence boundary:

- sitemap implementation exists;
- robots implementation exists;
- public discovery exists;
- no connected evidence proves Search Console Domain-property ownership, sitemap-read state, indexing baseline or query baseline.

Route: execute `SEARCH_CONSOLE_OWNER_EXECUTION_HANDOFF_V2.md`.

No DNS verification token belongs in GitHub.

---

# ANALYTICS-001 — PostHog foundation exists, but live acquisition measurement is absent

Severity: P0 acquisition measurement
Status: `PROVEN_GAP / RELEASE_DEPENDENT`

## Fresh connected PostHog evidence

Current project state:

```text
POSTHOG_PROJECT_CONNECTED=YES
ANONYMIZE_IPS=true
SESSION_RECORDING=false
INGESTED_EVENT=false
RECENT_EVENTS=NONE_OBSERVED
ACTIONS=0
MARKETING_CONVERSION_GOALS=0
DASHBOARDS=1_STARTER_ONLY
SAVED_INSIGHTS=8_STARTER_ONLY
ATTRIBUTION_WINDOW_DAYS=90
ATTRIBUTION_MODE=last_touch
```

`NONE_OBSERVED` does not mean there are no users. It means the connected analytics project has no observed event evidence for the checked period.

## Current-main implementation evidence

The code already has a meaningful privacy boundary:

- explicit consent storage;
- allow/decline banner;
- manual capture;
- `autocapture=false`;
- `capture_pageview=false`;
- EU PostHog hosts;
- text/attribute masking;
- DNT respect;
- sensitive-path handling;
- property sanitizer.

Current production also contains `PostHogAnalyticsProvider` and `AnalyticsConsentBanner`, and the CSP permits the intended EU PostHog hosts.

But the existing event taxonomy is primarily product/auth/onboarding/billing. Public marketing page-intent, stable CTA, demo and resource events are not yet canonicalized/implemented across the acquisition surface.

## Sub-gaps packed into ANALYTICS-001

Do not create separate issues for these:

1. live PostHog ingestion is not active/proven;
2. Production public-key binding is not proven by current evidence;
3. public acquisition event taxonomy is missing;
4. stable CTA capture is missing;
5. demo start/submit analytics is missing;
6. first/last-touch UTM persistence is missing/not proven;
7. PostHog Actions/conversion goals are zero;
8. starter dashboard/insights are non-crediting until real events exist.

## Route

Use `POSTHOG_LIVE_READINESS_EVIDENCE_V1.md` and fold the full implementation into the future CRO + Acquisition + Attribution Mega PR.

Do not activate paid scale before real ingestion, attribution and consent proof exist.

---

## Future Mega PR packing

### Package A — SEO AUTHORITY + BRAND ENTITY

Include:

- BRAND-002;
- flagship Article 50 / Provider-vs-Deployer / Inventory / Evidence/resource surfaces;
- canonical Organization entity cleanup;
- verified `sameAs`;
- verified footer social/resource links;
- sitemap/internal-link validation;
- brand-variant regression guard.

### Package B — CRO + ACQUISITION + ATTRIBUTION

Include:

- CRO-001 demo commercial truth;
- AI-governance demo taxonomy;
- AI-system-count qualification;
- stable CTA IDs;
- intent routing;
- public acquisition event taxonomy;
- bounded first/last-touch attribution;
- lead attribution persistence;
- demo/signup/checkout attribution;
- ANALYTICS-001 Production ingestion proof;
- consent/PII regression tests.

Canonical activation contract: `MEGA_PR_ACTIVATION_PACK_V1.md`.

Open neither while Enterprise authority requires `NO_NEW_PR` unless release authority explicitly changes.

---

## Current finding state

```text
CRO_001_DEMO_TRIAL_MISMATCH=PROVEN
BRAND_001_LINKEDIN_MISMATCH=PROVEN_OWNER_ACTION
BRAND_002_STRUCTURED_ENTITY_VARIANT=PROVEN_RUNTIME
SEO_001_SEARCH_CONSOLE=OWNER_ACTION_NOT_CODE_DEFECT
ANALYTICS_001_POSTHOG_FOUNDATION=PRESENT
ANALYTICS_001_POSTHOG_LIVE_INGESTION=NO
ANALYTICS_001_PUBLIC_ACQUISITION_TAXONOMY=MISSING
ANALYTICS_001_ACTIONS=0
ANALYTICS_001_CONVERSION_GOALS=0
LIVE_ATTRIBUTION=NO
NEW_RELEASE_PR_OPENED=NO
NEW_MARKETING_ISSUE_CREATED=NO
MAIN_CHANGED_BY_MARKETING=NO
```
