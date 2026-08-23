# RISCK COMPLY — CRM & REVENUE DATA CONTRACT V1

Status: READY_FOR_TOOLING / CRM_NOT_CONNECTED
Checked: 2026-08-23

## 1. Objective

Define the minimum commercial data model needed to connect marketing activity to leads, opportunities and revenue without allowing a CRM to become a second source of truth for billing, product behavior or release status.

A HubSpot connector is discoverable in the available plugin catalog, but this document does not assume it is installed or connected.

The model should work in HubSpot, another CRM, or a lightweight interim pipeline.

---

## 2. Source-of-truth boundaries

### CRM

Owns:

- contact/company relationship;
- lead stage;
- opportunity/deal stage;
- next commercial action;
- sales notes;
- buying group;
- qualification band;
- lost/deferred reason;
- commercial owner.

### Supabase lead system

Owns the captured inbound lead record where configured.

### PostHog

Owns privacy-safe behavioral events after ingestion is verified.

### Stripe

Owns payment/subscription truth after the legitimate LIVE lifecycle is accepted.

### Search Console

Owns organic search query/page data once verified.

### GitHub / Enterprise Control Tower

Owns product/release/claim authority.

The CRM must not turn a sales note such as “security ready” into a product security claim.

---

## 3. Company fields

Required:

- `company_name`
- `company_domain`
- `company_size_band`
- `primary_market`
- `countries_in_scope`
- `industry` when provided / legitimately enriched
- `ai_system_count_band`
- `governance_maturity_band`
- `primary_pain`
- `current_process`
- `procurement_required`
- `security_review_required`
- `legal_review_required`
- `multi_team_governance`
- `source_campaign_first`
- `source_campaign_last`

Do not infer sensitive traits.

Suggested governance maturity values:

- `NO_INVENTORY`
- `SPREADSHEET_REGISTER`
- `PARTIAL_WORKFLOW`
- `GRC_WITH_AI_GAP`
- `STRUCTURED_GOVERNANCE`
- `NOT_VERIFIED`

---

## 4. Contact fields

Required:

- name
- work email
- role/title
- buying-group role
- locale/language
- consent/contact status where applicable
- first source
- last source
- first campaign
- last campaign

Buying-group-role values:

- `CHAMPION`
- `DECISION_MAKER`
- `LEGAL_REVIEWER`
- `SECURITY_REVIEWER`
- `PROCUREMENT`
- `TECHNICAL_REVIEWER`
- `FINANCE`
- `EXECUTIVE_SPONSOR`
- `BUSINESS_OWNER`
- `UNKNOWN`

A person may have multiple roles in a small company; store the commercially useful classification without pretending certainty.

---

## 5. Lead fields

Required:

- `lead_id`
- `created_at`
- `market`
- `locale`
- `first_landing_path`
- `last_landing_path`
- `first_referrer_domain`
- `last_referrer_domain`
- `first_utm_source`
- `first_utm_medium`
- `first_utm_campaign`
- `first_utm_content`
- `last_utm_source`
- `last_utm_medium`
- `last_utm_campaign`
- `last_utm_content`
- `primary_pain`
- `secondary_pains`
- `timeline_band`
- `company_size_band`
- `ai_system_count_band`
- `qualification_score`
- `qualification_band`
- `lead_status`
- `next_action`
- `next_action_date`

Qualification bands from the existing model:

- `A_80_100`
- `B_60_79`
- `NURTURE_40_59`
- `EDUCATION_0_39`

Do not expose raw qualification score to prospects as if it were an objective assessment of their company.

---

## 6. Opportunity / deal fields

Required:

- `opportunity_id`
- `company`
- `primary_contact`
- `champion`
- `buying_group_known`
- `stage`
- `primary_pain`
- `market`
- `plan_interest`
- `estimated_scope`
- `procurement_status`
- `security_status`
- `legal_status`
- `technical_fit_status`
- `commercial_next_step`
- `next_step_date`
- `source_campaign_first`
- `source_campaign_last`
- `content_assists`
- `lost_or_deferred_reason`
- `closed_date`

Do not fabricate expected contract value before there is a legitimate commercial basis.

---

## 7. Canonical pipeline stages

1. `NEW_LEAD`
2. `QUALIFIED_OR_NURTURE`
3. `DEMO_SCHEDULED`
4. `DEMO_COMPLETED`
5. `SOLUTION_FIT_CONFIRMED`
6. `SECURITY_PROCUREMENT_REVIEW`
7. `COMMERCIAL_PROPOSAL_OR_CHECKOUT`
8. `CONTRACT_OR_PAYMENT_PENDING`
9. `CUSTOMER`
10. `CLOSED_LOST_OR_DEFERRED`

