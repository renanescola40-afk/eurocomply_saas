# RISCK COMPLY — CRO & COMMERCIAL CONVERSION ARCHITECTURE V1

Status: READY_FOR_ENGINEERING_HANDOFF / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23
Marketing mode: PRELAUNCH_CONTROLLED

## 1. Objective

Turn future European traffic into qualified commercial outcomes without creating unsafe launch claims or breaking the current Enterprise exact-SHA freeze.

Primary journey:

`SEARCH / SOCIAL / REFERRAL -> RELEVANT LANDING -> PRODUCT PROOF -> TRUST -> PRICING -> DEMO OR SELF-SERVICE -> QUALIFIED LEAD / CUSTOMER`

The core CRO principle is **route by buying intent, not one CTA for every visitor**.

---

## 2. Verified current commercial state

Current protected release authority still says:

- `RELEASE_FREEZE=STABLE`
- `OPEN_RELEASE_CHANGING_PRS=0`
- `PRODUCTION_GO=NO_GO`

Therefore this document specifies the future commercial conversion system but does not authorize changes to `main` while the release is frozen.

The current public product already has strong conversion surfaces:

- public homepage;
- localized feature pages;
- pricing;
- Enterprise page;
- Book Demo page and lead capture endpoint;
- Trust Center and procurement-support surfaces;
- signup / self-service motion for Essential and Professional;
- sales-assisted motion for Business and Enterprise.

The main problem is not absence of pages. It is **intent routing, qualification, proof sequencing and attribution**.

---

## 3. P0 CRO findings

### P0-A — Homepage CTA is too one-dimensional

The homepage in EN/PT and international locales emphasizes `Create account` / localized equivalents as the primary action.

That is suitable for self-service intent, but RISCK COMPLY's target market also includes Compliance, Legal, Security, Procurement and enterprise buyers that need:

- demo;
- security review;
- Trust Center;
- procurement answers;
- multi-team rollout.

Do not force enterprise-intent visitors into the same CTA as a small self-service workspace.

Recommended homepage CTA hierarchy after release authority permits changes:

Primary: `See how AI governance works` or `Explore AI Inventory`
Secondary commercial: `Book a demo`
Self-service: `Create account`
Enterprise proof: `Review Trust Center`

After proven Product/Production GO, `Create account` may become primary for explicitly self-service campaign traffic.

### P0-B — Demo qualification language is misaligned with category positioning

The demo headline is AI-governance focused, but the current checkbox options are mostly broad GRC/privacy themes:

- GDPR / privacy evidence
- Vendor and DPA review
- Risk register
- Controlled documents
- Audit preparation
- Customer procurement review

Missing direct category-demand signals:

- AI system inventory
- EU AI Act readiness
- Article 50 / transparency
- AI risk assessment
- Provider / deployer role mapping
- AI vendor risk
- AI governance evidence
- AI governance workflow / ownership

This prevents marketing and sales from learning which AI-governance wedge actually generated the lead.

### P0-C — Qualification exists, but no formal commercial score

The demo form already captures useful fields:

- company size;
- role;
- region;
- timeline;
- current process;
- compliance/governance drivers.

These fields should drive routing and sales priority rather than remain unstructured lead context.

### P0-D — Attribution is not connected to conversion

Per the Measurement & Attribution Foundation V1, UTM/referrer/landing data is not yet retained through the lead flow and PostHog live ingestion is not proven.

No CRO test should be declared a winner until acquisition and conversion attribution are live.

### P0-E — Trust is strong but positioned too late

The Trust Center is one of the strongest enterprise differentiators because it explicitly exposes controls, evidence boundaries, subprocessors, DPA posture and open gaps.

For enterprise traffic, Trust should be part of the conversion path before demo submission, not buried only in footer/navigation.

### P0-F — Legal draft status blocks aggressive enterprise conversion

The Trust Center still exposes legal review-draft boundaries. This is correct and honest, but means paid enterprise acquisition should remain gated until the relevant legal publication decisions are complete.

