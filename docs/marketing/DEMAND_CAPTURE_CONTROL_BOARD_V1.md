# RISCK COMPLY — DEMAND CAPTURE CONTROL BOARD V1

Status: ACTIVE_OPERATING_BOARD_SPEC / PRELAUNCH_CONTROLLED
Checked: 2026-08-23

## 1. Purpose

Provide one compact execution board connecting the existing marketing assets to measurable buyer and pipeline outcomes.

This board is deliberately campaign-oriented rather than task-oriented.

One row should represent a commercially meaningful campaign or motion, not a tiny content task.

---

## 2. Status vocabulary

- `READY_EXTERNAL` — can execute without release-changing code
- `READY_RELEASE` — implementation prepared but waits for release window
- `LIVE` — currently distributed/published and measurable where instrumentation exists
- `LEARNING` — enough signal exists for review
- `BLOCKED_RELEASE` — dependent on release/production gate
- `BLOCKED_MEASUREMENT` — campaign economics cannot be trusted yet
- `BLOCKED_EXTERNAL` — requires human/external account action
- `SCALE`
- `ITERATE`
- `PAUSE`
- `KILL`

---

## 3. Seeded control board

| Campaign ID | Market | Core asset/motion | Buyer pain | Funnel | Primary CTA | Current status | Release dependency | Primary KPI when measurable | Pipeline signal |
|---|---|---|---|---|---|---|---|---|---|
| FOUNDER-001 | Europe/EN | Founder Operational AI Governance sequence | category confusion | Awareness | Explore RISCK COMPLY / relevant resource | READY_EXTERNAL | None for social | qualified profile/site visits | assisted demos/conversations |
| BRAND-001 | All | LinkedIn + entity normalization | low brand trust/consistency | Trust | Visit official site | BLOCKED_EXTERNAL | None | branded SERP quality | branded direct demand |
| EN-INV-001 | Europe/EN | AI Inventory wedge + template | spreadsheet inventory | Consideration | Get Inventory Template | READY_RELEASE | resource landing + attribution | qualified resource leads | inventory-led demos |
| EN-REG-002 | Europe/EN | Aug 2026 / Article 50 authority cluster | regulatory uncertainty | Awareness/Consideration | Map what applies | READY_RELEASE | SEO guide publication | qualified organic engagement | readiness demos |
| EN-ROLE-003 | Europe/EN | Provider vs Deployer | unclear role/accountability | Consideration | Map role per system | READY_RELEASE | guide publication | guide->feature progression | role/readiness demos |
| EN-EVD-004 | Europe/EN | Governance Evidence | audit/customer review | Consideration | Explore evidence workflow | READY_RELEASE | guide publication | evidence feature intent | evidence-led demos |
| DE-INV-001 | Germany | KI-Inventar offensive | fragmented inventory | Consideration | KI-Inventar ansehen | READY_EXTERNAL / READY_RELEASE | social now; SEO later | target-role engagement | German inventory demos |
| DE-REG-002 | Germany | AI Act + KI-MIG operational context | local implementation uncertainty | Awareness | Governance questions prüfen | READY_EXTERNAL / READY_RELEASE | social now; SEO later | German qualified engagement | German readiness demos |
| FR-GOV-001 | France | Gouvernance opérationnelle IA | spreadsheets / traceability | Consideration | Découvrir l’inventaire IA | READY_EXTERNAL / READY_RELEASE | social now; SEO later | French target-role engagement | French demos |
| ES-RIA-001 | Spain | AESIA/RIA operational bridge | official guidance -> execution | Awareness/Consideration | Explorar el inventario de IA | READY_EXTERNAL / READY_RELEASE | social now; SEO later | Spanish qualified engagement | Spanish readiness demos |
| CRO-001 | All | Intent-routed homepage/pricing/demo | visitor path mismatch | Conversion | contextual | BLOCKED_RELEASE | release-changing CRO PR | demo/signup conversion | qualified lead rate |
| ATTR-001 | All | PostHog + UTM attribution | unknown source-to-pipeline | Measurement | n/a | BLOCKED_RELEASE | analytics mega PR | event ingestion + funnel integrity | attributed pipeline |
| TRUST-001 | All/Enterprise | Trust as commercial proof | procurement/security friction | Conversion | Review Trust / procurement | READY_EXTERNAL / BLOCKED_RELEASE | current Trust usable; enhanced CTAs later | Trust-assisted demos | procurement progression |
| NURTURE-001 | All | Inventory lead nurture | early-stage education | Nurture | Explore Inventory / Demo | READY_EXTERNAL_CONCEPT | delivery/CRM tooling | progression by buyer state | requalified leads |
| SALES-001 | All | Operational Governance Demo | high-intent buying evaluation | Sales | agreed next step | READY_EXTERNAL | none beyond claim boundaries | demo->next-step rate | opportunity creation |
| PARTNER-001 | Europe | Consultant/adviser hypothesis | client governance operations | Channel | Partner conversation | READY_EXTERNAL | None | qualified partner discussions | influenced/referral pipeline |
| PAID-SEARCH-001 | EN/DE first | High-intent search test | active solution demand | Acquisition | Pricing/Demo | BLOCKED_RELEASE + BLOCKED_MEASUREMENT | Production GO + attribution + legal/billing | qualified conversions | paid pipeline |
| PAID-LI-001 | Europe | Narrow LinkedIn test/retargeting | category/problem awareness | Acquisition | resource/demo | BLOCKED_RELEASE + BLOCKED_MEASUREMENT | consent + Production GO + attribution | qualified conversions | paid pipeline |

