# RISCK COMPLY — MARKETING OPERATING SYSTEM V1

Status: READY_FOR_EXECUTION / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23
Canonical marketing mode: PRELAUNCH_CONTROLLED

## 1. Mission

Operate RISCK COMPLY marketing as one measurable revenue system rather than disconnected SEO, social, content and sales activities.

Operating chain:

`MARKET -> PROBLEM -> CAMPAIGN -> ASSET -> DISTRIBUTION -> CTA -> LEAD -> QUALIFICATION -> PIPELINE -> REVENUE -> LEARNING`

The Marketing Operating System exists to answer five questions every week:

1. What are we trying to make the market believe or do?
2. Which assets and channels are doing that work?
3. What buyer signal did they create?
4. Did that signal progress toward qualified pipeline?
5. What should be doubled down, changed, localized, paused or killed?

Vanity metrics are diagnostic only. The north star is qualified demand and revenue readiness.

---

## 2. Current release boundary

The canonical Enterprise Control Tower currently states:

- `CURRENT_MAIN_SHA=9c0801d46090f63b05fc0b7d8087e0e9313a525b`
- `RELEASE_FREEZE=STABLE`
- `OPEN_RELEASE_CHANGING_PRS=0`
- `PRODUCTION_GO=NO_GO`
- governed Supabase V19 state remains `0_OF_25`
- production write is not authorized
- external/human blockers remain for founder facts, Legal 8/8, independent pentest/retest and legitimate Stripe LIVE lifecycle.

Therefore this marketing system must not create a release-changing PR or imply Production GO.

Allowed now:

- founder-led organic distribution;
- company social distribution;
- authority content preparation;
- non-release-changing research and sales enablement;
- partner / relationship outreach;
- demo discovery using current evidence boundaries;
- lead qualification and nurture design;
- Brand SERP cleanup on external profiles;
- organic campaign execution that does not require new production claims;
- off-product collateral based on verified product truth.

Blocked or gated now:

- broad paid acquisition scale;
- aggressive self-service acquisition claims;
- release-changing SEO/CRO code merges;
- claims of legal completion, certification, independent pentest completion or Production GO;
- campaigns whose economics cannot be measured because attribution is not live.

---

## 3. Two-mode state machine

### MODE A — PRELAUNCH_CONTROLLED

Purpose: create category authority, demand, market learning and qualified conversations without pretending the product has passed all production gates.

Primary channels:

1. Founder LinkedIn
2. RISCK COMPLY LinkedIn
3. Organic search / authority preparation
4. Direct relationship and partner outreach
5. Lead magnet / nurture when delivery infrastructure is available
6. Demo / enterprise review for appropriate buyers

Primary CTAs:

- Explore AI Inventory
- Read / save authoritative guide
- Get AI Inventory Template
- Book governance demo
- Review Trust Center

Paid status: `BLOCKED`

### MODE B — PRODUCTION_GO

Transition only when all applicable commercial gates are proven, not merely planned.

Minimum marketing activation gate:

- `PRODUCTION_GO=PASS`
- legitimate Stripe LIVE lifecycle accepted for paid self-service paths
- legal publication state suitable for the claims used in campaigns
- analytics consent verified
- PostHog production ingestion verified
- source/UTM -> lead -> signup/checkout attribution verified
- pricing and CTA truth revalidated against production

Then activate:

- self-service acquisition for Essential / Professional;
- sales-assisted acquisition for Business / Enterprise;
- paid search tests;
- paid LinkedIn tests;
- CRO experiments;
- retargeting only with appropriate consent and platform configuration;
- revenue attribution dashboards.

A release pass does not automatically authorize every paid tactic. Each tactic must still satisfy privacy, measurement and commercial-truth gates.

---

## 4. Campaign object

Every campaign must exist as one structured object before execution.

Required fields:

- `campaign_id`
- `campaign_name`
- `market`
- `language`
- `persona`
- `primary_pain`
- `buyer_stage`
- `campaign_hypothesis`
- `flagship_asset`
- `distribution_assets`
- `landing_url`
- `primary_cta`
- `cta_id`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `release_dependency`
- `claim_risk`
- `owner_role`
- `status`
- `primary_kpi`
- `secondary_kpis`
- `pipeline_metric`
- `start_date`
- `review_date`
- `decision`

