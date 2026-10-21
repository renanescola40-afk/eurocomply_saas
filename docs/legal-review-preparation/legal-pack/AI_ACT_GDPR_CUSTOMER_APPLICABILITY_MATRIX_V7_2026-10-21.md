# RISCK COMPLY — EU AI Act & GDPR Customer Applicability and Responsibility Matrix (V7)

**Status:** CUSTOMER-REVIEW / NON-BINDING COMPLIANCE EXPLANATION / HUMAN DETERMINATION REQUIRED  
**Prepared:** 2026-10-21. Source baseline: main `70d3545f414d063379d481fd238aed563e05edda`.  
**Regulatory scope:** European Union / Portugal; contractual sales outside the EU may still involve EU-scope activities.  
**System scope:** RISCK COMPLY B2B AI-governance, inventory, assessment, documentation and audit-evidence workflow product.  
**Important:** A workflow feature is not regulatory approval. A source-coded feature is not itself evidence that the same feature is deployed, runtime-tested or externally accepted at the customer's contract SHA.

## Executive interpretation

RISCK COMPLY is **software for customers to organise evidence and governance decisions**, not a substitute for a customer's legal advisor, regulator, conformity-assessment body, DPO, internal auditor or required human oversight. Source documentation at the baseline has not attributed a direct customer-facing model invocation to the SaaS runtime; the product should not automatically be treated as the *provider of the customer's inventoried AI systems*. This is an evidence-bounded product-scope observation requiring reclassification if actual AI capabilities change.

The EU AI Act applies based on the **specific AI system, intended purpose, legal role, lifecycle event, location and statutory transition**. A customer's use of the platform does **not** automatically satisfy their AI Act obligations or confer a high-risk/non-high-risk conclusion.

## 1. AI Act customer-role and applicability matrix

| Domain / reference | Principal applicability rule and current deadline | RISCK COMPLY software support / limit | Customer's non-delegable or separately contracted task |
| --- | --- | --- | --- |
| Scope / definitions — Arts 2–3 | Determine whether a specific technology is an AI system and whether EU territorial/subject-matter rules apply | Record use case and system facts; proposed classifications require review | Document intended purpose, geographic activity, exemptions and actual AI-system facts |
| AI inventory / governance | System inventory is a practical governance tool; no claim of a universal freestanding statutory inventory obligation for every minimal-risk AI use | AI-system inventory, owner and evidence workflows are documented | Maintain complete, accurate list and controls applicable to actual business and sector |
| AI literacy — Art 4 (as amended) | Relevant rules were first applicable from 2025-02-02; the 2026 amendments must be considered for the nature/extent of obligations | Store training and human-governance evidence | Set proportionate training/governance policies under current law; verify any amended obligation |
| Prohibited practices — Art 5 | Core prohibitions apply from 2025-02-02; certain 2026-added prohibitions commence 2026-12-02 | Screening, risk and escalation evidence supported in design; not a legal exemption engine | Decide whether exact prohibition, exception and context applies; stop prohibited uses |
| General-purpose AI models — Chapter V | Certain provider obligations from 2025-08-02, subject to transitional provisions | Record model-provider/vendor evidence; no automatic assessment of third-party provider conformity | Determine whether organisation is a GPAI model provider or another role; obtain actual provider materials |
| Transparency — Art 50 | Generally applicable from 2026-08-02; narrow Art 50(2) transition may run to 2026-12-02 | Store disclosures and transparency decisions; no statement that all content is automatically labelled | Assess interactive AI, synthetic media, deepfakes, emotion recognition or biometric categorisation conditions and implement notices/marking |
| High-risk classification — Arts 6–7, Annexes I/III | Depends on product and use case; Annex III obligation date 2027-12-02; Annex I 2028-08-02 under 2026/1744 | Risk-classification and evidence templates assist review | Identify legal role, exact annex use, exclusions/derogations and legal consequences |
| High-risk provider duties — Arts 9–17 and related requirements | For applicable high-risk systems on relevant effective date | Evidence workspace for risk management, data governance, technical documentation, logs, quality management and controls where configured | Operate and evidence required provider risk/data/QMS/processes, human oversight and conformity routes |
| High-risk registration / conformity — Chapter III | Applicable only by exact system/role and transition | Document tasks and links to evidence; cannot register or certify a customer merely by workflow completion | Make applicable official registrations, conformity assessment, CE marking and declarations through lawful channels |
| High-risk deployer duties — Art 26 and related | Exact legal duty and applicable high-risk date depend on system/use | Support asset assignment, instructions, logging and human-review records | Implement operation, competent human oversight, monitoring, log controls and any authority/individual notices |
| Fundamental-rights impact assessment (FRIA) — Art 27 | May be required for certain deployers/high-risk contexts when relevant obligations apply | Draft assessment documentation/evidence lifecycle | Assess actual impacted persons, intended use, governance, mitigation and any procedural obligations |
| Significant modification / role change | A business changing purpose/modifying an AI system may assume provider obligations | Change record/evidence | Re-assess legal status after changes or new system deployment |
| Third-country activity | Some non-EU actors can fall within AI Act scope based on placement, use or output in the EU | International inventory and assessment context | Determine relevant EU territorial scope and representative/importer obligations where applicable |