Stage exit criteria matter more than labels.

### Demo completed -> Solution fit confirmed

Require:

- operating pain understood;
- use case fits verified product scope;
- buyer agrees there is a meaningful next step;
- key obvious blockers captured.

### Solution fit -> Security/procurement

Use when a buyer genuinely enters trust/security/legal/procurement review.

Do not advance simply because a Trust link was sent.

### Commercial proposal -> Customer

Customer requires legitimate accepted commercial/billing/contract outcome.

No synthetic lifecycle event may create a customer stage.

---

## 8. Lost/deferred taxonomy

Use one primary reason:

- `NO_PRIORITY`
- `NO_BUDGET`
- `TIMING_DELAYED`
- `SPREADSHEET_SUFFICIENT`
- `EXISTING_GRC_SUFFICIENT`
- `INTERNAL_BUILD`
- `MISSING_FEATURE`
- `SECURITY_REQUIREMENT`
- `LEGAL_PROCUREMENT_BLOCKER`
- `PRODUCT_MATURITY_CONCERN`
- `TRUST_COMPANY_MATURITY`
- `COMPETITOR_SELECTED`
- `NO_RESPONSE`
- `NOT_ICP`
- `OTHER_VERIFIED`

Never infer “price” when the real reason is unknown.

---

## 9. Content-assist model

A B2B opportunity may have many content assists.

Record campaign/asset touches such as:

- Article 50 guide
- AI Inventory Template
- AI Inventory feature
- Trust Center
- pricing
- founder post
- Germany KI-Inventar post
- AESIA/RIA guide
- evidence guide

Do not assign 100% credit to the last click simply because attribution tooling makes it convenient.

Use two lenses:

- first-touch demand creation;
- last-touch conversion assist.

Later, when volume is sufficient, evaluate multi-touch patterns without pretending causal certainty.

---

## 10. Marketing-to-sales handoff

A qualified handoff packet should contain:

```text
COMPANY=
ROLE=
MARKET=
PRIMARY_PAIN=
CURRENT_PROCESS=
AI_SYSTEM_COUNT_BAND=
TIMELINE=
QUALIFICATION_BAND=
FIRST_CAMPAIGN=
LAST_CAMPAIGN=
KEY_CONTENT_ASSISTS=
TRIGGER=
KNOWN_BUYING_GROUP=
PROCUREMENT_SECURITY_REQUIREMENT=
RECOMMENDED_DEMO_PATH=
NEXT_ACTION=
```

This makes the demo useful from minute one.

---

## 11. CRM automation boundaries

Safe automation candidates after a CRM is connected:

- create/update contact from legitimate lead capture;
- create company association;
- classify lead source/market;
- enroll low-intent resource leads into appropriate nurture;
- alert sales on Priority A/B inbound lead;
- create follow-up task after demo;
- flag stale opportunities;
- report stage movement.

Do not automate:

- legal conclusions;
- security approval;
- customer status from unverified events;
- qualification based on sensitive traits;
- competitor-selection reasons without evidence;
- mass outreach without appropriate legal/commercial controls.

---

## 12. Minimum dashboards after tooling exists

### Marketing dashboard

- leads by campaign/market/pain
- Priority A/B lead share
- demos by campaign
- attributed opportunities
- content assists

### Sales dashboard

- new A/B leads
- demos scheduled/completed
- opportunities by stage
- stale next steps
- procurement/security reviews
- lost/deferred reasons

### Revenue dashboard

Only when payment truth is live:

- new customers
- revenue by source/market
- paid vs organic contribution
- conversion by plan/motion

No CAC/LTV conclusions until spend, attribution and revenue data are sufficiently trustworthy.

---

## 13. HubSpot readiness

A HubSpot plugin is currently discoverable as an installable option.

If connected later, implementation should map this contract into:

- Company properties
- Contact properties
- Lead/deal properties
- Pipelines/stages
- Tasks
- Lists/workflows
- dashboards

Do not install or mutate CRM state merely because the connector exists. Connection and write actions require explicit operational use.

---

## 14. Definition of done

```text
CRM_DATA_CONTRACT: READY
PIPELINE_STAGE_CONTRACT: READY
BUYING_GROUP_MODEL: READY
CONTENT_ASSIST_MODEL: READY
LOST_REASON_MODEL: READY
MARKETING_SALES_HANDOFF: READY
CRM_AUTOMATION_BOUNDARIES: READY
HUBSPOT_PLUGIN_DISCOVERED: YES
HUBSPOT_CONNECTED: NO_ASSUMPTION
MAIN_CHANGED: NO
```