Allowed campaign status:

`IDEA -> FACT_CHECK -> READY -> SCHEDULED -> LIVE -> LEARNING -> SCALE / ITERATE / PAUSE / KILL`

Do not use `DONE` for marketing campaigns. A campaign is either still useful, scaled, learned from, paused or killed.

---

## 5. Canonical campaign IDs — first wave

### EN-INV-001 — AI Inventory Category Wedge

Market: English-language Europe
Pain: scattered AI inventory / Shadow AI
Buyer: Compliance, AI Governance, Security, Legal, CTO/Head of AI
Flagship: AI System Inventory Template + AI Inventory feature page
CTA: `Get the AI Inventory Template`
CTA ID: `feature_inventory_template`
Current state: content/spec ready; release-dependent landing not yet published
Primary KPI after measurement: qualified resource leads
Pipeline metric: inventory-led demos / opportunities

### EN-REG-002 — What Actually Applies After 2 August 2026?

Market: Europe / English
Pain: regulatory confusion
Buyer: Compliance + Legal + Security
Flagship: August 2026 authority guide
CTA: `Map what applies to your AI systems`
Current state: content strategy ready
Primary KPI: non-brand search + qualified site engagement
Pipeline assist: role/readiness demos

### DE-INV-001 — KI-Inventar Offensive

Market: Germany
Pain: fragmented KI inventory and accountability
CTA: `KI-Inventar ansehen`
Current state: strategy ready
Primary KPI: qualified German organic engagement
Pipeline: German demo requests where AI Inventory is selected pain

### FR-GOV-001 — Gouvernance Opérationnelle IA

Market: France
Pain: disconnected inventory / evidence / ownership
CTA: `Découvrir l’inventaire IA`
Current state: strategy ready

### ES-RIA-001 — AESIA/RIA to Operational Governance

Market: Spain
Pain: turning official guidance into operating process
CTA: `Explorar el inventario de IA`
Current state: strategy ready

### BRAND-001 — RISCK COMPLY Entity Normalization

Market: all
Pain: inconsistent brand/entity signals
Assets: LinkedIn profile cleanup, verified social profiles, later `sameAs`
Primary KPI: branded SERP quality / branded search growth
Current state: external execution required

### FOUNDER-001 — Operational AI Governance Category Creation

Market: Europe / English-first
Channel: Founder LinkedIn
Objective: create category memory and hidden-buyer influence
Primary KPI: relevant profile visits, site visits, saved/shared posts, qualified conversations
Pipeline metric: assisted demos/opportunities
Current state: ready for external execution

---

## 6. UTM governance

Canonical pattern:

`utm_source=<platform>`
`utm_medium=<organic_social|email|partner|referral|paid_social|paid_search>`
`utm_campaign=<campaign_id>`
`utm_content=<asset_variant>`
`utm_term=<keyword_or_audience_when_relevant>`

Examples:

Founder LinkedIn Article 50 post:

`utm_source=linkedin`
`utm_medium=organic_social`
`utm_campaign=EN-REG-002`
`utm_content=founder_post_article50_v1`

Germany inventory carousel:

`utm_source=linkedin`
`utm_medium=organic_social`
`utm_campaign=DE-INV-001`
`utm_content=company_carousel_inventory_v1`

Rules:

- never invent new naming in the middle of a campaign;
- use campaign ID exactly;
- visible translated CTA label does not change canonical `cta_id`;
- preserve first-touch and last-touch attribution separately;
- do not store PII in UTM parameters;
- do not place sensitive company/project details in URLs.

---

## 7. Weekly operating cadence

### Monday — Market + Pipeline Review

Review:

- active campaign status;
- content scheduled;
- search/regulatory changes;
- qualified leads by pain/market;
- demos and pipeline movement;
- lost/deferred reasons;
- blockers from Product/Enterprise release state.

Output:

- one primary weekly objective;
- one secondary experiment;
- content/distribution queue locked for the week.

### Tuesday — Authority Production

Create or finalize:

- flagship SEO asset;
- founder post;
- company derivative;
- carousel/visual brief;
- nurture asset.

