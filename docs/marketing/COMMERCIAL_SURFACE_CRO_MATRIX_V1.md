# RISCK COMPLY — COMMERCIAL SURFACE CRO MATRIX V1

Status: READY_FOR_ENGINEERING_HANDOFF / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23

## Objective

Define one coherent buyer journey across homepage, feature pages, pricing, Enterprise, Book Demo and Trust Center.

## P0 consistency contract

Canonical brand everywhere:

**RISCK COMPLY**

Canonical category:

**Operational AI Governance**

Acquisition support phrase:

**AI Governance & EU AI Act Readiness for European B2B Teams**

Commercial motions:

- Essential / Professional -> self-service when release policy permits
- Business -> sales-assisted / demo
- Enterprise -> sales + procurement + contract

No free trial unless billing truth changes.

---

## Surface matrix

| Surface | Primary visitor | Current strength | Primary gap | Recommended primary CTA | Secondary CTA | Proof CTA |
|---|---|---|---|---|---|---|
| Homepage | mixed | strong operational product story | one-size-fits-all Create account | Explore AI Inventory / Platform | Book demo | Trust Center |
| AI Inventory feature | problem-aware search | very strong product-message fit | no lead magnet bridge yet | Get AI Inventory Template | Explore product | Book demo |
| Risk feature | compliance/governance | structured context | risk can sound like auto-legal classification | See risk workflow | Book demo | Evidence / Trust |
| Evidence feature | audit/procurement | strong differentiation | needs clearer review outcome | See evidence workflow | Book demo | Trust Center |
| Pricing | solution-aware | transparent 4-tier pricing | buyer still has to self-diagnose plan | Start Professional or selected plan | Book demo | Trust Center |
| Enterprise | enterprise buyer | strongest buyer-trigger framing | proof should move earlier | Book Enterprise Governance Review | Trust Center | Security questionnaire |
| Book Demo | high-intent | detailed form and 30-min agenda | generic GRC qualification | Submit demo request | — | Trust link before submit |
| Trust Center | procurement | unusually honest/evidence-bound | brand inconsistency + legal draft status | Request security/procurement review after gate | Book Enterprise demo | Security/DPA/Subprocessors |

---

## Homepage

### Preserve

- `Turn AI governance into evidence ready for review.`
- inventory + risk + evidence + ownership + history story
- operational workflow
- conservative legal guardrail

### Change after release window

Introduce explicit intent routes near hero or immediately after hero:

- `Explore AI Inventory`
- `Book a demo`
- `Compare plans`
- `Review Trust Center`

Do not make `Create account` the only meaningful commercial path.

### Market variants

Germany: emphasize KI-Inventar + responsibility + evidence.
France: inventory + traceability + proofs.
Spain: inventario + Reglamento de IA + evidence workflow.
English: Operational AI Governance + inventory wedge.

---

## Feature pages

Every feature page should answer:

1. What operational problem exists?
2. What record/workflow does RISCK COMPLY create?
3. What can the buyer review afterwards?
4. What should they do next?

Use a CTA ladder:

`RESOURCE -> FEATURE -> PRICING/DEMO`

Example:

AI Inventory:

- Resource: Get the operational inventory template
- Product: See AI Inventory workflow
- Commercial: Book a demo

---

## Pricing

Current pricing truth is strong and should remain canonical:

- Essential €49/month
- Professional €149/month
- Business €399/month
- Enterprise from €990/month
- no free trial

### Add plan decision helper

Question 1: How many AI systems/use cases?
Question 2: How many teams/users?
Question 3: Is security/procurement review required?
Question 4: Do you need assisted rollout?

Output should recommend a motion, not promise eligibility.

Example:

`You may want Professional — structured governance readiness for one organization.`

or

`Business/Enterprise may fit better — request a demo for multi-team/procurement requirements.`

### Do not

- use fake discounts;
- countdown timers;
- invented scarcity;
- fake customer logos;
- fake “most popular” claims unless based on real data.

---

## Enterprise

Current page already contains strong triggers:

- customer security review;
- board visibility;
- living AI inventory;
- procurement DPA/security review;
- multi-department AI usage.

These should become the core enterprise landing segmentation.

Recommended proof order:

`TRIGGER -> OPERATING MODEL -> PRODUCT -> TRUST -> PACKAGE -> DEMO`

Move Trust Center CTA above the fold alongside demo.

