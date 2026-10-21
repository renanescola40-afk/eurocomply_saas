# RISCK COMPLY — Enterprise Data Processing & Security Schedule (V7)

**Version:** 0.1 review, 21 October 2026  
**Classification:** CUSTOMER-REVIEW DRAFT — NOT EXECUTED, NOT AN EFFECTIVE DPA OR SCC, NOT A SECURITY CERTIFICATION  
**Proposed supplier:** SAMUEL CERQUEIRA, UNIPESSOAL LDA, trading as RISCK COMPLY (**registered identifiers, registered office and signatory authority not yet independently established**).  
**Contact for proposed contracting/privacy intake:** comercial@risckcomply.com  
**Product:** https://www.risckcomply.com  
**Source baseline:** GitHub `main` commit `70d3545f414d063379d481fd238aed563e05edda`. This is a source-documentation baseline, **not proof that production runs this SHA**.

> **For buyer review, not execution.** This proposed schedule is intended to accompany the controlled Master Services Agreement, an approved Order Form and the separately approved Data Processing Addendum (DPA). It does not itself create a contract; it must not be represented as signed, GDPR-approved, buyer-accepted or incorporated into customer terms. Each buyer-specific annex and provider/production fact must be confirmed before contracting.

## 1. Processing parties and permitted scope

1. **Customer workspace personal data.** Depending on the customer's underlying activities, the customer is controller or processor; RISCK COMPLY is proposed to act as processor or subprocessor for personal data handled on documented customer instructions. The customer retains legal responsibility for determining lawful purposes, instructions, content accuracy, data-subject notices and its own GDPR/AI Act role and obligations.
2. **Supplier's independent activities.** Website visits, account administration, security and fraud prevention, procurement, support and billing may involve independent controller purposes. Such processing is subject to the supplier's **final effective** privacy notice and provider-specific role analysis, rather than being silently included in the customer-processor processing perimeter.
3. **Product scope.** Subscription-based B2B AI governance and compliance-operations workspaces, subject to the enabled plan, actual deployment and buyer-specific Order Form. No claim that the platform grants legal advice, conformity assessment, regulatory approval or guaranteed compliance.
4. **Instructions.** The signed agreement, approved Order Form, documented product configurations and authenticated support instructions define authorised processing. An instruction contrary to data-protection law is escalated under the signed DPA; a software assessment is not a legal determination.
5. **Restricted content.** Special-category, criminal-offence, children's or similarly sensitive personal data is not approved as a default customer use case; specific processing requires agreed scope, legal conditions, security measures and verified capability.

## 2. Article 28(3) processing specification

| Item | Proposed processing specification | Confirmation requirement |
| --- | --- | --- |
| Subject matter | Provision, security, maintenance and support of the subscribed RISCK COMPLY customer workspace | Final Order Form/service description |
| Duration | Subscription term and legally/contractually justified post-termination return, deletion or retention | Final DPA and verified downstream lifecycle |
| Nature of processing | Receipt, organisation, hosting/storage, retrieval, workspace access, controlled disclosure, export and deletion-support | Actual enabled integrations and flows |
| Purposes | Customer-directed AI system inventory, governance/compliance workflow, evidence and controlled-document handling; service security and maintenance | Customer purpose and instructions |
| Data subjects | Authorised customer users; customer employees/contractors; business and vendor contacts; any persons documented in customer-provided content | Customer-specific categories |
| Data categories | Identity, business contact, workspace membership, system/vendor/risk/task/assessment records, compliance documents, support messages and necessary operational metadata, insofar as they contain personal data | Customer-specific categories and uploaded documents |
| Customer obligations | Lawful instructions, legal bases/notices, access authorisation, accurate classification, appropriate inputs, data-subject request decisions | Customer/controller confirmation |
| Supplier obligations | Article 28 duties within agreed processing scope, subject to an executed DPA and evidence-backed technical and organisational measures | Exact effective DPA and operator authority |

**No blanket processing of personal data in the EU only is represented.** Existing documentation identifies primary Supabase Production project region `eu-west-1` (Ireland), but other providers may process or access data from other jurisdictions.

