# RISCK COMPLY — EU AI Act + GDPR Applicability and Responsibility Matrix V11 (consolidated review)

**Reviewed:** 21 October 2026 | **Source baseline:** `main` @ `70d3545f414d063379d481fd238aed563e05edda`  
**Use:** controlled due-diligence annex for customers and counsel. **Not** a legal opinion, certification, regulator decision or evidence that any specific customer is compliant.  
**Status:** `SOURCE-RECONCILED_DRAFT / ROLE-AND-USE-DEPENDENT / QUALIFIED-REVIEW_WHERE_NEEDED`.

**Canonical review selection:** #2555 matrix is the working parent; unique scope, role-change, product-evidence and lifecycle material from #2554 is incorporated below. This resolves draft duplication only.

## A. Reading and acceptance rules

- `DOCUMENTED`: repository text or implementation describes a capability.
- `IMPLEMENTED`: source code/configuration supports an implementation claim; does not establish Production exact-SHA deployment.
- `TESTED`: only for a specific attributable test result and scope; test existence alone does not earn this status.
- `DEPLOYED`: only against an attributable currently deployed version and runtime configuration.
- `ACCEPTED`: only with the relevant genuine legally/technically authorised acceptance artifact.
- `PENDING`: customer facts, effective contract, regulator-specific analysis, current provider account or independent evidence missing.

### AI Act matrix (role/use-dependent)

| Topic and applicable timing | Primary duty bearer | RISCK COMPLY customer-facing support | Customer's non-delegable decision / limit | Evidence/status |
| --- | --- | --- | --- | --- |
| **Arts. 2–3 scope / inventory** | Each actor according to actual system, territorial scope and role | Inventory and intended-purpose evidence | Determine whether the technology is an AI system and any exemption; no universal standalone inventory duty is asserted for every minimal-risk use | Customer-specific PENDING |
| **Art. 4 AI literacy** — from **2 Feb 2025** | Relevant AI system providers and deployers | Document staff training, risk ownership and governance records where enabled | Determine appropriate literacy measures for actual staff, contexts and systems | DOCUMENTED; customer adoption PENDING |
| **Art. 5 prohibited practices** — general provisions from **2 Feb 2025**; later 2026 additions subject to their own date | Providers/deployers and other parties specified by provision | Screening, escalation and supporting evidence for flagged practices | Determine actual statutory facts/exceptions; do not use software score as authorisation | Rule/workflow implementation documented; customer/legal outcome PENDING |
| **Art. 50 transparency** — applicable rules mainly from **2 Aug 2026**, subject to the narrow amended transition ending 2 Dec 2026 for applicable synthetic-content provider solutions; verify the actual system/market-placement conditions | Specific providers/deployers depending on interaction/output use | Disclosure review/evidence workflows where implemented | Establish whether the actual system is conversational, emotion recognition, biometric categorisation or generative/synthetic and meet relevant information/marking duties | DOCUMENTED; feature, use and exceptions PENDING |
| **Annex III stand-alone high-risk AI** — revised application **2 Dec 2027** | Provider; deployer obligations separately | Inventory, intended-purpose and context review, classification evidence | Establish whether any individual customer system is legally high-risk, qualifies for exclusion, or needs registration | Classification support DOCUMENTED; legal determination PENDING |
| **Annex I product-embedded high-risk AI** — revised application **2 Aug 2028**, with product/sectoral conditions | Product/system provider and regulated parties | Structured records/evidence relating to relevant conformity workflows where enabled | Determine product legislation, conformity-assessment route and any sectoral interplay | DOCUMENTED; no certification claimed |
| **Arts. 9–15 high-risk provider safeguards** — only when system, role and provisions applicable | High-risk AI provider | Risk-management, data-governance, documentation, logging, transparency and human-oversight records as applicable | Design and actually operate compliant controls for the specific system; validate data, testing, robustness and cybersecurity | Workflow/support only; system-specific acceptance PENDING |
| **Art. 11 & Annex IV technical documentation** — where high-risk provider obligations apply | High-risk provider | Template/document/evidence organisation | Complete legally sufficient Annex IV dossier from actual engineering facts and intended use | Template support is not conformity proof |
| **Art. 27 FRIA** — only relevant listed high-risk deployers/contexts and date | Specified deployers | Structured assessment support where enabled | Make case-specific impact assessment, involve relevant affected groups and meet any required actions/notifications | Customer-specific PENDING |
| **Art. 53–55 GPAI model rules** — provisions applying from **2 Aug 2025** subject to relevant transition and role | Provider of a GPAI model | Inventory/vendor review and supporting documentation, not model-provider substitution | Determine whether customer is a GPAI model provider; produce actual model documentation/rights/safety assessments | No direct model-provider obligation automatically assigned to governance SaaS |
| **Scope of RISCK COMPLY itself** | Platform operator according to actual software nature | Current evidence describes primarily governance/compliance workflows, without attributable direct model invocation in customer-facing SaaS runtime | Reassess classification on any new direct model use, model training, synthetic content, sensitive decisions or changed intended purpose | Current repository scope only; exact-production model calls not independently retested in this review |

