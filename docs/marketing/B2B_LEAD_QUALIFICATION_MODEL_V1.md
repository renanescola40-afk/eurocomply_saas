# RISCK COMPLY — B2B LEAD QUALIFICATION MODEL V1

Status: READY_FOR_SALES_MARKETING_EXECUTION / DO_NOT_MERGE_DURING_RELEASE_FREEZE
Checked: 2026-08-23

## Objective

Turn demo submissions into prioritized B2B opportunities using fields the product already captures or can capture safely.

This is a commercial prioritization model, not a claim about customer quality, intent or probability of purchase.

## 1. Qualification dimensions

Score four dimensions separately:

1. FIT — does the organization resemble the current ICP?
2. PAIN — is there a concrete AI-governance operating problem?
3. TIMING — is there a near-term trigger?
4. COMPLEXITY — does the use case justify a governed platform rather than a simple spreadsheet?

Do not infer protected or sensitive characteristics.

---

## 2. FIT score — 0 to 30

### Company size

- 1–10: 3
- 11–50: 8
- 51–200: 15
- 201–1000: 20
- 1000+: 18

The initial commercial sweet spot is approximately 50–1000 employees; larger enterprise can still be highly valuable but may require longer procurement and stronger evidence.

### Relevant buyer role

High-fit roles +10:

- AI Governance / Responsible AI
- Compliance
- Legal / Privacy / DPO
- Security / GRC
- Procurement / Vendor Risk
- CTO / Head of AI / Engineering leadership

Executive sponsor +8:

- CEO / COO / CFO / CRO or equivalent when governance trigger is explicit

Other role +3 until intent is better understood.

Maximum FIT: 30.

---

## 3. PAIN score — 0 to 30

Recommended demo drivers and points:

- AI system inventory / Shadow AI: +10
- EU AI Act readiness: +10
- AI risk assessment / classification workflow: +8
- Article 50 / transparency: +7
- provider vs deployer role mapping: +7
- AI governance evidence / audit preparation: +10
- vendor AI risk / procurement: +9
- policy / controlled documentation: +6
- customer security / procurement review: +8
- board request / executive governance visibility: +9

Cap at 30.

Pain signals in `currentProcess`:

- spreadsheets / Excel / Google Sheets: +4
- Notion / Drive / email as primary governance system: +4
- multiple disconnected tools: +5
- existing GRC but AI process outside it: +5
- no inventory / not sure what is used: +5

Cap total PAIN at 30.

---

## 4. TIMING score — 0 to 20

- This month: 20
- 1–3 months: 15
- 3–6 months: 8
- Exploring: 3

Strong trigger may add up to +5 but total remains capped at 20:

- active customer procurement request;
- audit/review deadline;
- board request;
- policy rollout;
- new AI deployment requiring governance review.

---

## 5. COMPLEXITY score — 0 to 20

Add a future form field:

`How many AI systems or use cases are currently in scope?`

Suggested score:

- 1–10: 3
- 11–25: 7
- 26–100: 12
- 101–250: 16
- 251+: 20
- Not yet known: 5

Additional complexity signals, capped at 20 total:

- multiple countries: +4
- multiple departments: +4
- vendor/procurement review required: +4
- multi-team approvals: +4
- evidence handoff to customers/auditors: +4

---

## 6. Composite qualification score

```text
QUALIFICATION_SCORE = FIT + PAIN + TIMING + COMPLEXITY
MAX = 100
```

Suggested bands:

### 80–100 — SALES PRIORITY A

Likely enterprise or high-intent Business opportunity.

Route:

- fast human review;
- demo tailored to stated pain;
- Trust Center / security material before or immediately after call;
- identify procurement/legal blockers early.

### 60–79 — SALES PRIORITY B

Strong fit or pain, but timing/complexity may be lower.

Route:

- demo;
- relevant feature proof;
- AI Inventory Template or targeted regulatory guide;
- nurture if timing is not immediate.

### 40–59 — NURTURE / SELF-SERVICE EVALUATION