## 3. Technical and organisational measures — buyer-disclosure boundary

These measures are documented **designs and implementation areas in repository materials**, not a newly performed or current exact-production penetration test. `IMPLEMENTED` means represented in source; `DEPLOYED`/`TESTED` require current release-specific artifacts; `ACCEPTED` requires the applicable genuine acceptance authority.

| Control | Disclosure suitable for due diligence | Status/limit |
| --- | --- | --- |
| Identity and access | Supabase Auth integration, server-side authentication/authorisation, scoped workspace membership and RBAC | IMPLEMENTED per architecture; exact buyer deployment and tenant configuration need verification |
| Segregation | Workspace/organisation scoping, Postgres RLS and server-side tenant checks | IMPLEMENTED; do not assert exact-production cross-tenant test PASS without current accepted evidence |
| Elevated operations | Step-up controls used for certain sensitive privacy/audit actions | IMPLEMENTED where evidenced; not universal MFA on every tenant by default |
| Documents and exports | Protected, tenant-scoped document and evidence workflows, controlled export/deletion paths | IMPLEMENTED; storage policy and release-specific negative tests require evidence |
| Security evidence | Audit events, tamper-evident chain and gated evidence exports | IMPLEMENTED; do **not** claim WORM/immutable third-party retention |
| Data in transit/at rest | Provider-managed security and encryption controls to the extent applicable to active services/configuration | No unsupported key ownership, algorithm, regional exclusivity or end-to-end encryption guarantee |
| Logging and monitoring | Diagnostic, security and incident workflows with privacy-minimisation practices | Provider settings/retention need current configuration evidence; no contractual 24/7 on-call |
| Secure delivery | Source/CI security and release gates | Repository evidence only; exact deployed SHA and release control acceptance must be checked |
| Backup/restore | Prior bounded isolated database restoration and migration-replay tests documented | No currently established full-application customer-data restore, storage recovery, RTO or RPO contractual commitment |
| Independent assessment | Third-party black-box web assessment dated 12 September 2026 documented; original TLS Highs have subsequent technical remediation evidence | Clean independent terminal retest and comprehensive authenticated isolation assurance **not claimed** |
| Certifications | Neither ISO 27001 certification nor SOC 2 Type I/II report is currently claimed | NOT AVAILABLE |

The contracting Security Annex must map promised measures to **current** environment and evidence references. Code presence, past provider statements and a `READY` deployment alone are insufficient for current production effectiveness.

## 4. Proposed provider/disclosure register (role-specific; review before incorporation)

The following are **identified integrations or operational vendors**, not a declaration that every company is a contractual subprocessor of every customer-data flow. Confirm provider legal entity, exact customer account, active product options, personal-data flows, service region/access, retention and role prior to converting any row into a binding Annex III.

| Service | Typical purpose/data | Current known boundary | Contract-grade status |
| --- | --- | --- | --- |
| **Supabase** | Production Postgres/Auth/Storage; customer content, account/workspace data | Production project previously evidenced in Ireland (`eu-west-1`); general DPA incorporation framework recorded in provider correspondence | Exact account/entity, backup/support access and onward transfers still require final validation |
| **Vercel** | Application hosting, request metadata, edge/server execution, deployment logs | Pro-team/provider DPA framework documented; no universal EU-only statement | Contracting entity, retention, access locations and flow mapping PENDING |
| **Cloudflare** | DNS, proxy/TLS edge and traffic/security metadata | Public self-service DPA framework documented | Enabled products, customer entity and cross-border flow PENDING |
| **Resend** | Transactional delivery where configured: email recipient, content and metadata | DPA incorporation framework documented | Actual account/entity, retention and enabled delivery features PENDING |
| **Upstash / Redis** | Security/rate-limit operational identifiers | Provider DPA framework documented | Active region, account plan and backup/retention configuration PENDING |
| **Sentry** | Diagnostic errors and possibly request/user identifiers | Service integration and provider framework documented | Current project, scrubbers, retention and onward access PENDING |
| **PostHog** | Optional, consent-gated analytics events | Historical executed PostHog DPA documented; currently connected generic project does not establish Production attribution | Active Production project, consent and retention PENDING |
| **Google Identity / OAuth** | Selected login profile/identity metadata | Identity integration documented | Legal role, terms and enabled data flows PENDING |
| **Stripe** | Billing, subscriptions, invoicing/payment-related metadata | Material commercial processor/controller functions may vary by activity | Account-specific legal role, seller/tax settings and data-flow PENDING |
| **Google Workspace / GitHub Actions** | Corporate support communications; development/CI and limited protected operational evidence where configured | Operational processors or independent services depending on activity | Include only where processing in the scoped DPA actually occurs; role/account facts PENDING |