---

## 4. Dual commercial-mode architecture

### MODE A — PRELAUNCH_CONTROLLED / PRODUCTION_GO=NO_GO

Goal: capture interest, demos and qualified demand without implying unrestricted production readiness.

Recommended CTA hierarchy:

1. `Explore the platform`
2. `Book a readiness demo`
3. `Review Trust Center`
4. `Get the AI Inventory Template`
5. self-service signup only where current release policy explicitly permits it

Do not run broad paid campaigns.

### MODE B — PRODUCTION_GO=PASS

Goal: split self-service and sales-assisted acquisition cleanly.

Self-service path:

`Landing -> Pricing -> Essential/Professional -> Signup -> Checkout -> Activation`

Sales-assisted path:

`Landing -> Enterprise/Business proof -> Trust -> Demo -> Qualification -> Sales -> Contract`

Resource-led path:

`SEO/Social -> Guide/Template -> Lead -> Nurture -> Feature/Pricing/Demo`

---

## 5. Surface-by-surface conversion architecture

### Homepage

Job: explain category and route intent.

Required layers:

1. Category / outcome promise
2. Operational product proof
3. AI Inventory wedge
4. Risk + evidence workflow
5. Buyer-role paths
6. Trust/security proof
7. Pricing / demo / self-service route

Recommended buyer-role paths:

- Compliance / AI Governance -> inventory + workflow
- Legal / Privacy -> role, evidence, policy context
- Security / GRC -> controls + trust
- Procurement -> vendor risk + trust
- CTO / Head of AI -> inventory + ownership + change monitoring

### Feature pages

Job: convert non-brand high-intent SEO traffic.

Each page should have three CTAs:

1. feature-specific next step;
2. related proof / Trust;
3. demo or account route.

Example AI Inventory:

Primary: `Get the AI Inventory Template`
Secondary: `See AI Inventory in RISCK COMPLY`
Commercial: `Book a governance demo`

### Pricing

Job: help buyers choose motion, not merely compare features.

Keep the existing four-plan architecture, but add explicit decision guidance:

- Essential: first controlled inventory
- Professional: structured governance readiness
- Business: multi-team workflows + sales-assisted rollout
- Enterprise: procurement / security / contract-led

Add `Not sure?` routing based on:

- company size;
- number of AI systems;
- number of teams;
- procurement/security review required yes/no.

Avoid false trial language. Current pricing truth correctly states there is no free trial.

### Book Demo

Job: qualify buyer and prepare a high-value sales conversation.

Recommended new `What do you need to operationalize first?` choices:

- AI system inventory
- EU AI Act readiness
- AI risk assessment
- Article 50 / transparency
- Provider / deployer role mapping
- AI governance evidence
- Vendor AI risk / procurement
- Policies and controlled documentation
- Customer / board / audit review

Keep GDPR/DPA only where relevant, but do not let generic privacy language dominate the AI-governance demand signal.

Recommended additional field:

`How many AI systems or use cases are currently in scope?`

Options:

- 1–10
- 11–25
- 26–100
- 101–250
- 251+
- Not yet known

This maps directly to product value and plan fit.

### Enterprise page

Job: convert procurement-led buyers.

Current direction is strong: inventory, risk, evidence and procurement support.

Recommended sequence:

1. buyer trigger;
2. operating outcome;
3. product capability;
4. Trust / security proof;
5. procurement package;
6. demo.

Primary CTA: `Book Enterprise Governance Review`
Secondary CTA: `Review Trust Center`

Avoid adversarial wording against competitors in the hero. The current `Not fake badges...` message is memorable but better used lower on the page as a trust principle than as enterprise positioning.

### Trust Center

Job: remove procurement friction.

Recommended enterprise conversion CTA after legal gate closure:

- `Request security pack`
- `Book procurement review`
- `Ask a security question`

Until legal materials are fully approved, continue showing evidence boundaries and draft status exactly as required.

---