**Timing note (timeline corroborated 21 October 2026; not a full statutory or customer-specific legal review):** Council of the EU official timeline (last reviewed 31 July 2026) confirms the 2026 omnibus fixed delayed dates, with separate changes relevant to some synthetic content/transparency measures. Do **not** use the 2024 pre-amendment August 2026 date for *all* high-risk controls. Retain legal review/change-trigger logic as amendments and delegated/implementing acts evolve.

### GDPR matrix (already applicable; actual legal roles are processing-specific)

| GDPR provision | Who must satisfy it | RISCK COMPLY evidence/support | Final status/limit |
| --- | --- | --- | --- |
| **Arts. 5–6 principles & lawful bases** | Controller for its processing | Data inventory, category-specific controls and customer-configured processing records | Customer lawful basis is NOT certified by the service |
| **Arts. 12–14 notices / transparency** | Controller for its own data subjects | Provider-side privacy notice is a review draft; workspace customer manages its own notices | Final supplier notice/effective entity facts PENDING |
| **Arts. 15–22 data-subject rights** | Controller; processor assists per binding agreement | Controlled export/delete and relevant privacy-request routes described | Data-subject identity, exemptions and controller decision PENDING |
| **Art. 28 DPA** | Controllers/processors in respective legal roles | Prepared DPA, Annex specification and Article 28 controls matrix | **UNSIGNED/NOT EFFECTIVE** for RISCK COMPLY customer processing |
| **Arts. 24–25 accountability / data protection by design** | Controllers; processors owe relevant direct GDPR duties | Tenant access design, privacy engineering runbooks and controls | No customer-specific accountability PASS claim |
| **Art. 30 processing records** | Each controller/processor to extent legally required | Supplier ROPA/workflow evidence | Reconcile current live processing and applicable exemptions |
| **Art. 32 security** | Controller and processor | Authentication, RBAC, RLS, evidence collection and incident process; provider-managed measures | Current deployment/effectiveness and third-party assurance PENDING |
| **Art. 33 breach notification** | Controller to authority where applicable (generally 72h from awareness unless unlikely risk); processor to controller **without undue delay** after awareness | Incident workflow and proposed DPA processor-notice clause | No invented 24/48h fixed processor SLA; statutory facts/cause depend on incident |
| **Art. 34 affected-person notification** | Controller where legally required | Processor incident information/assistance | Customer/legal outcome PENDING |
| **Arts. 35–36 DPIA/prior consultation** | Controller; processor provides assistance | DPIA/FRIA support data and security statements | Customer DPIA and supervisory interaction cannot be replaced by a template |
| **Arts. 37–39 DPO** | Entities meeting statutory triggers | DPO screening records | No assumption DPO is legally required or appointed |
| **Arts. 44–49 international transfers** | Actors making covered transfers | Subprocessor/transfer register, provider DPAs/transfer-framework references | Actual destinations, exporters/importers, signed mechanisms and supplementary safeguards **PENDING per flow** |
| **Art. 5 storage limitation & applicable Portuguese tax retention** | Relevant controller | Category-specific retention criteria and export/delete processes | Exact periods, backup lifecycle and legal exemptions PENDING |
| **Cookies / Portuguese ePrivacy implementation** | Website/operator depending on actual cookies/analytics | Consent-aware analytics policy and cookie review surface | Confirm exact technologies, cookie consent records and effective notice before unrestricted publication |

## B. Customer responsibility split — ready-to-use procurement language

> RISCK COMPLY is a B2B governance and compliance-operations platform. It supports the collection, classification and organisation of customer-provided AI governance information and supporting evidence. It does not issue legal opinions, conduct statutory conformity assessments on behalf of a notified body, guarantee the legality of a customer's AI systems or substitute for the customer's designated controller, deployer, provider, DPO, security team or legal advisers. Responsibilities and the AI Act/GDPR obligations applicable to any particular customer depend on the real intended purpose, factual use, legal role, data processing and operative law.

### In particular