An AI model provider used privately by a founder is **not automatically** a direct SaaS runtime subprocessor. No active direct customer-facing model API is established by the cited product-scope register. Reassess promptly if runtime architecture changes.

### Change notices / objections — proposed owner-selected model

General written authorisation, with a **target** of 30 days' advance notice for new material subprocessors where practicable and contractually applicable; reasonable data-protection objections and an agreed remedy/affected-service exit route. **This is a proposed term awaiting final agreement, not a binding universal promise.** Mandatory GDPR Article 28 rights must not be restricted by the procedural language.

## 5. International transfers

1. A server located in Ireland does **not** prove that every relevant processing, remote access or support operation remains within the EEA.
2. Record each actual exporter/importer, purpose, data categories, destination, vendor role and onward transfer.
3. For third-country transfers, verify whether GDPR Article 45 adequacy applies, or identify an appropriate Chapter V transfer mechanism (including applicable **2021/914** international-transfer SCC module where used), supplementary safeguards/TIA where needed, and account-specific signed/incorporated evidence.
4. EU Commission **2021/915** controller–processor clauses address Article 28 relationships; they are **not by themselves** proof of a lawful Chapter V international transfer.
5. A vendor's website stating that SCCs or DPF may apply is not proof that a RISCK COMPLY account, entity or particular data flow satisfies Chapter V requirements.

**Status:** Transfer register exists; final flow-by-flow transfer outcomes remain open. No blanket `GDPR TRANSFERS=PASS` assertion.

## 6. Data lifecycle, rights and deletion

- **Collection/use:** customer or authorised workspace member determines ordinary business content, subject to the approved service scope.
- **Access/correction/export:** described controls and request procedures exist; particular requests require proper identity, membership and role checks. The supplier assists the controller under the DPA where applicable.
- **Termination:** owner-selected **30-day post-termination export-window target** remains a *draft negotiating position*, contingent on real capability, third-party constraints and the approved contract. Do not promise it to a buyer as effective.
- **Deletion/return:** final mechanism, timing, backup expiry and exceptions for tax, security, litigation or other legal holds must be set by data class and provider. A user-facing deletion is not instantaneous disappearance of all backups/logs.
- **Regulatory retention:** billing/tax records, audit/security data and workspace records may have different lawful periods. Do not advertise a single fixed lifetime.
- **Subprocessor assistance:** require relevant deletion/return and DSR assistance according to signed, lawful processor agreements.

## 7. Incidents, information and audit

- On becoming aware of a personal-data breach involving processor-scope customer data, proposed processor notification is **without undue delay**, accompanied by reasonably available details and subsequent updates. No unproved automatic 24-hour/48-hour promise is made.
- Controller regulatory notification and data-subject duties must be assessed by the controller based on actual Article 33/34 applicability; this processor schedule does not transfer the controller's statutory responsibility.
- Supplier will assist with relevant Articles 32–36 requests to the extent required by the binding DPA and available information.
- First-line buyer reviews may use evidence packs and questionnaires; owner-selected routine audit **once per 12 months** is a proposed procedure, **without excluding audits required by Article 28(3)(h)** or regulator instructions.
- No default availability percentage, service-credit promise, 24/7 service or guaranteed RPO/RTO. Any negotiated enterprise commitment requires operational proof and signed terms.

## 8. AI governance scope and limitations

