# RISCK COMPLY — Enterprise DPA Processing, Security & Transfer Schedule (V7)

**Document status:** CUSTOMER-REVIEW DRAFT / NOT EXECUTED / NOT EFFECTIVE  
**Prepared:** 2026-10-21  
**Source baseline:** GitHub main commit 70d3545f414d063379d481fd238aed563e05edda  
**Intended service provider:** SAMUEL CERQUEIRA, UNIPESSOAL LDA (operator-designated; authoritative registration/signatory facts outstanding)  
**Product:** RISCK COMPLY — B2B AI governance and compliance-operations SaaS

> This schedule is a negotiated annex candidate, not legal advice, a signed DPA, an approved security certificate, or evidence of regulatory authorisation. It should accompany the canonical Data Processing Addendum Review Draft, Master Services Agreement and Enterprise Order Form only after factual reconciliation, party approval and lawful incorporation. It does **not** silently supersede their terms. If factual verification does not support an item, amend or remove it before execution.

## 0. Instructions for contract assembly

1. Attach this schedule to the exact-version DPA after completing every bracketed field and removing inapplicable choices.
2. Identify the parties and the precise controller/processor roles **per processing activity**, not just once for the whole commercial relationship.
3. Revalidate each provider, data-flow, location, retention and technical-security assertion against the actual production account and relevant release SHA immediately before signature.
4. Complete the technical measures and subprocessor annexes with attributable evidence; do not turn a source-code control into a guaranteed deployment or test result without production evidence.
5. Separately adopt any applicable Chapter V GDPR transfer instrument (such as the relevant 2021/914 SCC module) rather than misdescribing Article 28 controller-processor clauses as transfer SCCs.
6. Company legal representatives and the buyer must expressly approve and execute/incorporate the final version. A review draft or platform webpage is not an executed customer contract.

**Drafting references:** GDPR Articles 5, 6, 9, 12–22, 28, 32–36 and Chapter V; Commission Decision (EU) 2021/915 (Article 28 clauses); Commission Decision (EU) 2021/914 (international transfers); Portuguese CNPD breach guidance. Official links are included in section 9.

## A. Schedule of processing (GDPR Article 28(3))

| Required item | Proposed customer-facing scope | Mandatory closing verification |
| --- | --- | --- |
| Controller/customer | [CUSTOMER LEGAL ENTITY, CONTACT, REGISTERED ADDRESS, GDPR ROLE] | Verify entity and processing role |
| Service provider/processor | SAMUEL CERQUEIRA, UNIPESSOAL LDA — **owner-designated only** | Verify registered details, signatory authority and contract-side identity |
| Processing role | Customer normally controls customer-workspace content; RISCK COMPLY intends to act as processor, or subprocessor if the customer is itself a processor; provider-side website, billing, marketing and certain security processing must be mapped separately | Complete processing-activity role mapping with buyer |
| Subject matter | Hosting and operating contracted AI-governance, inventory, risk, assessment, document/evidence and related compliance workflows | Tie to ordered/deployed modules |
| Nature of processing | Receive, organise, validate, store, retrieve, restrict access to, back up where applicable, display, export, transmit to authorised service providers, investigate support incidents, and delete/return data according to instructions and law | Verify enabled functionality and providers |
| Purpose | Delivery, security, support and maintenance of the contracted service, on documented customer instructions; no independent reuse of workspace content for unrelated purposes | Reconcile with Terms, privacy notice and actual product functionality |
| Duration | Contract term plus agreed retrieval/return/deletion and legally necessary retention periods | Approved retention table and provider lifecycles required |
| Data subjects | Authorised users, customer staff and contractors, business contacts, vendor contacts, individuals identified in customer-submitted AI-system records and any other approved persons | Customer to confirm populations |
| Ordinary data categories | Business identities and contact details, account/workspace IDs, membership/role metadata, compliance records, customer-uploaded documents and evidence containing personal data, support communications, relevant event/audit metadata | Confirm payload schemas and enabled integrations |
| Special-category / offence data | **Outside default processing scope**; not an unconditional ban on processing that might incidentally appear. Intentional/high-volume use requires specific approved scope, lawful conditions and safeguards | Buyer-specific decision; DPIA where required |
| Customer instructions | Final signed DPA/MSA, approved order form, documented customer configuration and authorised support requests, subject to legally required processing | Confirm instruction/change logging and escalation route |
| Transfer instructions | Only documented, authorised transfers and access in accordance with the agreed data-flow inventory and applicable law | Section D must be finished before contract effect |
| Return and deletion | Choose return or deletion on termination as the GDPR requires, except where Union/Member-State law requires retention; implement verified backup and legal-hold exceptions | Full lifecycle evidence and customer export method required |