---

## 4. What can execute now

### Founder / organic

Execute now:

- FOUNDER-001
- market-specific social derivatives from DE-INV-001, DE-REG-002, FR-GOV-001, ES-RIA-001
- evidence-first/company authority posts
- sales conversations driven by existing safe product truth

### Brand

Execute now externally:

- LinkedIn company-name cleanup;
- About/tagline/category cleanup;
- historical claim cleanup where platform controls allow;
- verify official profile ownership.

### Sales

Execute now:

- SALES-001 demo playbook;
- B2B qualification model manually;
- buying-group mapping;
- objection handling;
- competitive battlecard;
- lost/deferred reason capture.

### Partner discovery

Execute now:

- limited conversations with advisers/consultancies;
- validate whether they need a structured operating workspace for client governance;
- do not announce partnerships before mutual confirmation.

---

## 5. What waits for release

### Website publication package

Release-dependent:

- authority guides;
- AI Inventory lead magnet landing;
- CTA routing;
- Trust brand normalization in code;
- structured-data `sameAs` after external profile verification;
- internal linking and sitemap updates;
- local market SEO pages where new routes are required.

### Attribution package

Release-dependent:

- `landing_view`
- `pricing_view`
- `feature_view`
- `trust_view`
- `resource_view`
- `cta_clicked`
- `demo_started`
- `demo_submitted`
- UTM persistence
- source -> lead/signup/checkout linkage

### Paid

Blocked until required gates pass.

---

## 6. Campaign review template

For every campaign review record:

### Hypothesis

What did we expect?

### Observed signal

What actually happened?

### Audience quality

Were the people in our ICP / buying group?

### Funnel movement

Did anyone move from awareness to feature/resource/pricing/demo/Trust?

### Pipeline movement

Did this create or assist qualified opportunity movement?

### Confidence

- LOW — anecdotal / tiny sample
- MEDIUM — repeated directional signal
- HIGH — stable signal with sufficient attributed data

### Decision

`SCALE / ITERATE / PAUSE / KILL`

### Next action

One concrete next action only.

---

## 7. Weekly dashboard

Use a compact weekly view:

```text
MARKETING_MODE=
PRODUCTION_GO=
ACTIVE_CAMPAIGNS=
CAMPAIGNS_LIVE=
CAMPAIGNS_BLOCKED_RELEASE=
CAMPAIGNS_IN_LEARNING=

TOP_MARKET_SIGNAL=
TOP_PAIN_SIGNAL=
TOP_ASSET_SIGNAL=

NEW_LEADS=
PRIORITY_A_B_LEADS=
DEMOS_REQUESTED=
DEMOS_COMPLETED=
QUALIFIED_OPPORTUNITIES=
PROCUREMENT_REVIEWS=
NEW_CUSTOMERS=

ATTRIBUTION_CONFIDENCE=
PRIMARY_BLOCKER=
WEEK_DECISION=
```

Unknown metrics should say `NOT_VERIFIED`.

---

## 8. Anti-task-spam rule

Do not create a separate campaign object for:

- each social post;
- each translation;
- each image;
- each internal link;
- each CTA text variation.

Those are execution assets inside a campaign.

A new campaign exists only when at least one changes materially:

- market;
- buyer problem;
- target persona;
- funnel objective;
- commercial hypothesis.

---

## 9. Definition of done

```text
DEMAND_CAPTURE_BOARD: SEEDED
ACTIVE_CAMPAIGNS_DEFINED: YES
EXECUTE_NOW_SET: DEFINED
RELEASE_BLOCKED_SET: DEFINED
PAID_BLOCKED_SET: DEFINED
CAMPAIGN_REVIEW_PROTOCOL: DEFINED
WEEKLY_DASHBOARD: DEFINED
ANTI_TASK_SPAM: ENFORCED
MAIN_CHANGED: NO
```