RISCK COMPLY provides compliance-support workflows, not automatic legal conclusions or AI Act certification. Each customer is responsible for identifying whether its individual AI systems are in scope, whether it is provider/deployer or another regulated actor, its Article 5 and Article 50 obligations, applicable high-risk classification/exceptions, Article 9–15 provider controls and Article 27 fundamental-rights impact assessment when legally required.

The supplier's own classification as a governance software operator must be reassessed if the software begins invoking AI models, generating or materially manipulating synthetic media, or taking decisions in sensitive Annex III applications.

The current EU AI Act applicability timeline includes prohibited practices/AI literacy from **2 February 2025**, broad provisions from **2 August 2026**, and revised high-risk milestones **2 December 2027** (stand-alone) and **2 August 2028** (product-embedded). Specific rules, exceptions and transitions must be checked for the actual use and legal role. See the separate applicability matrix in this branch.

## 9. Customer-specific completion block (must be filled for any actual contract)

| Required confirmation | Final value |
| --- | --- |
| Exact approved supplier legal name, registered office, NIPC, authority/signatory | **PENDING OFFICIAL CORPORATE RECORDS** |
| Customer legal identity, controller/processor status, authorised signatory | **CUSTOMER INPUT REQUIRED** |
| Order Form ID, approved contract/DPA versions, effective date and precedence | **PENDING** |
| Nature/scope of customer processing and affected users | **CUSTOMER INPUT REQUIRED** |
| Additional data categories, high-risk/special-category restrictions and approved integrations | **CUSTOMER INPUT REQUIRED** |
| Approved supplier/subprocessor list including actual legal entities | **PENDING ACCOUNT/ROLE VALIDATION** |
| International transfers, adopted mechanism/modules and assessments | **PENDING FLOW-SPECIFIC VALIDATION** |
| Final TOMs and exact release/security evidence | **PENDING EXACT-PRODUCTION EVIDENCE** |
| Validated post-termination export and provider backup/deletion periods | **PENDING TECHNICAL/PROVIDER EVIDENCE** |
| Owner-approved legal/operational deviations | **PENDING APPROVAL** |
| Final privacy/cookies notice, lawful-basis and ePrivacy position | **PENDING FACTUAL/LEGAL PUBLICATION** |
| Valid execution/incorporation of DPA and Order Form | **PENDING** |

## 10. Review / acceptance rule

This document becomes a contract annex **only** when the verified details are completed, legal/commercial approvers accept the exact version as applicable, and the authorised company and customer complete the required agreement mechanism. The formal repository `legal-publication` control separately requires genuine `LEGAL_LAUNCH_ACCEPTED` evidence; this draft must never be used to manufacture that status.

### Canonical repository evidence (not incorporated automatically)

- `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/MASTER_SERVICES_AGREEMENT_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/ENTERPRISE_ORDER_FORM_REVIEW_DRAFT.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/legal-assurance/TOMS_MATRIX.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/evidence/LEGAL_PROCUREMENT_COMMERCIAL_CLOSURE_2026-10-03.md`
- `config/enterprise-100-closure.json`

### Official legal source references (reviewed 21 October 2026)

- GDPR (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Article 28 model controller–processor clauses, Decision (EU) 2021/915: https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj/eng
- Commission SCC FAQ (Article 28 versus Chapter V): https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en
- Commission international data transfer rules: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en
- EU Council AI Act 2026 amended calendar: https://www.consilium.europa.eu/en/policies/artificial-intelligence-act/timeline-artificial-intelligence/
- AI Act 2024/1689 and amending Regulation 2026/1744: https://eur-lex.europa.eu/eli/reg/2024/1689/oj and https://eur-lex.europa.eu/eli/reg/2026/1744/oj

```text
DOCUMENT=ENTERPRISE_DATA_PROCESSING_SECURITY_SCHEDULE_V7
DRAFT_FINALIZED_FOR_REVIEW=YES
CUSTOMER_READY_FOR_NEGOTIATION=YES_WITH_DISCLOSED_LIMITATIONS
SIGNED_OR_EFFECTIVE=NO
LEGAL_LAUNCH_ACCEPTED=NOT_CLAIMED
EXTERNAL_EMAILS_SENT=0
```