**Default customer restrictions for review:** no prohibited AI uses; no deliberate submission of biometric/special-category or criminal-offence data without approved scope; no expectation that RISCK COMPLY makes regulated decisions for the customer. Any restriction must match the real product and the executed commercial agreement.

## B. Article 28 processor obligations — clause alignment

The definitive DPA should include: processing only on documented instructions (including international transfers, subject to legal exceptions); confidentiality for authorised personnel; appropriate Article 32 measures; authorised-subprocessor governance and flow-down Article 28 obligations; assistance with rights requests and Articles 32–36 where applicable; notice to the controller **without undue delay** after awareness of a personal-data breach; deletion or return at the end of services unless required retention applies; provision of compliance information and allowance for legally required audits/inspections; and notification where an instruction appears unlawful.

The owner-selected operational drafting positions remain **subject to final legal and technical acceptance**:

| Topic | Current proposed position | Status |
| --- | --- | --- |
| Subprocessor authorisation | General prior written authorisation, change notice and documented right of objection | OWNER POSITION SELECTED / EFFECTIVE TERMS PENDING |
| New material subprocessor notice | Target of 30 days where practicable/contractually applicable | TARGET ONLY / NOT A CURRENT PROMISE |
| Routine audit procedure | Remote security evidence/questionnaires first, generally once in 12 months except justified additional audits; GDPR mandatory audit rights preserved | OWNER POSITION SELECTED / REVIEW |
| Processor breach notice | Without undue delay after awareness; no automatic 24 h/48 h pledge | DRAFT CONTRACT POSITION |
| Post-termination export | 30-day target, conditioned on verified functionality and applicable final agreement | UNPROVEN AS UNIVERSAL SERVICE GUARANTEE |
| Customer-content model training | No authorised customer-content training for provider or third-party AI models without separate lawful and documented approval | POLICY POSITION; VERIFY EACH ENABLED DATA FLOW |

## C. Schedule of technical and organisational measures (TOMs)

This table states the **candidate measure and proof requirement**, not an unqualified production warranty. A customer-facing signed TOM schedule must identify the exact committed measure, scope and evidence effective at signature. Legend: **SOURCE** = source/document structure present; **TESTED** = attributable test result exists for named version/scope; **DEPLOYED** = shown in observed environment; **ACCEPTED** = independent or governed approval where required; **PENDING** = insufficient current contractual evidence.