1. **Inventory/risk labels:** an item tagged `high`, `limited` or `minimal` by software is a workflow aid; legal classification still requires an assessment of the system and its context.
2. **Generated or assembled documents:** treat as drafts requiring accuracy checks, source evidence and accountable human approval. Do not automatically treat an exported PDF as Annex IV conformity.
3. **High-risk controls:** provider obligations differ from deployer obligations; neither is automatically shifted to the RISCK COMPLY operator merely because the platform offers a workflow.
4. **Personal information:** customer workspace records may contain personal data even where field names look like technical inventory; actual controller and processor responsibilities depend on purpose/means and contract.
5. **Transfers:** region of primary storage is not a proxy for processor support access and transfer legality.
6. **No implicit AI model training permission:** customer workspace personal data is not authorised for unrelated third-party AI training under this proposed contract perimeter; any future service change needs separate review and controls.

## C. Change-trigger register (required before declaring final)

| Trigger | Required response |
| --- | --- |
| New SaaS model API, generative output or automated decision feature | Reassess whether RISCK COMPLY itself is an AI system/provider/deployer; update privacy notices, subprocessors, AI Act classification, consent and testing |
| New customer targeting employment, biometrics, credit, policing, border or essential services | New Annex III and high-risk/FRIA role-specific review; no auto-PASS |
| New provider or new data destination | Revise flow map and DPA Annex III; verify contract and Chapter V mechanism; notify as finally agreed |
| New category of sensitive data or children's data | Block ordinary handling until lawful condition, explicit product scope and controls approved |
| New recording/cookies/analytics functionality | ePrivacy and GDPR legal-basis review; consent/UI verification |
| Material public legal-claim change | Revalidate source date, buyer evidence and exact publication approval |
| New release or architectural change | Bind claims to exact `main` / deployed SHA, and rerun controlled security/privacy evidence |

## C1. Unique scope and evidence qualifications preserved from #2554

- A significant modification or changed intended purpose may change a customer's legal role, including provider duties. Record the change and reassess rather than keeping an old software risk label.
- Non-EU customers may still fall within EU territorial scope based on placing systems on the market, use or output in the EU. The service is not represented as universally regulated or universally exempt outside the EU.
- Provider duties and deployer duties are distinct; a workflow subscription does not transfer statutory conformity, registration or human-oversight responsibilities to RISCK COMPLY.
- A FRIA and a GDPR DPIA have different legal triggers. Template completion does not prove either assessment is legally sufficient.
- Lifecycle review covers intake → tenant-scoped processing/access/audit → authorised export/rights assistance → incident cooperation → agreed return/deletion and provider-copy exceptions. Rights decisions remain with the responsible controller.

| Buyer statement | Permitted evidence boundary |
| --- | --- |
| Inventory, assessments and documents | Workflow support subject to the subscribed and actually deployed scope; not regulatory approval |
| Logical backup and restore | Existing CircleCI #180 at operational SHA `06ca08668a3d8f796ed175d6770d368a99f3e778` demonstrated selected logical PostgreSQL recovery (155/155 tables, matching rows/catalogs/ACLs); no full-platform/Storage/Auth/rollback/RTO/RPO acceptance |
| Legal, security and procurement | Draft preparation, implementation, deployment, tests and formal acceptance are separate; no certification, signed DPA, seller-title or clean terminal pentest implied |

## D. Source register (official primary references)

- Regulation (EU) 2024/1689 (AI Act): https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Regulation (EU) 2026/1744 (amending AI Act): https://eur-lex.europa.eu/eli/reg/2026/1744/oj
- Council 2026 AI Act chronology: https://www.consilium.europa.eu/en/policies/artificial-intelligence-act/timeline-artificial-intelligence/
- GDPR Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Commission Decision (EU) 2021/915 (controller/processor clauses): https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj/eng
- Commission SCC scope / transfer FAQ: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en
- EDPB Opinion on processor/subprocessor identity and warranties: https://www.edpb.europa.eu/news/edpb-adopts-opinion-on-processors-guidelines-on-legitimate-interest-statement-on-draft_en

## E. Internal evidence pointers (source—not automatic runtime proof)

- `src/server/ai-governance/legal-rules.ts`: versioned legal-rule registry, including review-by dates (some **now overdue**, including 9 Oct 2026; schedule review, do not silently mark reviewed).
- `docs/legal-review-preparation/08_ARTICLE_FUNCTION_EVIDENCE_MATRIX.json`: provision/function/test references.
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`: repository-bounded role and transfer statement.
- `docs/legal-assurance/ROPA.md`, `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`.
- `docs/legal-review-preparation/legal-pack/ENTERPRISE_DATA_PROCESSING_SECURITY_SCHEDULE_V7_REVIEW_DRAFT.md`.

```text
MATRIX_STATUS=PREPARED_FOR_CUSTOMER_AND_COUNSEL_REVIEW
CUSTOMER-SPECIFIC_LEGAL_CLASSIFICATION=NOT_ACCEPTED
EFFECTIVE_SUPPLIER_DPA=NOT_EXECUTED
AI_ACT_COMPLIANCE_GUARANTEE=NONE
EXTERNAL_EMAILS=0
```
