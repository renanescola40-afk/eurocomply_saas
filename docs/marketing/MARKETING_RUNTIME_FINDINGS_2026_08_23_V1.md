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

This is stronger evidence than search-result casing alone: the owned structured-data source itself is reinforcing a non-canonical casing variant.

## Route

Future SEO Authority + Brand Entity Mega PR:

- normalize unintended user-visible product references;
- review/remove non-canonical `alternateName` where it weakens one-entity consistency;
- preserve one canonical Organization/WebSite/SoftwareApplication graph;
- add `sameAs` only after official profile ownership and normalization are verified;
- add only verified official social links;
- preserve stable URLs/slugs unless redirect/migration is justified.

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

# ANALYTICS-001 — Production PostHog binding drift + missing acquisition attribution

Severity: P0 acquisition measurement
Status: `ROOT_CAUSE_PROVEN / REMEDIATION_PRESTAGED / RELEASE_DEPENDENT`

## Connected PostHog truth

The connected PostHog control plane currently exposes one accessible EU project. That project has:

```text
POSTHOG_PROJECT_CONNECTED=YES
POSTHOG_CONNECTED_PROJECT_COUNT=1
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

`NONE_OBSERVED` does not mean the product has no users. It means this connected analytics project has no observed event evidence for the checked period.

## Current Production runtime truth

The browser bundle proves:

- PostHog runtime code is present;
- consent UX is present;
- the approved EU PostHog network hosts are present;
- a non-empty browser Project API Key is present.

A private equality comparison, without printing or storing either value, proved:

```text
PRODUCTION_POSTHOG_KEY == CONNECTED_PROJECT_KEY -> FALSE
```

Therefore:

```text
POSTHOG_PRODUCTION_PUBLIC_KEY=PRESENT
POSTHOG_PRODUCTION_KEY_MATCH=FAIL_CURRENTLY
POSTHOG_BINDING_DRIFT=PROVEN
```

## Root cause

Current protected `main` deployment workflow synchronizes many provider bindings into Vercel before Production build, but does not govern:

```text
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_ASSET_HOST
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT
```

That gap allows Vercel Production to retain a PostHog project binding independently of the protected GitHub Production environment and the project audited by this workstream.

Root-cause classification:

```text
ANALYTICS_ROOT_CAUSE=PROVIDER_BINDING_GOVERNANCE_DRIFT
CODE_CLIENT_INITIALIZATION_DEFECT=NO_EVIDENCE
POSTHOG_SERVICE_OUTAGE=NO_EVIDENCE
```

## Remediation already prestaged on marketing branch

Branch-only commits:

```text
873f2c489618b6f4ebd2c720e1fed3100f860611  govern PostHog Production binding

e1bd05bab2af06f2fa257b0af9f4ad1d9cbcfdfe  lock deployment regression contract

f6d65b8f04c2644c321c30111e0f3e2a1125c2e2  document governed Production mapping

8a48a893d30c8683542a894e325c1aeae8a5da1b  record canonical root-cause evidence
```

The prestaged workflow:

- sources the approved PostHog Project API Key from the protected GitHub Production variable contract;
- locks EU ingestion and asset hosts;
- forces explicit analytics consent in Production;
- fails closed on missing key, region drift or consent-policy drift;
- synchronizes all four analytics bindings to Vercel before the Production build.

No value is stored in repository artifacts.

## Acquisition instrumentation remains missing

Binding correction alone does not create attribution. Mega PR B still must implement:

- public page-intent events;
- stable CTA IDs/capture;
- demo start/submit events;
- bounded first/last-touch UTM persistence;
- lead/demo/signup/checkout attribution;
- no-PII PostHog contract;
- real connected-project ingestion proof.

Canonical evidence: `POSTHOG_LIVE_READINESS_EVIDENCE_V1.md`.

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
- **already-prestaged PostHog Production binding-governance remediation**;
- public acquisition event taxonomy;
- bounded first/last-touch attribution;
- lead attribution persistence;
- demo/signup/checkout attribution;
- connected PostHog Production ingestion proof;
- consent/PII regression tests.

Before activating Mega PR B, the protected GitHub `production` environment must contain the approved connected PostHog EU Project API Key under `NEXT_PUBLIC_POSTHOG_KEY`. Never record the value in GitHub files/issues/comments.

Canonical activation contract: `MEGA_PR_ACTIVATION_PACK_V1.md`.

Open neither package while Enterprise authority requires `NO_NEW_PR` unless release authority explicitly changes.

---

## Current finding state

```text
CRO_001_DEMO_TRIAL_MISMATCH=PROVEN
BRAND_001_LINKEDIN_MISMATCH=PROVEN_OWNER_ACTION
BRAND_002_STRUCTURED_ENTITY_VARIANT=PROVEN_RUNTIME
SEO_001_SEARCH_CONSOLE=OWNER_ACTION_NOT_CODE_DEFECT
ANALYTICS_001_POSTHOG_FOUNDATION=PRESENT
ANALYTICS_001_PRODUCTION_PUBLIC_KEY=PRESENT
ANALYTICS_001_PRODUCTION_KEY_MATCH=FAIL
ANALYTICS_001_BINDING_DRIFT=ROOT_CAUSE_PROVEN
ANALYTICS_001_BINDING_REMEDIATION=PRESTAGED_BRANCH_ONLY
ANALYTICS_001_POSTHOG_LIVE_INGESTION_CONNECTED_PROJECT=NO
ANALYTICS_001_PUBLIC_ACQUISITION_TAXONOMY=MISSING
ANALYTICS_001_ACTIONS=0
ANALYTICS_001_CONVERSION_GOALS=0
LIVE_ATTRIBUTION=NO
NEW_RELEASE_PR_OPENED=NO
NEW_MARKETING_ISSUE_CREATED=NO
MAIN_CHANGED_BY_MARKETING=NO
```
