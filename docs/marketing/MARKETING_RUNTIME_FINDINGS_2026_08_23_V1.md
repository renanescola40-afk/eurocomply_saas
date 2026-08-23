# RISCK COMPLY — MARKETING RUNTIME FINDINGS — 2026-08-23 V1

Status: FINDINGS_PROVEN_AND_ROUTED / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Current protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Release freeze: `STABLE`

## Purpose

Consolidate only current attributable marketing/CRO/SEO findings that deserve owner action or inclusion in a future high-density Mega PR.

This file is not a task dump. Duplicate/small findings should be folded into the grouped packages below.

---

# CRO-001 — Demo implies a trial that pricing truth explicitly denies

Severity: P0 marketing truth / P1 release engineering priority depending release gate
Status: `PROVEN`

## Evidence

Current main `src/app/[locale]/book-demo/page.tsx` contains the demo agenda line:

`5 min — pricing motion: trial, Business pilot or Enterprise review`

Canonical `src/lib/i18n/pricing-commercial-truth.ts` states in all six locales that no free trial is currently offered. English truth:

`No free trial is currently offered. Essential and Professional use self-serve monthly checkout. Business and Enterprise start with assisted sales or a demo.`

## Risk

- creates expectation mismatch during a high-intent conversion step;
- can force sales to explain away a public promise that does not exist;
- weakens pricing credibility;
- can contaminate attribution when a visitor believes the demo unlocks a trial.

## MARKETING REQUIREMENT

Demo agenda must reflect the actual commercial state machine.

## ENGINEERING BRIEF

In the future CRO + Acquisition Mega PR, replace trial wording with a commercial-fit step tied to canonical pricing truth.

Recommended English line:

`5 min — commercial fit: self-service checkout, Business-assisted motion or Enterprise review`

Prefer deriving wording from canonical commercial truth rather than creating another shadow pricing authority if practical.

Also replace the generic GRC `compliance_drivers` choices with the approved AI-governance taxonomy and add AI-system-count qualification in the same package.

## ACCEPTANCE CRITERIA

- no public demo copy offers/implies a free trial;
- Essential/Professional remain self-service monthly checkout;
- Business/Enterprise remain assisted/demo motions;
- all six locales preserve the same commercial truth;
- no billing entitlement authority changes.

## TEST

- repository truth-contract test comparing pricing/demo commercial claims;
- six-locale render check;
- public demo smoke;
- lead payload contract remains valid.

## EXPECTED BUSINESS IMPACT

Higher trust at demo conversion and less sales friction from contradictory commercial expectations.

---

# BRAND-001 — LinkedIn entity mismatch

Severity: P0 brand authority
Status: `PROVEN_EXTERNAL / OWNER_ACTION`

## Evidence

Current public LinkedIn page still exposes:

- `Risck Comply` as company name;
- desktop-software category;
- `Risck comply — The European AI Compliance Platform` tagline;
- `Risk Comply` in About copy;
- mixed historical brand variants.

## Route

Owner action using `BRAND_SERP_AUTHORITY_CLOSURE_PACKET_V2.md`.

No repository PR can change LinkedIn.

---

# BRAND-002 — Indexed owned surfaces expose inconsistent brand casing

Severity: P1 brand/entity SEO
Status: `PROVEN_EXTERNAL / RELEASE_CHANGE_STAGED`

## Evidence

Search discovery exposes some RISCK COMPLY-owned pages/wordmark alt text as `Risck comply` / `Risck Comply wordmark`.

## Route

Fold into future SEO + Brand Entity Mega PR:

- normalize user-visible product references;
- normalize alt text;
- add canonical Organization entity;
- add `sameAs` only after official profiles are verified/normalized;
- add verified social links.

Do not rename stable slugs/assets merely for cosmetic casing unless redirect/compatibility impact is addressed.

---

# SEO-001 — Search Console ownership/measurement not evidenced

Severity: P0 measurement readiness
Status: `OWNER_ACTION / NOT_A_CODE_DEFECT`

## Evidence boundary

- sitemap implementation exists;
- robots implementation exists;
- public discovery exists;
- no connected evidence proves Search Console Domain-property ownership, sitemap-read state, indexing baseline or query baseline.

## Route

Execute `SEARCH_CONSOLE_OWNER_EXECUTION_HANDOFF_V2.md`.

No DNS verification token belongs in GitHub.

---

# ANALYTICS-001 — Production marketing-event ingestion not proven

Severity: P0 acquisition measurement
Status: `OPEN / RELEASE_DEPENDENT`

Current PostHog preparation does not yet prove live production marketing event ingestion or demo/signup/checkout attribution.

## Route

Fold into future CRO + Acquisition + Attribution Mega PR:

- UTM persistence;
- first/last touch;
- public marketing event contract;
- consent-safe PostHog initialization;
- demo/signup/checkout attribution;
- production ingestion proof;
- privacy tests.

Do not activate paid scale before this is proven.

---

## Future Mega PR packing

### Package A — SEO AUTHORITY + BRAND ENTITY

Include:

- BRAND-002;
- flagship search-authority pages already specified;
- canonical Organization structured data;
- verified `sameAs`;
- footer social/resource links;
- sitemap/internal-link validation;
- brand-variant regression guard.

### Package B — CRO + ACQUISITION + ATTRIBUTION

Include:

- CRO-001 demo commercial truth;
- AI-governance-specific demo taxonomy;
- AI-system-count qualification;
- stable CTA IDs;
- intent routing;
- lead attribution persistence;
- ANALYTICS-001 production event proof;
- consent/privacy regression tests.

Open neither package while Enterprise authority requires `NO_NEW_PR`, unless a release owner explicitly reclassifies a finding as release-breaking.

---

## Current finding state

```text
CRO_001_DEMO_TRIAL_MISMATCH=PROVEN
BRAND_001_LINKEDIN_MISMATCH=PROVEN_OWNER_ACTION
BRAND_002_INDEXED_CASING_MISMATCH=PROVEN_STAGED
SEO_001_SEARCH_CONSOLE=OWNER_ACTION_NOT_CODE_DEFECT
ANALYTICS_001_POSTHOG_LIVE=NOT_PROVEN
NEW_RELEASE_PR_OPENED=NO
NEW_MARKETING_ISSUE_CREATED=NO
MAIN_CHANGED_BY_MARKETING=NO
```