Use:

Primary: `Book Enterprise Governance Review`
Secondary: `Review Trust Center`

---

## Book Demo

### Current form strengths

- work email;
- company;
- role;
- company size;
- region;
- timeline;
- current process;
- buyer-selected drivers;
- consent to contact;
- protected lead endpoint.

### Replace primary driver taxonomy

Current broad taxonomy should be replaced/reordered with:

- AI system inventory
- EU AI Act readiness
- AI risk assessment
- AI governance evidence / audit readiness
- AI vendor risk / procurement
- Article 50 / transparency
- Provider / deployer role mapping
- Policies / controlled documentation
- Customer / board / security review
- GDPR / DPA

### Add one high-value structured question

`How many AI systems or use cases are currently in scope?`

This single question improves:

- plan fit;
- complexity understanding;
- demo personalization;
- commercial prioritization.

### Message prompt

Replace generic prompt with:

`What triggered the review — customer request, board question, AI rollout, regulatory deadline, procurement process or something else?`

This produces a better discovery call than an open `Tell us what you need` prompt.

---

## Trust Center

### P0 brand cleanup

Localized/current trust copy uses `Risck comply` in multiple places.

Normalize display brand to:

**RISCK COMPLY**

Keep deliberately controlled alternate names only in structured-data/entity contexts where needed.

### Conversion role

Trust Center should act as a sales-enablement page, not only documentation.

After legal publication gates close, add:

- Request security pack
- Request DPA/procurement review
- Book Enterprise governance demo

Until then, draft/evidence boundaries remain visible and no legal completeness claim is allowed.

---

## Footer

Current footer has useful links to:

- features;
- pricing;
- Enterprise;
- demo;
- Trust/legal pages.

Future improvements:

- verified social profiles;
- AI Inventory Template;
- flagship August 2026 guide;
- consistent category line;
- `sameAs` only after ownership verification.

---

## Cross-surface CTA IDs for analytics

Use stable identifiers independent of translated label:

- `home_primary_inventory`
- `home_demo`
- `home_pricing`
- `home_trust`
- `feature_inventory_template`
- `feature_demo`
- `pricing_professional_start`
- `pricing_business_demo`
- `pricing_enterprise_sales`
- `pricing_trust`
- `enterprise_demo`
- `enterprise_trust`
- `demo_submit`
- `trust_security_pack`

Never rely on visible button text as the analytics identity.

---

## Funnel definitions

### Self-service funnel

`landing_view -> feature_view/pricing_view -> cta_clicked -> user_signed_up -> checkout_started -> checkout_completed -> subscription_active`

### Sales-assisted funnel

`landing_view -> enterprise/pricing/trust -> demo_started -> demo_submitted -> qualified_lead -> sales_outcome`

`qualified_lead` should only be created once an approved server-side qualification model exists. Do not infer from client-side PII.

### Resource funnel

`resource_view -> document_downloaded -> feature_view -> demo/signup`

---

## Release-gated mega PR

Future PR title:

`[Marketing P0] CRO + acquisition routing + qualified demo foundation`

Must include:

- brand normalization on Trust surfaces;
- CTA hierarchy by buyer intent;
- AI-governance demo taxonomy;
- AI system count field;
- acquisition attribution;
- stable CTA IDs;
- privacy-safe marketing events;
- localized copy for EN/DE/FR/ES/PT/IT;
- tests for links, form validation, consent and attribution;
- no change to legal/production claims beyond accepted evidence.

Do not open while release authority requires `OPEN_RELEASE_CHANGING_PRS=0` unless the owner/Control Tower explicitly releases the freeze.

---

## Current state

```text
HOMEPAGE_PRODUCT_STORY: STRONG
HOMEPAGE_INTENT_ROUTING: MEDIUM
FEATURE_TO_LEAD_BRIDGE: WEAK
PRICING_CLARITY: STRONG
PRICING_DECISION_SUPPORT: MEDIUM
ENTERPRISE_STORY: STRONG
DEMO_FORM_FOUNDATION: STRONG
DEMO_AI_GOVERNANCE_QUALIFICATION: WEAK
TRUST_CONTENT: STRONG
TRUST_COMMERCIAL_ENABLEMENT: MEDIUM
TRUST_BRAND_CONSISTENCY: NEEDS_FIX
ATTRIBUTED_FUNNEL: NOT_LIVE
```