One researched idea should be atomized before a second idea is researched from scratch.

### Wednesday — Distribution + Conversation

Publish / engage / outreach.

Founder role:

- publish useful POV;
- reply to relevant comments;
- join existing conversations where value can be added;
- no mass unsolicited pitching.

Company role:

- canonical resource / product proof.

### Thursday — Commercial Conversion

Review:

- demo requests;
- lead qualification;
- follow-up;
- Trust/procurement questions;
- target-account signals;
- content that can help an active deal.

### Friday — Learning Review

For each active campaign decide:

`SCALE / ITERATE / PAUSE / KILL`

Record:

- what happened;
- why we believe it happened;
- evidence strength;
- next action.

Do not explain every weak result with “need more impressions.”

---

## 8. KPI hierarchy

### Level 1 — Distribution diagnostics

- impressions
- reach
- followers
- engagement
- video completion

Useful for diagnosing creative/distribution, not success by themselves.

### Level 2 — Intent

- branded search
- profile visits
- site sessions
- guide views
- feature views
- pricing views
- Trust views
- template starts/downloads

### Level 3 — Commercial signal

- demo starts
- demo submissions
- signups
- checkout starts
- lead priority A/B rate
- security/procurement requests

### Level 4 — Pipeline

- qualified opportunities
- stage progression
- sales-assisted pipeline by market/pain/source
- self-service activation
- win/loss/deferred reasons

### Level 5 — Revenue

- customers
- subscription revenue
- ARR/MRR where finance definition is established
- CAC only after spend and attribution are trustworthy
- payback only after costs and revenue are trustworthy

Never promote a Level 1 metric to revenue evidence.

---

## 9. Source of truth

Until a dedicated CRM is connected and governed:

- GitHub marketing docs = strategy / campaign contract;
- Supabase sales leads = lead capture truth where configured;
- PostHog = behavioral truth after ingestion is proven;
- Stripe = billing/revenue truth after legitimate LIVE lifecycle is accepted;
- Search Console = organic search truth once verified;
- social platforms = distribution truth;
- Enterprise Control Tower = release/claim authority.

A HubSpot plugin is discoverable but is **not assumed connected**. If later connected, HubSpot may become the operational CRM while the above technical systems remain their respective sources of truth.

---

## 10. Marketing claim gate

Before publishing any substantive regulatory/product/trust claim:

1. identify source;
2. verify source freshness;
3. distinguish law/guidance from product capability;
4. confirm product capability in current repo/runtime where relevant;
5. avoid legal guarantee/certification claims;
6. record material exception or scope;
7. localize meaning, not merely words.

High-risk claim categories requiring extra review:

- legal obligations;
- dates/deadlines;
- fines;
- high-risk classification;
- provider/deployer status;
- security controls;
- certifications;
- uptime/SLA;
- penetration testing;
- customer results;
- integrations;
- revenue/ROI.

---

## 11. Decision rules

Scale when:

- the right audience is responding;
- downstream intent is increasing;
- qualified pipeline signal exists or the campaign has a clear strategic authority role;
- claim quality remains high;
- localization fit is proven.

Iterate when:

- topic is correct but hook/CTA/format is weak;
- engagement is relevant but commercial progression is weak;
- one market outperforms another for a plausible reason.

Pause when:

- release state makes the CTA unsafe;
- attribution is required but unavailable;
- source/legal context changes;
- asset truth becomes stale.

Kill when:

- repeated qualified tests show no useful audience response;
- topic attracts the wrong audience;
- campaign cannot plausibly contribute to authority, pipeline or learning.

---

## 12. Definition of done

```text
MARKETING_OPERATING_SYSTEM: READY
CAMPAIGN_OBJECT: DEFINED
CAMPAIGN_STATE_MACHINE: DEFINED
UTM_GOVERNANCE: DEFINED
WEEKLY_CADENCE: DEFINED
KPI_HIERARCHY: DEFINED
CLAIM_GATE: DEFINED
RELEASE_AWARE_MARKETING_MODE: DEFINED
CRM_READY: YES
CRM_CONNECTED: NOT_VERIFIED
MAIN_CHANGED: NO
```