Route based on plan fit:

- Essential/Professional exploration;
- resource lead magnet;
- feature education;
- re-score when product activity or new trigger appears.

### 0–39 — EDUCATION / LONG-TERM NURTURE

Do not waste sales capacity.

Route to:

- guides;
- templates;
- newsletter;
- regulatory updates.

---

## 7. Plan-routing heuristic

This is a commercial heuristic only; pricing/billing truth remains canonical.

### Essential

Typical indicators:

- small team;
- first inventory;
- 1–25 AI systems;
- one organization;
- limited procurement complexity.

### Professional

Typical indicators:

- structured readiness work;
- 10s–100s of systems;
- recurring reviews/evidence;
- one organization;
- dedicated compliance/governance owner.

### Business

Typical indicators:

- multi-team workflow;
- procurement/vendor assurance;
- approvals/tasks;
- multiple organizations or complex ownership;
- assisted rollout valuable.

### Enterprise

Typical indicators:

- security/procurement diligence;
- contract requirements;
- SSO/SCIM/RBAC requirements;
- 1000+ systems or negotiated capacity;
- multiple legal entities / teams / jurisdictions;
- formal evidence and support expectations.

---

## 8. Recommended demo-form changes

Replace generic-first checkbox order with AI-governance-first order:

1. AI system inventory
2. EU AI Act readiness
3. AI risk assessment
4. AI governance evidence / audit readiness
5. AI vendor risk / procurement
6. Article 50 / transparency
7. Provider / deployer role mapping
8. Policies / controlled documentation
9. Customer / board / security review
10. GDPR / DPA where relevant

Add:

- number of AI systems/use cases;
- number of teams involved (optional);
- procurement/security review required? yes/no/not sure.

Do not require every field. Conversion quality should improve without turning the form into a questionnaire marathon.

---

## 9. Sales-call personalization map

If primary pain is AI Inventory:

Show:

- system register;
- owner/provider/use-case context;
- evidence gaps;
- review lifecycle.

If primary pain is EU AI Act readiness:

Show:

- inventory first;
- role/risk context;
- review/evidence workflow;
- avoid automatic legal-classification claims.

If primary pain is Vendor AI Risk:

Show:

- provider records;
- linked systems/use cases;
- evidence requests;
- procurement workflow.

If primary pain is Audit/Customer Review:

Show:

- evidence pack;
- activity history;
- Trust Center;
- ownership and review state.

If primary pain is multi-team governance:

Show:

- assignments;
- tasks;
- approval/review states;
- organization boundaries;
- Enterprise path where appropriate.

---

## 10. Qualification analytics

Track only non-sensitive business classification values in marketing analytics.

Allowed examples:

- company_size_band
- ai_system_count_band
- primary_pain
- timeline_band
- plan_interest
- locale
- market
- lead_priority_band

Do not send:

- person name;
- email;
- company name;
- free-text message;
- sensitive business content.

PII stays in the lead system.

---

## 11. Metrics

Primary:

- demo submission rate;
- Priority A/B lead rate;
- demo-to-qualified-opportunity rate;
- qualified opportunity by source/market/content;
- time-to-follow-up for Priority A;
- pricing-to-demo vs pricing-to-self-service conversion;
- lead-to-customer when revenue attribution becomes live.

Secondary:

- AI Inventory as primary pain share;
- EU AI Act readiness share;
- market distribution DE/FR/ES/EN;
- company-size distribution;
- timing distribution.

Do not optimize purely for form volume.

---

## 12. Current decision

```text
LEAD_CAPTURE_FOUNDATION: EXISTS
AI_GOVERNANCE_QUALIFICATION: NEEDS_ALIGNMENT
QUALIFICATION_MODEL: READY
PLAN_ROUTING_MODEL: READY
SALES_PRIORITY_MODEL: READY
LIVE_SCORING: NOT_IMPLEMENTED
ATTRIBUTED_PIPELINE: NOT_LIVE
```
