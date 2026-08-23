# RISCK COMPLY — BRAND SERP + ENTITY AUTHORITY CLOSURE PACKET V2

Status: OWNER_ACTION_READY / RELEASE_CHANGE_STAGED
Checked: 2026-08-23
Branch: `marketing/august-2026-authority-engine`
Marketing mode: PRELAUNCH_CONTROLLED

## 1. Mission

Make every owned public surface reinforce one entity:

```text
NAME=RISCK COMPLY
CATEGORY=Operational AI Governance
TAGLINE=Operational AI Governance for European Teams
CANONICAL_URL=https://www.risckcomply.com
```

This is an entity-consistency program, not a trademark/legal conclusion and not a claim of market authority already achieved.

---

## 2. Fresh external evidence

### Canonical site

Current search discovery surfaces the canonical site as RISCK COMPLY and the current homepage positioning around AI-governance evidence/readiness.

### LinkedIn mismatch — PROVEN

Public LinkedIn still exposes:

- company name: `Risck Comply`;
- category: desktop software products;
- tagline: `Risck comply — The European AI Compliance Platform`;
- About text using `Risk Comply`;
- historical posts using mixed `RiskComply`, `RisckComply` and `Risck Comply` naming.

Public profile:
`https://pt.linkedin.com/company/risck-comply`

### Indexed owned-surface mismatch — PROVEN

Search discovery also exposes some owned public surfaces/alt text with `Risck comply` / `Risck Comply wordmark` rather than the canonical all-caps name.

### Disambiguation problem

Searches for spelling variants such as `RiskComply` can surface unrelated entities. This packet makes no trademark/conflict conclusion. The marketing response is simply to stop generating spelling variants and consistently reinforce `RISCK COMPLY`.

---

## 3. LinkedIn owner action

Do not create a new company page.

Update the existing official page after owner review.

### Company name

`RISCK COMPLY`

### Tagline

`Operational AI Governance for European Teams`

### Category

Select the closest appropriate available LinkedIn category for B2B SaaS / enterprise software / AI governance. Do not invent a category label that LinkedIn does not offer.

### Website

`https://www.risckcomply.com`

### Recommended About copy

RISCK COMPLY helps European teams operate AI governance beyond spreadsheets.

The platform is designed to connect AI systems and use cases with accountable owners, risk and role context, evidence, policies, actions and review history in one structured workspace.

Teams can use RISCK COMPLY to support AI inventory, risk-review workflows, evidence readiness, vendor AI governance, policy/document workflows and EU AI Act readiness activities.

RISCK COMPLY supports governance and review workflows. It does not replace qualified legal counsel, provide regulatory approval or guarantee compliance outcomes.

Category: Operational AI Governance.

Website: www.risckcomply.com

### Historical-post cleanup rule

Do not delete all history blindly.

Review only posts with one or more of these problems:

- wrong brand spelling materially weakens entity consistency;
- obsolete regulatory date/fine claim;
- language implies guaranteed compliance, automatic legal classification or regulator authority;
- old product capability claim is no longer supported.

Where LinkedIn editing is practical, correct the material problem. Where editing is unavailable or would destroy useful context, publish current corrective/updated content instead. Preserve history that remains factual and harmless.

---

## 4. Owned-site future Mega PR requirements

Do not open this PR while the Enterprise Control Tower requires `NO_NEW_PR`.

### MARKETING REQUIREMENT

One canonical product entity across crawlable/public surfaces.

### ENGINEERING BRIEF

In the future SEO/Brand Entity Mega PR:

1. normalize user-visible `Risck comply`, `Risk Comply` and other unintended brand variants to `RISCK COMPLY` where they refer to the product;
2. normalize public image alt text / wordmark labels to `RISCK COMPLY`;
3. keep filenames/slugs stable unless a user-facing reason justifies a redirect/migration;
4. emit one eligible `Organization` JSON-LD entity from a canonical public surface;
5. set entity name to `RISCK COMPLY` and canonical URL to `https://www.risckcomply.com`;
6. add `sameAs` only for verified, owner-controlled profiles whose identity has already been normalized;
7. add verified official social links to footer/resource surfaces;
8. preserve existing conservative legal/assurance claims;
9. do not add founder/entity/legal facts that remain blocked by #1409/#1410.

### ACCEPTANCE CRITERIA

- no crawlable public product-name variant remains unless intentionally quoted/historical;
- LinkedIn profile is owner-verified and normalized before being added to `sameAs`;
- Organization structured data has one canonical entity name/URL;
- footer links point only to verified official profiles;
- no fake awards/certifications/ratings/reviews;
- no unsupported founder/legal-entity data;
- canonical URLs and hreflang remain valid.

### TEST

- repository grep for user-visible brand variants;
- render homepage, pricing, Trust, Security, demo and resource pages;
- schema validation on canonical Organization output;
- verify footer links;
- search-engine spot check after deployment;
- Search Console URL Inspection for canonical homepage and key authority pages after owner verification.

### EXPECTED BUSINESS IMPACT

- stronger brand-query disambiguation;
- more consistent entity signals across owned properties;
- lower trust friction during buyer research;
- cleaner foundation for branded search measurement and later `sameAs`.

---

## 5. SERP ownership checks

After external normalization, record these checks instead of claiming success immediately:

```text
CHECK_1=exact query "RISCK COMPLY"
CHECK_2=site:risckcomply.com "RISCK COMPLY"
CHECK_3=LinkedIn result title/tagline
CHECK_4=homepage result title/description
CHECK_5=Trust Center result
CHECK_6=Pricing result
CHECK_7=Organization structured-data output
CHECK_8=Search Console branded-query baseline
```

Track what Google actually shows. Do not infer that metadata edits force an immediate snippet update.

---

## 6. Truth boundary

```text
CANONICAL_BRAND_CONTRACT=READY
LINKEDIN_MISMATCH=PROVEN
PUBLIC_INDEXED_CASING_MISMATCH=PROVEN
LINKEDIN_NORMALIZED=NO
ORGANIZATION_SAMEAS=NOT_YET_ELIGIBLE
EXTERNAL_BRAND_AUTHORITY=EARLY
OWNER_ACTION_REQUIRED=YES
MAIN_CHANGE_REQUIRED_NOW=NO
```