| Control domain | Proposed evidence-bounded representation | Repository evidence reference | Pre-signature status |
| --- | --- | --- | --- |
| Identity and login | Managed authentication and server-side verification are implemented in the application design | `docs/trust/SECURITY_OVERVIEW.md`, `docs/trust/ARCHITECTURE_OVERVIEW.md` | SOURCE; exact release deployment and runtime proof PENDING |
| Tenant segregation | Organisation/workspace-scoped authorisation, RBAC and database RLS controls are used; no blanket claim that all cross-tenant negatives have passed on this exact release | `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`, tenant-isolation evidence contract | SOURCE; release-specific live TESTED/ACCEPTED PENDING |
| Privileged operations | Step-up protection exists for sensitive administrative/privacy operations where enabled | `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md` | SOURCE; tenant configuration and deployed results PENDING |
| Data transit/storage | Provider-managed encryption/TLS controls are used subject to enabled plan, implementation and supplier terms; algorithm/key-residency details are not universally warranted | `docs/trust/SECURITY_OVERVIEW.md`, `docs/trust/SUBPROCESSORS.md` | Provider- and configuration-specific proof PENDING |
| Logging | Tenant-scoped activity records and tamper-evident audit-chain features are documented; external WORM/immutable archiving is **not** claimed | `docs/security/AUDIT_CHAIN.md`, `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md` | SOURCE; current runtime evidence PENDING |
| Document handling | Private workspace-document handling with access controls is implemented in source and reviewed against tenant scoping | `docs/trust/DATA_PROTECTION.md` | SOURCE; deployed negative-test proof PENDING |
| Security development | Protected CI/security checks, change review and release-validation controls exist | `docs/trust/SECURITY_OVERVIEW.md`, canonical release workflows | SOURCE; accepted current-SHA results PENDING |
| Incident handling | Documented intake, triage, containment, remediation, evidence preservation and communications workflow exists | `docs/trust/INCIDENT_RESPONSE.md` | DOCUMENTED; staffing and response-time guarantees NOT CLAIMED |
| Vulnerability testing | Independent black-box review dated 2026-09-12 and technical TLS findings remediation are recorded; clean independent terminal retest is **not** claimed | `docs/trust/PENTEST_READINESS.md` | Historical assessment documented; current independent retest PENDING |
| Backup and restore | Historical bounded Supabase recovery/migration exercises are documented; customer-data completeness, Storage restoration and full application RTO/RPO are **not** established | `docs/dr/DR_RUNTIME_EVIDENCE.md`, `docs/evidence/LEGAL_PROCUREMENT_COMMERCIAL_CLOSURE_2026-10-03.md` | Historical bounded TESTED; full recovery acceptance PENDING |
| Service availability | No default percentage uptime, 24/7 operations, guaranteed RTO/RPO or service credits are offered | `docs/legal-review-preparation/legal-pack/SERVICE_SUPPORT_INCIDENT_SCHEDULE_REVIEW_DRAFT.md` | No contractual numerical SLA |
| Privacy lifecycle | GDPR handling and category-specific retention/export/delete procedures are documented; provider copies have their own lifecycle | `docs/privacy/DATA_RETENTION_POLICY.md`, `docs/privacy/GDPR_RUNBOOK.md` | SOURCE / partial technical tests; final retention periods PENDING |

**Before execution:** security owner must sign off a release-specific evidence attachment identifying which rows are IMPLEMENTED, TESTED, DEPLOYED and ACCEPTED, with test artefact IDs and the production SHA. Rows lacking evidence must remain qualified or be removed.

## D. Candidate supplier, subprocessor and international-transfer annex

A service provider is not necessarily a GDPR subprocessor for every activity. This register is a **role-analysis working schedule**, not unconditional customer approval of all vendors. Do not publish specific supplier personnel, account IDs or confidential contract material.

| Supplier / integration | Candidate relevant function | Current evidence limitation / buyer-safe disclosure |
| --- | --- | --- |
| Supabase | Customer data database, authentication and private Storage | Production region previously evidenced as eu-west-1 (Ireland); access, backups, onward transfers and any negotiated contract remain account-specific |
| Vercel | Web application hosting / runtime / delivery | Connected Pro plan with published DPA framework; exact contracting entity, request/access locations and current deployment must be reconfirmed |
| Cloudflare | DNS, CDN/edge TLS/security/network processing | Enabled services, edge-log retention, account legal entity and international transfer facts must be confirmed |
| Sentry | Error/diagnostic monitoring | Netherlands location reported historically; exact live organisation settings, payload scrubbing, retention and support access pending |
| Upstash / Redis | Distributed rate limiting / security metadata | Actual database region, plan and retention/backup configuration unverified in this annex |
| Resend | Transactional email | Current account/contracting entity, message data and retention configuration need confirmation; **no emails are sent by creating this schedule** |
| Stripe | Billing/payment/subscription metadata | May have independent-controller as well as service-provider roles; account-specific role, tax details and terms require reconciliation |
| Google Identity/OAuth | Optional sign-in service | OAuth identity role and transfer analysis depends on account configuration and actual data flow |
| Google Workspace | Business contact and support communications | Treat separately from workspace content; verify corporate account terms and retained messages |
| GitHub / GitHub Actions | Source control and protected CI jobs | Whether production personal data reaches runners must be established before treating as a workspace subprocessor |
| PostHog (if enabled) | Consent-dependent product analytics | Historic EU Cloud/DPA evidence exists; actual production project connection is not currently attributable; omit as an active personal-data destination unless validated |