**Classification distinction:** Minimal/limited/high/prohibited labels used by a product are navigation aids; the law must be applied to the facts. "Prohibited" is not a fourth identical regulatory tier in the high-risk provider conformity regime. No automatic legal classification is warranted by the UI.

## 2. GDPR / privacy duties and processing-role matrix

| Topic / statutory anchor | RISCK COMPLY role and potential controls | Customer/controller obligation | Contract/proof state |
| --- | --- | --- | --- |
| Roles — Arts 4, 24, 28 | Intends to be processor/subprocessor for customer-instructed workspace personal data; may independently control provider-side commercial, account, billing or selected security purposes | Determine and document roles for each flow; cannot contractually relabel facts | Draft role matrix / customer-specific final allocation PENDING |
| Lawful basis and special categories — Arts 6, 9, 10 | Platform stores customer-directed records; not a default lawful basis for processing sensitive content | Identify valid legal basis, any Art 9/10 conditions, purpose/minimisation, data source and DPIA if relevant | Buyer-specific evidence PENDING |
| Transparency notices — Arts 12–14 | Draft provider Privacy Notice exists for own controller activities; not currently effective in latest internal publication evidence | Inform data subjects for the controller's own processing and vendor relationships | Provider final notice PENDING identity/facts |
| Records — Art 30 | Internal processing inventory/ROPA evidence exists | Maintain own ROPA where required and accurate processing purposes/vendors/transfers | Internal documentation exists; current buyer-specific ROPA PENDING |
| Article 28 DPA | Draft obligations, processing annex, TOM schedule and vendor review framework available | Execute/approve applicable controller-processor agreement and lawful instructions | NOT EXECUTED by this review; annexes customer-specific |
| Security — Art 32 | Auth, tenant-scope RBAC/RLS, protected docs, audit and release-control designs documented | Select processor with appropriate guarantees, protect its own users/configuration and verify required safeguards | Implementation/source documented; exact current release acceptance separate |
| Breaches — Arts 33–34 | As processor: notify customer/controller without undue delay; preserve/assist with facts; where independent controller, assess own reporting duties | Controller evaluates supervisory authority notice within 72h where legally required, and data-subject notices | Incident runbooks DOCUMENTED; specific contractual operational metrics PENDING |
| Subject rights — Arts 12–22 | DSR request/export/delete support workflows documented, subject to legal exceptions and tenant authority | Decide validity, identity, deadlines, exemptions and responses, with processor assistance | Technical structure present; case-specific decision OPEN |
| DPIA and prior consultation — Arts 35–36 | Provide relevant evidence and assistance as processor to extent available | Perform DPIA/prior consultation when required; AI Act FRIA is not the same legal test | Customer case-specific |
| DPO — Arts 37–39 | Internal DPO screening structure; no universal claim that appointment always mandatory for every SaaS | Determine own statutory need for DPO and publish contact where appointed | Appointment applicability NOT FINAL |
| Subprocessors — Art 28(2)-(4) | Maintain prior authorisation/change notice and contractual flow-down where relevant | Review/authorise agreed subprocessors and objection process | Active provider register; certain entity/config facts OPEN |
| International transfers — Chapter V | Account/flow transfer inventory; not all hosting/access necessarily EU-only | Validate export/importer roles, adequacy or safeguards, SCC modules and supplementary measures where required | Transfer register exists; final flow conclusions PARTIAL |
| Retention / deletion — Arts 5, 17, 28 | Category-specific retention and technical DSR workflows; provider-managed copies and legal holds impose nuances | Set lawful retention criteria, instruction and exception treatment | Final numeric periods/provider lifecycles PARTIAL |
| Cookies/ePrivacy | Public cookie/analytics review material exists; optional analytics should be consent-gated where law requires | Assess customer website/app trackers separately | Actual active tool/consent proof still fact-dependent |

**GDPR Article 28 is separate from international transfer SCCs.** Commission Decision (EU) 2021/915 provides model controller/processor contract clauses; Decision (EU) 2021/914 is the international transfer SCC framework. The latter's Module 1–4 choice depends on actual exporter/importer roles and transfer facts. Neither is deemed executed or applicable solely because its web link is listed.