## 6. CTA hierarchy by intent

### Informational visitor

`Read guide -> Get template -> Explore feature`

### Problem-aware visitor

`Explore feature -> Compare workflow -> Pricing`

### Solution-aware visitor

`Pricing -> Create account OR Book demo`

### Enterprise buyer

`Enterprise -> Trust -> Demo -> Procurement review`

### Returning branded visitor

`Pricing / Login / Demo`

---

## 7. Local-market CTA strategy

### English Europe

Primary category: Operational AI Governance

Best commercial routes:

- Explore AI Inventory
- Book governance demo
- Compare plans

### Germany

Prefer lower-hype, operational language:

- `KI-Inventar ansehen`
- `Governance-Demo anfragen`
- `Trust Center prüfen`

### France

- `Découvrir l’inventaire IA`
- `Demander une démo gouvernance IA`
- `Consulter le Centre de confiance`

### Spain

- `Explorar el inventario de IA`
- `Solicitar una demo de gobernanza`
- `Revisar el Centro de Confianza`

Do not literal-translate CTA wording without checking local search and buyer language.

---

## 8. CRO experiment backlog after attribution is live

Do not run tests before event capture is proven.

Priority tests:

1. Homepage primary CTA: `Create account` vs `Explore AI Inventory`
2. Homepage secondary CTA: `Explore platform` vs `Book demo`
3. AI Inventory page: feature CTA vs lead-magnet CTA
4. Pricing plan guidance module vs current four-card-only decision
5. Demo form generic GRC options vs AI-governance-specific options
6. Enterprise page Trust Center CTA placement
7. Demo form one-step vs progressive disclosure

Primary KPI must be downstream qualified conversion, not click-through alone.

---

## 9. Measurement contract

Required events:

- `landing_view`
- `feature_view`
- `pricing_view`
- `trust_view`
- `cta_clicked`
- `demo_started`
- `demo_submitted`
- `user_signed_up`
- `checkout_started`
- `checkout_completed`
- `subscription_active`

Required dimensions:

- locale
- market
- page_type
- cta_id
- plan
- first/last UTM
- landing path
- referrer domain

Do not send PII to PostHog.

---

## 10. Engineering mega-PR brief after freeze

### MARKETING REQUIREMENT

Create a measurable, intent-routed acquisition and conversion system.

### ENGINEERING BRIEF

One `CRO + Acquisition Mega PR` should cover:

- public marketing events + attribution;
- intent-specific CTA system;
- demo-field alignment to AI Governance;
- lead attribution persistence;
- company/AI-system qualification fields;
- Trust / Enterprise CTA routing;
- localized CTA copy;
- privacy and consent tests;
- funnel analytics acceptance.

### ACCEPTANCE CRITERIA

- no unsupported Production/Legal claim;
- no release-gate bypass;
- all locales render valid CTAs;
- demo submissions persist qualification and attribution;
- privacy-safe analytics events visible in production PostHog after consent;
- self-service and sales-assisted routes are distinguishable;
- Trust Center remains evidence-bound;
- current pricing truth remains consistent: no free trial unless billing policy changes.

### EXPECTED BUSINESS IMPACT

- higher qualified-demo rate;
- cleaner Enterprise routing;
- stronger pricing-to-action conversion;
- clear source-to-revenue attribution;
- better market learning for DE/FR/ES/EN;
- lower sales time wasted on poorly qualified leads.

---

## 11. Current decision

```text
CRO_ARCHITECTURE: READY
COMMERCIAL_SURFACES: STRONG_BUT_FRAGMENTED
INTENT_ROUTING: NEEDS_WORK
DEMO_QUALIFICATION: MISALIGNED_WITH_AI_GOVERNANCE_CATEGORY
TRUST_AS_CONVERSION_ASSET: UNDERUSED
ATTRIBUTION: NOT_LIVE
PAID_CRO_TESTING: BLOCKED
RELEASE_CHANGE: NOT_AUTHORIZED_DURING_FREEZE
```