**Mandatory pre-approval table** for each *actual* subprocessor: [legal supplier name] · [RISCK contract counterparty] · [data categories] · [role] · [processing/storage/access countries] · [transfer mechanism] · [retention] · [DPA/effective reference] · [change notice] · [owner signoff] · [verification date]. Fill with attributable provider account and agreement evidence.

**Data residency:** The primary production Supabase project was evidenced in Ireland; **RISCK COMPLY makes no blanket EU-only storage, access or processing claim** for the whole service.

**Transfer decision rule:** A supplier's public SCC/DPF description does not by itself establish lawful coverage for each RISCK COMPLY flow. For each transfer, identify exporter/importer role, destination, adequate-country status or other lawful mechanism, correct 2021/914 SCC module (where needed), transfer impact/supplementary measures where required, and contractual evidence. Commission Decision 2021/915 for Article 28 contracting is **not** interchangeable with Decision 2021/914 for Chapter V international transfers.

## E. Retention, return, deletion and breach assistance

### E1. Contract schedule to be completed

| Dataset | Proposed retention principle | Final numerical period/status |
| --- | --- | --- |
| Customer workspace content / uploaded documents | During service plus agreed export/return and removal process | [AGREED PERIOD / PROCESS; NOT VERIFIED] |
| Users / authentication records | Necessary for account, identity and security administration | [PERIOD; NOT VERIFIED] |
| Billing and invoice records | Legal/tax obligations and dispute evidence to extent applicable | [PERIOD AND LEGAL BASIS; NOT VERIFIED] |
| Security and audit records | Security investigation, integrity and proportionate accountability | [CATEGORY-SPECIFIC PERIOD; NOT VERIFIED] |
| Support correspondence | Issue resolution and documented lawful business retention | [PERIOD; NOT VERIFIED] |
| Managed backup copies, logs and snapshots | Applicable supplier lifecycle and lawful holds | [SUPPLIER-BY-SUPPLIER FACTS; NOT VERIFIED] |

A successful in-app deletion request does **not** establish immediate deletion from immutable audit evidence, legally retained records, logs, supplier backups or all downstream copies. Customer rights and exceptions depend on the GDPR role, legal grounds and approved retention schedule.

### E2. Personal-data incident cooperation

On becoming aware of a customer-data personal-data breach, the proposed processor commitment is to inform the relevant controller **without undue delay**, supply available incident description, affected data categories/scale where known, contact and mitigation details, and follow-up information as it becomes available. The controller evaluates its independent duty to notify the supervisory authority, normally within **72 hours** after becoming aware where GDPR Article 33 conditions are met, and data subjects where Article 34 applies. A processor does not automatically take over the controller's filing obligation. Record incidents even where a regulatory notification is not required.

## F. AI functionality / regulatory limitation schedule

RISCK COMPLY is marketed as **governance and compliance-workflow software**. Repository documentation at the source baseline reports no attributable direct customer-facing model invocation in the current SaaS runtime. This is a source/evidence-bounded observation, **not** a guarantee about all future deployments or enabled integrations.

The customer remains responsible for establishing intended purpose, role (provider, deployer, importer, distributor, etc.), actual AI-system risk classification, prohibited-use exceptions, transparency duties, legal bases and any applicable provider/deployer high-risk obligations, FRIA/DPIA or conformity requirements. Platform-generated classifications, explanations and evidence templates require competent human review; they are not an approval by a regulator, certification, legal opinion or guarantee of legal compliance.

EU AI Act currently relevant principal dates (verify again at signature):
- 2025-02-02: first general/prohibition measures applied;
- 2025-08-02: GPAI/governance requirements;
- 2026-08-02: broad application including Article 50 transparency;
- 2026-12-02: specified additional Article 5 prohibitions and a limited Article 50(2) transition;
- 2027-12-02: Annex III high-risk rules;
- 2028-08-02: Annex I regulated-product high-risk rules.