## 3. Product evidence classification

| Statement | This review's evidence level | Permitted buyer-facing wording |
| --- | --- | --- |
| AI-system inventory, assessments, compliance evidence workflows | Repository features/documentation identified | "RISCK COMPLY provides structured workflow support for AI inventory, risk assessment and evidence preparation, subject to subscribed/deployed scope." |
| Tenant scoping / access control | Design and source described; exact release proof separate | "Architecture incorporates workspace RBAC and database-level access control; production validation evidence is release-bound." |
| GDPR processing package | Article 28 draft + data matrix exist | "DPA documentation is prepared for review and customer-specific execution; no executed DPA is claimed." |
| Independent security assessment | Third-party black-box assessment 2026-09-12, with later technical remediation recorded | "A limited external assessment occurred; final clean independent retest is not currently accepted." |
| Data residency | Primary Supabase production EU region historically evidenced | "Primary database region is Ireland; other provider processing/access may occur outside the EU." |
| Backup and recovery | Partial historical recovery exercises documented | "Selected recovery mechanisms have been tested; full customer-data/Storage restore and contractual RPO/RTO are not claimed." |
| Certifications | ISO 27001 / SOC 2 certification not evidenced | "Not currently certified or audited to those standards." |
| Legal signoff | Review drafts and internal legal gate exist | "Final legal contract publication/acceptance remains open." |

Statuses are used strictly: **IMPLEMENTED** describes a particular implemented feature; **TESTED** requires an attributable test; **DEPLOYED** requires same-function evidence on the actual deployment; **ACCEPTED** requires the relevant control signoff; **PENDING** means evidence/approval is missing. Do not collapse these states.

## 4. Customer data-lifecycle walkthrough for buyer review

1. **Intake:** customer selects purpose, tenant and authorised users, uploads or enters records; identify sensitive-data scope and legal basis before processing.
2. **Processing and storage:** workspace data is managed through account/tenant-scoped application/database controls, with exact enabled destinations reconciled to the subprocessor register.
3. **Access and audit:** RBAC/RLS/access checks and event records support review. Security logs may follow distinct confidentiality and lawful retention criteria.
4. **Export and data rights:** authenticated, authorised requests initiate documented export/deletion assistance; the controller determines legal validity and exceptions.
5. **Incident:** preserve evidence, contain and notify the appropriate customer/controller without undue delay; distinguish controller regulatory reporting duties.
6. **Termination:** perform agreed return/deletion lifecycle with lawful retention and provider backup/log exclusions explicitly described; no universal instantaneous deletion guarantee.
7. **Third-country access:** map each location/recipient/role, any Chapter V safeguards and customer communication obligations.

## 5. What changes the classification or legal advice boundary

Review again after adding customer-facing LLM/model generation, biometric or emotion analysis, synthetic-media creation, automated decisions affecting jobs/credit/essential services, high-risk system integration, external AI APIs receiving customer content, a new processor or hosting location, special-category processing, materially altered public legal notices, or a future EU AI Act amendment.

## 6. Reference documents

Repository:
- `src/server/ai-governance/legal-rules.ts` (versioned regulatory rules; version at baseline 2026-09-09.1).
- `docs/legal-review-preparation/08_ARTICLE_FUNCTION_EVIDENCE_MATRIX.json`.
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`.
- `docs/legal-assurance/ROPA.md`; `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`.
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`.
- `docs/legal-review-preparation/legal-pack/ENTERPRISE_DPA_PROCESSING_AND_SECURITY_SCHEDULE_V7_2026-10-21.md`.

Official:
- EU AI Act consolidated July 2026: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727
- EU AI Act amending Regulation 2026/1744: https://eur-lex.europa.eu/eli/reg/2026/1744/oj
- European Commission official implementation timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Commission Art 28 SCC decision 2021/915: https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj
- Commission Chapter V SCC decision 2021/914: https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj
- CNPD data breaches: https://www.cnpd.pt/organizacoes/outras-obrigacoes/violacao-de-dados-ou-data-breach/

```text
BUYER_APPLICABILITY_MATRIX=DRAFT_PREPARED
OFFICIAL_2026_LEGAL_TIMELINE=REVIEWED
CUSTOMER_SPECIFIC_CLASSIFICATION=NOT_PERFORMED
QUALIFIED_LEGAL_ACCEPTANCE=NOT_CLAIMED
PRODUCTION_FUNCTIONAL_ACCEPTANCE=NOT_CLAIMED
EMAILS_SENT=0
```
