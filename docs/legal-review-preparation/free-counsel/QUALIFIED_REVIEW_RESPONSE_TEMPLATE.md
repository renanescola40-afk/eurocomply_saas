# RISCK COMPLY — Qualified Review Response Template

**Status:** `HUMAN_COMPLETION_REQUIRED`  
**Purpose:** provide a short, low-effort response format for a qualified pro bono / clinic reviewer.  
**This blank template has no legal effect.**

A reviewer may complete only the sections/workstreams within their professional scope. Partial review is useful evidence but does not create full `LEGAL_8_OF_8` credit.

---

## A. Reviewer identity and professional scope

- Reviewer full name:
- Organisation / law firm / clinic:
- Professional title:
- Bar / professional registration (if applicable):
- Jurisdiction(s):
- Qualification / subject-matter scope relevant to this review:
- Supervising lawyer (if a university/student clinic):
- Conflict check completed: `YES / NO / NOT_APPLICABLE / EXPLAIN`
- Independence / relationship to RISCK COMPLY:
- Contact / attributable professional email:

## B. Review binding and substantive review scope

- Product: RISCK COMPLY
- Repository: `renanescola40-afk/eurocomply_saas`
- Exact product SHA reviewed:
- Evidence-package / bundle digest reviewed:
- **Substantive review scope actually performed (product/features/evidence/workstreams):**
- **Repository materials / evidence actually reviewed:**
- Workstream IDs actually reviewed:
- Review start date:
- Decision date:
- Valid from:
- Valid until (if any):
- Material-change triggers requiring re-review:
  -
  -

The substantive review-scope field above is a required human assertion. It must describe what was actually reviewed; RISCK COMPLY must not infer it from the reviewer's qualifications, job title, the package sent, or silence.

If the reviewer did not inspect source code directly, identify the repository documents/evidence relied upon and state that limitation explicitly.

## C. Decision vocabulary

Use one of these values for each item:

- `ACCEPTED` — acceptable within stated scope/assumptions;
- `ACCEPTED_WITH_CHANGES` — specified changes required before final credit;
- `CHANGES_REQUIRED` — not yet acceptable; corrections required;
- `REJECTED` — material blocking issue;
- `OUTSIDE_SCOPE` — another specialist/jurisdiction/evidence source is required.

`ACCEPTED_WITH_CHANGES` and `CHANGES_REQUIRED` do not create final internal acceptance until the changes are implemented, verified and the reviewer confirms the resulting release/package where required.

---

# D. Eight canonical workstream decisions

For every workstream receiving a substantive decision, the reviewer should ensure that Section B's review scope expressly covers that workstream and the evidence relied upon.

## 1. Legal rules / applicability

**ID:** `legal-rules`

**Decision:**

**Question:** Are the legal-source mapping, applicability dates, role assumptions and operational limitations defensible for the intended product scope?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 2. Prohibited practices

**ID:** `prohibited-practices`

**Decision:**

**Question:** Does the product correctly identify and escalate prohibited-practice risk without turning exceptions or incomplete facts into automatic approval?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 3. Article 50 transparency

**ID:** `article-50-copy`

**Decision:**

**Question:** Are the transparency triggers, role allocation, notices, timing, localisation and public/in-product wording appropriate for the current AI-enabled functionality?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 4. FRIA methodology

**ID:** `fria-methodology`

**Decision:**

**Question:** Is the FRIA workflow a defensible assistance methodology with sufficient boundaries so that the customer remains responsible for its legal assessment and required actions?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 5. Deployer obligations

**ID:** `deployer-obligations`

**Decision:**

**Question:** Are deployer duties correctly allocated between RISCK COMPLY and customers, with adequate escalation and limitations?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 6. High-risk provider methodology

**ID:** `high-risk-provider`

**Decision:**

**Question:** Could any reviewed feature make RISCK COMPLY a high-risk AI-system provider/downstream provider, and are intended-purpose, integration and substantial-modification boundaries correctly represented?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 7. Conformity / CE / registration

**ID:** `conformity`

**Decision:**

**Question:** Are conformity-assessment, technical-documentation, CE/registration and official-body boundaries correctly represented for a compliance-support SaaS?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

## 8. GPAI workflow

**ID:** `gpai`

**Decision:**

**Question:** For reviewed third-party model integrations, are GPAI-provider / AI-system-provider / downstream-provider roles and documentation obligations correctly represented?

**Findings / reasons:**

- 

**Required changes / conditions:**

- 

**Items outside scope:**

- 

---

# E. Global product decisions

These global items are required by the final RISCK COMPLY legal-publication acceptance contract. A reviewer may mark an item `OUTSIDE_SCOPE` if another reviewer must decide it.

- Intended purpose: `DECISION + COMMENT`
- Product/operator roles: `DECISION + COMMENT`
- Launch position / limitations: `DECISION + COMMENT`
- Contract pack: `DECISION + COMMENT`
- Privacy / DPA / transfer/subprocessor representation: `DECISION + COMMENT`
- Public / in-product legal claims: `DECISION + COMMENT`
- Partner-counsel / independence model: `DECISION + COMMENT`

## F. Blocking changes

List every issue that must be corrected before the reviewer would permit final reliance:

1. 
2. 

If none, write `NONE`.

## G. Non-blocking recommendations

1. 
2. 

## H. Reliance and limitations

- Who may rely on this review:
- Permitted purpose of reliance:
- Geographic/jurisdictional limits:
- Customer/use-case exclusions:
- Technical/external-specialist matters excluded:
- Other assumptions/limitations:

## I. Final reviewer statement

> I confirm that the decisions above reflect the substantive review scope I personally performed as stated in Section B, within my stated professional scope, assumptions and limitations, and are bound to the product/evidence identified there. I have identified any matters requiring another specialist or further evidence as `OUTSIDE_SCOPE` rather than treating them as accepted.

- Reviewer name:
- Date:
- Signature / digital signature / attributable professional authentication:

---

## Internal RISCK COMPLY processing notice

On receipt, RISCK COMPLY must:

1. verify reviewer identity/qualification as far as reasonably possible;
2. retain the original attributable artifact privately;
3. verify exact SHA/digest binding;
4. preserve the reviewer's own substantive `reviewScope` assertion for each accepted workstream rather than infer scope internally;
5. route all required changes;
6. re-submit changed items where final confirmation is required;
7. record only genuinely accepted canonical workstreams;
8. never infer acceptance from silence or informal conversation.

```text
BLANK_TEMPLATE=NON_CREDITING
HUMAN_SIGNED_RESPONSE=EVIDENCE_CANDIDATE
LEGAL_8_OF_8_CREDIT=ONLY_AFTER_INTERNAL_ACCEPTANCE_CONTRACT_IS_SATISFIED
```