These dates follow the 2026 amendment Regulation (EU) 2026/1744 and are role/transition dependent. Classification of the RISCK COMPLY platform **itself** must be revisited if generative/model execution, automated high-impact decisioning, biometric or other scoped AI functionality is introduced.

## G. Enterprise order-form factual acceptance sheet

| Item | Proposed recorded response | Acceptance condition |
| --- | --- | --- |
| Exact customer legal identity | [CUSTOMER] | Procurement/customer verified |
| Exact supplier legal identity and signatory | [VERIFY REGISTRY / SIGNING POWER] | Registry evidence and signature authority |
| DPA and schedule versions | [VERSION, HASH, EFFECTIVE DATE] | Same approved versions incorporated in contract |
| Data controller/processor role allocation | [ROLE MATRIX] | Buyer confirms |
| Active subprocessors and their purposes | [DATED ACTUAL SET] | Provider account evidence and accepted notice process |
| International transfer legal mechanisms | [FLOW-BY-FLOW ANNEX] | Legal/factual validation |
| Technical security claims | [VERSIONED PROOF PACK / TARGET SHA] | Security/release-owner approval |
| Data retention/deletion window | [CATEGORY-SPECIFIC TABLE] | Supplier and service capability confirmed |
| Service SLA and recovery obligations | [NONE BY DEFAULT / SPECIFIC SIGNED EXCEPTION] | No invented metric |
| Post-termination export | [APPROVED ACTUAL MECHANISM] | Functional/prod proof; no unverified 30-day promise |
| Additional assessment/certification demands | [CUSTOMER-SPECIFIC] | Accept only when actually evidenced |
| Contract signature and effective date | [NOT COMPLETE] | Authorised party action |

**Unsigned status:** all table placeholders are open and must be completed case by case. No fictional acceptance can be generated from this annex.

## H. Responsibility split

**RISCK COMPLY:** operate only the actual contracted service, perform documented processor obligations, maintain appropriate technical/security and vendor controls, preserve accurate disclosures, handle processor-side breach assistance, and provide available compliance evidence.

**Customer:** provide lawful and accurate inputs; establish each AI system's real intended purpose and legal role; decide legal bases and AI Act classifications/obligations; operate human review and governance; fulfil controller responsibilities and respond to supervisory bodies; approve its own privacy/transfer and procurement decisions.

## I. Sources and authoritative repository references

Official sources:
- GDPR Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Article 28 controller-processor SCC decision 2021/915: https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj
- International transfer SCC decision 2021/914: https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj
- European Commission SCC guidance: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en
- CNPD breach notification: https://www.cnpd.pt/organizacoes/outras-obrigacoes/violacao-de-dados-ou-data-breach/
- Consolidated AI Act (including 2026 changes): https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727
- Amendment Regulation (EU) 2026/1744: https://eur-lex.europa.eu/eli/reg/2026/1744/oj

Canonical repository materials cross-checked on the stated source baseline:
- `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/MASTER_SERVICES_AGREEMENT_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/ENTERPRISE_ORDER_FORM_REVIEW_DRAFT.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/TOMS_MATRIX.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/evidence/LEGAL_PROCUREMENT_COMMERCIAL_CLOSURE_2026-10-03.md`
- `config/enterprise-100-closure.json`

## J. Closing status

```text
DOCUMENT_PREPARED=YES
SOURCE_REPOSITORY_REVIEW=YES
OFFICIAL_RULES_CROSS_CHECKED=YES
CUSTOMER_SPECIFIC_ANNEX_FACTS=OPEN
PRODUCTION_EXACT_SHA_DEPLOYMENT_VERIFICATION=NOT_PERFORMED_BY_THIS_DOCUMENT
DPA_EXECUTED=NO
LEGAL_LAUNCH_ACCEPTED=NO
CUSTOMER_PROCUREMENT_ACCEPTED=NO
EMAILS_SENT=0
EXTERNAL_SUBMISSIONS=0
```

**Document owner action:** Only release an effective version after a current production evidence check, company and vendor factual reconciliation, customer-specific scoping, authorised legal approval as required and valid contract execution/incorporation.
