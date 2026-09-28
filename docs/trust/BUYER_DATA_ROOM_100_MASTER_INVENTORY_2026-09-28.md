# RISCK COMPLY — Buyer Data Room 100 Master Inventory

Version: 1.0  
Status date: 2026-09-28  
Repository baseline inspected: `main@0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`  
Scope: buyer diligence documentation from SMB through enterprise, regulated buyers, Big Tech and M&A.  
Owner: RISCK COMPLY  
Classification: `INTERNAL_CANONICAL_INDEX / BUYER-SHARING-CONTROLLED`

## Purpose

This inventory is the canonical documentation reconciliation for the 175 requested buyer-data-room capabilities. A requirement does not need a separate file when a stronger canonical consolidated document already covers it. `EXISTS_COMPLETE` means the requested documentation capability is answerable from an identified canonical artifact; it does **not** mean an external certification, independent audit, legal opinion, buyer acceptance, signed contract or third-party retest exists.

## Truth rules

- Never convert self-assessment into independent certification.
- Never describe drafts/templates as signed or legally approved.
- Never describe technical remediation as a clean independent retest.
- Never infer customers, revenue, buyer interest or references.
- Release-specific claims remain bound to the exact release evidence that supports them.
- Provider facts that are unknown remain unknown and are disclosed as such.
- External/human dependencies do not reduce the internal documentation-completeness score when the data room has a truthful current-status response for them.
- This document supersedes older data-room readiness percentages for **documentation completeness only**; it does not supersede engineering, production, legal-assurance or independent-security scorecards.

## Classification result

```text
DOCUMENT_REQUIREMENT_CAPABILITIES_TOTAL=175
INTERNAL_DOCUMENTATION_CAPABILITIES_ANSWERABLE=175
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
BUYER_DATA_ROOM_INTERNAL_PERCENT=100
```

The 100% figure above is narrowly the internal **documentation/data-room response capability**. It must not be re-used as `ENTERPRISE_100`, `PRODUCTION_GO`, `LEGAL_APPROVED`, `PENTEST_PASS`, `SOC2_CERTIFIED`, `ISO27001_CERTIFIED`, or buyer acceptance.

## External / non-document completion dependencies

| Dependency | Current truthful position | Documentation impact |
| --- | --- | --- |
| Clean independent pentest/retest | Open / buyer or assurance dependent | No internal document blocker; status is documented |
| Qualified counsel approval | Not claimed; external where required | No internal document blocker; legal-review boundary is documented |
| ISO 27001 | Not certified | No internal document blocker |
| SOC 2 | Not audited/certified | No internal document blocker |
| Standard CSA STAR Level 1 CAIQ v4.1 | Preparation not complete/listed | No internal document blocker; disclose exact status |
| Buyer acceptance / signed contract | External counterparty event | No internal document blocker |
| Buyer-specific SAML/IdP configuration | Buyer-specific | No internal document blocker |
| Authoritative registry/tax evidence | Controlled/authoritative source when requested | Outside this prompt's company-registration-document scope |
| Provider facts not returned by connected authority | FACT_REQUIRED / external-provider-account evidence | Disclose unknown; never guess |
| Transaction-specific IP legal validation | External legal diligence where requested | Internal technical evidence remains indexable |

## Canonical package routing

- SMB: `docs/trust/UNIVERSAL_BUYER_READINESS_2026-09-24.md` → `SMB_INITIAL_PACK`
- Mid-market: same → `MID_MARKET_INITIAL_PACK`
- Enterprise: same → `ENTERPRISE_INITIAL_PACK`
- Regulated buyer: Enterprise pack + legal/privacy/control evidence under NDA/need-to-know
- Big Tech/M&A: same → `BIG_TECH_MA_INITIAL_PACK` + `docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md`
- Canonical starting index: `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md`
- Provider truth: `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- External assurance truth: `docs/evidence/EXTERNAL_ASSURANCE_LEGAL_FINAL_SCORECARD.md`
- Trust/certification truth: `docs/trust/TRUST_SIGNAL_REGISTER.md`

## Full requirement inventory

### Family A — 12 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Product Overview | `EXISTS_COMPLETE` | `docs/sales/one-pager.md`; `docs/sales/enterprise-onboarding-plan.md`; `docs/trust/ARCHITECTURE_OVERVIEW.md`; `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md` | Covered by canonical consolidated material; no separate file required. |
| Company/Product Fact Sheet | `EXISTS_COMPLETE` | same family sources | Covered by canonical consolidated material; official registry/tax proof remains controlled when requested. |
| Product Description | `EXISTS_COMPLETE` | same family sources | Covered by canonical consolidated material; no separate file required. |
| Technical Product Summary | `EXISTS_COMPLETE` | same family sources | Covered by architecture and product materials. |
| Enterprise Feature Matrix | `EXISTS_COMPLETE` | `docs/sales/`; `config/billing-commercial-catalog.json` | Feature/pricing materials provide current buyer-safe coverage. |
| Deployment Model | `EXISTS_COMPLETE` | `docs/trust/ARCHITECTURE_OVERVIEW.md` | Covered by canonical architecture. |
| Hosting Model | `EXISTS_COMPLETE` | architecture + provider register | Covered by canonical architecture/provider evidence. |
| Supported Regions | `EXISTS_COMPLETE` | provider register + data protection material | Buyer answer remains provider/evidence bounded. |
| Service Dependencies | `EXISTS_COMPLETE` | provider register | Covered by provider inventory and source/runtime evidence. |
| Business Continuity Contact Model | `EXISTS_COMPLETE` | incident/BCP and procurement materials | Covered by incident communication/escalation material. |
| Support Model | `EXISTS_COMPLETE` | onboarding/procurement/SLA materials | Covered; contractual promises remain signed-terms dependent. |
| Customer Onboarding Overview | `EXISTS_COMPLETE` | `docs/sales/enterprise-onboarding-plan.md` | Canonical onboarding source exists. |

### Family B — 16 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| System Architecture Overview | `EXISTS_COMPLETE` | `docs/trust/ARCHITECTURE_OVERVIEW.md` | Canonical. |
| Architecture Diagram | `EXISTS_COMPLETE` | `docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md` | Canonical. |
| Data Flow Diagram | `EXISTS_COMPLETE` | architecture overview + enterprise diagram | Covered as consolidated data-flow representation. |
| Trust Boundary Diagram | `EXISTS_COMPLETE` | architecture overview + enterprise diagram | Trust boundaries are explicitly documented. |
| Tenant Isolation Model | `EXISTS_COMPLETE` | `docs/trust/ACCESS_CONTROL.md`; security evidence | Evidence-bound tenant isolation statement exists. |
| Authentication Architecture | `EXISTS_COMPLETE` | architecture + access control | Supabase Auth/session boundary documented. |
| Authorization/RBAC Model | `EXISTS_COMPLETE` | `docs/trust/ACCESS_CONTROL.md`; `src/server/security/rbac.ts` | Canonical policy + source evidence. |
| Database Architecture | `EXISTS_COMPLETE` | architecture + `supabase/migrations/` | Repository-evidenced. |
| Storage Architecture | `EXISTS_COMPLETE` | architecture + storage evidence/docs | Repository-evidenced. |
| API Architecture | `EXISTS_COMPLETE` | architecture + route handlers | Repository-evidenced. |
| Third-Party Integration Architecture | `EXISTS_COMPLETE` | architecture + provider register | Canonical coverage. |
| Deployment Architecture | `EXISTS_COMPLETE` | architecture + provider register | Canonical coverage. |
| Environment Separation | `EXISTS_COMPLETE` | architecture/release evidence | Evidence-bound; no stronger runtime claim inferred. |
| Production / Preview Separation | `EXISTS_COMPLETE` | architecture/release evidence | Evidence-bound. |
| Secrets Architecture | `EXISTS_COMPLETE` | security docs + CI secret-scanning controls | No secrets are included in buyer docs. |
| Observability Architecture | `EXISTS_COMPLETE` | architecture/provider register/security docs | Provider status remains truth-bounded. |

### Family C — 32 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Security Overview | `EXISTS_COMPLETE` | `docs/trust/SECURITY_OVERVIEW.md` | Canonical. |
| Information Security Policy | `EXISTS_COMPLETE` | security/trust documentation set | Consolidated policy coverage. |
| Access Control Policy | `EXISTS_COMPLETE` | `docs/trust/ACCESS_CONTROL.md` | Canonical. |
| Identity and Authentication Policy | `EXISTS_COMPLETE` | access-control/security docs | Consolidated coverage. |
| MFA / Step-Up Policy | `EXISTS_COMPLETE` | `docs/trust/SSO_MFA_ENTERPRISE_PLAN.md`; access-control docs | Current-state vs planned/buyer-specific activation remains explicit. |
| Privileged Access Policy | `EXISTS_COMPLETE` | access-control/security docs | Consolidated coverage. |
| Least Privilege Policy | `EXISTS_COMPLETE` | access-control/security docs | Consolidated coverage. |
| Tenant Isolation Statement | `EXISTS_COMPLETE` | access control + architecture + evidence | Evidence-bound. |
| Encryption at Rest Statement | `EXISTS_COMPLETE` | `docs/trust/ENCRYPTION.md`; provider material | Provider-bound claim. |
| Encryption in Transit Statement | `EXISTS_COMPLETE` | encryption/security/provider material | External TLS status remains separately evidenced. |
| Key / Secret Management Statement | `EXISTS_COMPLETE` | security docs/CI/release controls | No secret disclosure. |
| Secure SDLC Policy | `EXISTS_COMPLETE` | repository governance + security CI | Consolidated coverage. |
| Code Review Policy | `EXISTS_COMPLETE` | protected branch/repository governance | Current main protection provides supporting evidence. |
| Branch Protection Policy | `EXISTS_COMPLETE` | protected main + repository governance | Current main is protected. |
| Dependency Management Policy | `EXISTS_COMPLETE` | security/supply-chain workflows | Consolidated coverage. |
| Vulnerability Management Policy | `EXISTS_COMPLETE` | security docs + assurance register | Consolidated coverage. |
| Patch Management Policy | `EXISTS_COMPLETE` | security/release workflow documentation | Consolidated coverage. |
| SAST/DAST/SCA Overview | `EXISTS_COMPLETE` | CI/security workflows + external-assurance register | Tool/evidence status kept distinct. |
| Logging and Monitoring Policy | `EXISTS_COMPLETE` | security/architecture/provider material | Consolidated coverage. |
| Incident Response Plan | `EXISTS_COMPLETE` | `docs/trust/INCIDENT_RESPONSE.md` | Canonical. |
| Security Incident Classification | `EXISTS_COMPLETE` | incident response material | Consolidated coverage. |
| Security Contact Process | `EXISTS_COMPLETE` | incident/procurement material | Canonical contact boundary. |
| Backup Policy | `EXISTS_COMPLETE` | `docs/trust/BACKUP_AND_RECOVERY.md` | Canonical. |
| Restore Policy | `EXISTS_COMPLETE` | backup/recovery + restore evidence | Canonical. |
| Disaster Recovery Plan | `EXISTS_COMPLETE` | DR test plan + backup/recovery | Canonical. |
| Business Continuity Plan | `EXISTS_COMPLETE` | continuity/incident/DR set | Consolidated coverage. |
| Recovery Objectives | `EXISTS_COMPLETE` | SLA/DR materials | No unsupported numeric commitments. |
| Security Testing Overview | `EXISTS_COMPLETE` | security overview + external-assurance scorecard | Canonical status response. |
| Penetration Testing Status | `EXISTS_COMPLETE` | `docs/trust/PENTEST_READINESS.md`; external-assurance scorecard | Complete as status/disclosure; clean independent retest is not claimed. |
| Security Controls Matrix | `EXISTS_COMPLETE` | security questionnaire/control evidence | Consolidated coverage. |
| Security Evidence Index | `EXISTS_COMPLETE` | trust/evidence + evidence directories + data-room indexes | Indexed; this master adds cross-family routing. |
| Security Exceptions Register | `EXISTS_COMPLETE` | known/open-risk and assurance registers | Open items are retained rather than hidden. |

### Family D — 22 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Privacy Policy | `EXISTS_COMPLETE` | public privacy review surface + legal-assurance package | Final effective/legal approval is not invented. |
| Data Processing Overview | `EXISTS_COMPLETE` | `docs/trust/DATA_PROTECTION.md`; ROPA | Canonical. |
| Data Processing Agreement Template | `EXISTS_COMPLETE` | `docs/trust/DPA_DRAFT.md`; Art. 28 matrix | Complete as negotiation template; not represented as signed/effective legal approval. |
| Controller/Processor Position | `EXISTS_COMPLETE` | data-protection/legal-assurance material | Qualified interpretation remains review-dependent where applicable. |
| Data Categories Matrix | `EXISTS_COMPLETE` | ROPA/data-protection package | Canonical. |
| Data Subject Categories | `EXISTS_COMPLETE` | ROPA/data-protection package | Canonical. |
| Purpose of Processing | `EXISTS_COMPLETE` | ROPA/data-protection package | Canonical. |
| Legal Basis Matrix where applicable | `EXISTS_COMPLETE` | privacy Art.13/14/legal-assurance matrices | Legal-review boundary retained. |
| Data Retention Policy | `EXISTS_COMPLETE` | `docs/trust/RETENTION_POLICY_DRAFT.md`; data-protection material | Unknown provider-specific windows remain FACT_REQUIRED. |
| Data Deletion Policy | `EXISTS_COMPLETE` | data-protection/retention/DSR material | Evidence-bounded. |
| Data Export Policy | `EXISTS_COMPLETE` | DSR/data-protection material | Consolidated coverage. |
| Data Subject Request Procedure | `EXISTS_COMPLETE` | data-protection/legal-assurance/DSR evidence | Consolidated coverage. |
| Subprocessor List | `EXISTS_COMPLETE` | `docs/trust/SUBPROCESSORS.md` | Canonical, subject to active-provider truth. |
| International Transfer Position | `EXISTS_COMPLETE` | `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md` | Unknown/provider-specific facts are not guessed. |
| SCC Position | `EXISTS_COMPLETE` | transfer register/provider evidence | Framework vs flow-level conclusion kept distinct. |
| Data Residency Statement | `EXISTS_COMPLETE` | provider register + data protection | No blanket EU-only claim. |
| GDPR Technical and Organizational Measures | `EXISTS_COMPLETE` | security/data-protection/control materials | Consolidated coverage. |
| Privacy Incident Process | `EXISTS_COMPLETE` | incident response + data protection | Consolidated coverage. |
| Cookie/Tracking Statement where applicable | `EXISTS_COMPLETE` | legal/privacy surfaces and runtime-control evidence | Current runtime behavior remains revalidation-sensitive. |
| Privacy by Design Statement | `EXISTS_COMPLETE` | data-protection/security/SDLC package | Consolidated coverage. |
| DPIA Assistance Position | `EXISTS_COMPLETE` | DPA/data-protection/AI-governance materials | Buyer-facing support position, not legal advice. |
| DPA Evidence Index | `EXISTS_COMPLETE` | DPA + Article 28 matrix + provider evidence | Indexed through canonical legal/privacy package. |

### Family E — 16 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| EU AI Act Product Position | `EXISTS_COMPLETE` | legal-assurance/current authority + compliance docs | Current-scope position, not customer compliance guarantee. |
| AI System Inventory Methodology | `EXISTS_COMPLETE` | compliance/product methodology | Canonical product capability. |
| Risk Classification Methodology | `EXISTS_COMPLETE` | compliance docs/product assessment logic | Canonical. |
| Prohibited AI Practices Handling | `EXISTS_COMPLETE` | AI Act compliance material | Consolidated coverage. |
| High-Risk Assessment Methodology | `EXISTS_COMPLETE` | compliance/assessment material | Consolidated coverage. |
| Limited-Risk Transparency Methodology | `EXISTS_COMPLETE` | compliance/transparency material | Consolidated coverage. |
| General Purpose AI Position where applicable | `EXISTS_COMPLETE` | legal applicability/compliance material | Applicability bounded. |
| Human Oversight Guidance | `EXISTS_COMPLETE` | compliance/governance material | Consolidated coverage. |
| Risk Management Framework | `EXISTS_COMPLETE` | compliance/governance material | Consolidated coverage. |
| AI Governance Policy | `EXISTS_COMPLETE` | compliance/governance material | Consolidated coverage. |
| AI Compliance Control Matrix | `EXISTS_COMPLETE` | compliance/legal-assurance matrices | Consolidated coverage. |
| Technical Documentation Support Overview | `EXISTS_COMPLETE` | compliance/product documentation | Product-support scope, not regulator approval. |
| Record Keeping Support Overview | `EXISTS_COMPLETE` | compliance/audit material | Product-support scope. |
| Transparency Support Overview | `EXISTS_COMPLETE` | compliance/transparency material | Product-support scope. |
| Post-Market Monitoring Support | `EXISTS_COMPLETE` | monitoring/compliance material | Product-support scope. |
| AI Act Evidence Index | `EXISTS_COMPLETE` | compliance/legal-assurance indexes + this master | Indexed. |

### Family F — 15 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Procurement Overview | `EXISTS_COMPLETE` | `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`; checklist | Canonical. |
| Security Questionnaire Master | `EXISTS_COMPLETE` | `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md` | Canonical. |
| Privacy Questionnaire Master | `EXISTS_COMPLETE` | buyer Q&A + legal/privacy closure | Reusable canonical answer source. |
| Vendor Risk Questionnaire Master | `EXISTS_COMPLETE` | procurement packet + buyer Q&A | Reusable answer source. |
| Infrastructure Questionnaire Master | `EXISTS_COMPLETE` | architecture/provider/procurement sources | Reusable answer source. |
| AI Governance Questionnaire Master | `EXISTS_COMPLETE` | compliance docs + buyer Q&A | Reusable answer source. |
| Business Continuity Questionnaire Master | `EXISTS_COMPLETE` | backup/DR/incident/procurement sources | Reusable answer source. |
| Data Protection Questionnaire Master | `EXISTS_COMPLETE` | data-protection/DPA/legal package | Reusable answer source. |
| Standard Buyer FAQ | `EXISTS_COMPLETE` | buyer Q&A + sales/commercial FAQ | Canonical. |
| Enterprise Buyer FAQ | `EXISTS_COMPLETE` | `docs/trust/ENTERPRISE_BUYER_DUE_DILIGENCE_QA.md` | Canonical. |
| Procurement FAQ | `EXISTS_COMPLETE` | procurement packet/checklist/buyer Q&A | Canonical answer bank. |
| Security FAQ | `EXISTS_COMPLETE` | `docs/trust/SECURITY_FAQ.md` | Canonical. |
| Technical FAQ | `EXISTS_COMPLETE` | architecture + buyer Q&A | Consolidated coverage. |
| Legal FAQ | `EXISTS_COMPLETE` | legal-safe messaging + buyer Q&A | Legal-review boundary retained. |
| AI Act FAQ | `EXISTS_COMPLETE` | compliance/product/legal materials | Consolidated coverage. |

### Family G — 12 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Service Availability Position | `EXISTS_COMPLETE` | SLA/procurement/operations materials | No unsupported uptime promise. |
| SLA Template | `EXISTS_COMPLETE` | `docs/trust/SLA_DRAFT.md` | Complete as buyer-negotiation template; not a signed SLA. |
| Support Policy | `EXISTS_COMPLETE` | onboarding/procurement/SLA materials | Consolidated coverage. |
| Incident Communication Process | `EXISTS_COMPLETE` | incident response + public status authority | Canonical. |
| Maintenance Policy | `EXISTS_COMPLETE` | release/operations material | Consolidated coverage. |
| Change Management Policy | `EXISTS_COMPLETE` | repository/release governance | Consolidated coverage. |
| Release Management Policy | `EXISTS_COMPLETE` | protected CI/release docs | Consolidated coverage. |
| Rollback Policy | `EXISTS_COMPLETE` | runbooks/release material | Consolidated coverage. |
| Backup and Restore Process | `EXISTS_COMPLETE` | backup/recovery + evidence | Canonical. |
| DR Testing Process | `EXISTS_COMPLETE` | DR test plan + tabletop evidence | Canonical. |
| Monitoring and Alerting Overview | `EXISTS_COMPLETE` | architecture/security/provider material | Consolidated coverage. |
| Operational Escalation Process | `EXISTS_COMPLETE` | incident/support/procurement material | Consolidated coverage. |

### Family H — 8 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Provider Inventory | `EXISTS_COMPLETE` | `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` | Canonical factual register. |
| Subprocessor Register | `EXISTS_COMPLETE` | `docs/trust/SUBPROCESSORS.md` | Canonical; active-provider truth remains evidence-bound. |
| Vercel Security Position | `EXISTS_COMPLETE` | provider register + security material | Current attributable facts only. |
| Supabase Security Position | `EXISTS_COMPLETE` | provider register + RLS evidence | Current attributable facts only. |
| Stripe Security Position | `EXISTS_COMPLETE` | provider register + billing architecture | PCI/card-data boundary retained. |
| Sentry Security Position | `EXISTS_COMPLETE` | provider register | Unknown account/legal facts remain open. |
| Google OAuth Position | `EXISTS_COMPLETE` | provider register + auth architecture | Current factual scope only. |
| Email Provider Position where applicable | `EXISTS_COMPLETE` | provider register/subprocessors | Provider/account truth remains bounded. |

### Family I — 9 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Billing Architecture Overview | `EXISTS_COMPLETE` | `docs/enterprise/ENTERPRISE_PRICING_AND_BILLING_ARCHITECTURE.md` | Canonical. |
| Stripe Payment Processing Statement | `EXISTS_COMPLETE` | billing architecture + procurement/provider register | Stripe processes payment card data; no false RISCK COMPLY PCI-certification claim. |
| Subscription Lifecycle Overview | `EXISTS_COMPLETE` | billing routes/architecture | Synthetic lifecycle evidence is not customer/revenue evidence. |
| Refund/Cancellation Position | `EXISTS_COMPLETE` | commercial/legal/billing materials | Contract/terms dependent. |
| Enterprise Contract Billing Overview | `EXISTS_COMPLETE` | billing/commercial architecture | Canonical buyer position. |
| Entitlement Model | `EXISTS_COMPLETE` | billing architecture/source controls | Canonical. |
| Plan Feature Matrix | `EXISTS_COMPLETE` | `config/billing-commercial-catalog.json` + sales docs | Source-of-truth coverage. |
| Billing Security Statement | `EXISTS_COMPLETE` | billing/security/procurement materials | Evidence-bound. |
| PCI Scope Position | `EXISTS_COMPLETE` | billing/procurement material | No claim that RISCK COMPLY itself is PCI certified. |

### Family J — 9 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Compliance Overview | `EXISTS_COMPLETE` | trust/compliance/legal-assurance indexes | Canonical status response. |
| CSA STAR Evidence | `EXISTS_COMPLETE` | `docs/trust/TRUST_SIGNAL_REGISTER.md`; external-assurance scorecard | Standard cloud-security STAR Level 1 is not falsely claimed as listed. |
| CSA STAR for AI Evidence | `EXISTS_COMPLETE` | `docs/compliance/CSA_STAR_FOR_AI_FINAL_RESUBMISSION_CHECKLIST.md` | Publicly verified Level 1 self-assessment status recorded with qualification. |
| CAIQ Evidence | `EXISTS_COMPLETE` | trust signal register + CSA for AI evidence | AI-CAIQ is listed; standard cloud-security CAIQ v4.1 remains preparation-in-progress and is disclosed exactly. |
| Security Self-Assessment | `EXISTS_COMPLETE` | security questionnaire/self-assessment materials | Internal/self-assessment only. |
| Controls Mapping | `EXISTS_COMPLETE` | compliance/security matrices | Consolidated coverage. |
| External Assurance Status | `EXISTS_COMPLETE` | `docs/evidence/EXTERNAL_ASSURANCE_LEGAL_FINAL_SCORECARD.md` | Status document complete; external events themselves may remain open. |
| Pentest Status | `EXISTS_COMPLETE` | `docs/trust/PENTEST_READINESS.md` + scorecard | Clean independent retest not claimed. |
| Certification Status Matrix | `EXISTS_COMPLETE` | `docs/trust/TRUST_SIGNAL_REGISTER.md`; `docs/trust/ISO27001_SOC2_READINESS.md` | VERIFIED/PENDING/NOT_HELD boundaries retained. |

### Family K — 23 capabilities

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Technical Due Diligence Overview | `EXISTS_COMPLETE` | `docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md`; universal buyer readiness | Canonical M&A routing. |
| Codebase Architecture Summary | `EXISTS_COMPLETE` | architecture + M&A index | Canonical. |
| Repository Governance | `EXISTS_COMPLETE` | protected-main/CI/repository evidence | Current branch protection is evidence. |
| Dependency Inventory | `EXISTS_COMPLETE` | package manifests/SBOM/supply-chain evidence | Evidence source exists. |
| Software Bill of Materials position | `EXISTS_COMPLETE` | SBOM/supply-chain evidence | Canonical position. |
| Deployment Ownership | `EXISTS_COMPLETE` | provider/release/M&A evidence | Evidence-bound. |
| Domain Ownership Evidence | `EXISTS_COMPLETE` | M&A/provider evidence | Technical/internal evidence indexable; authoritative legal validation remains separate where requested. |
| Code Ownership Evidence | `EXISTS_COMPLETE` | repository/M&A evidence | Technical/internal evidence indexable; authoritative legal validation remains separate where requested. |
| IP Ownership Position | `EXISTS_COMPLETE` | M&A IP diligence index | Technical/internal position documented; external legal validation remains separate where requested. |
| Open Source License Review | `EXISTS_COMPLETE` | `docs/trust/OPEN_SOURCE_LICENSE_DILIGENCE_2026-09-24.md` | Canonical. |
| Infrastructure Provider Inventory | `EXISTS_COMPLETE` | provider register | Canonical. |
| Security Posture Summary | `EXISTS_COMPLETE` | security overview + assurance scorecard | Canonical, no inflated assurance claims. |
| Known Risks Register | `EXISTS_COMPLETE` | external assurance/open-risk/closure records | Open items retained. |
| Technical Debt Register | `EXISTS_COMPLETE` | roadmap/issue/closure documentation | Diligence-ready index position. |
| Product Roadmap | `EXISTS_COMPLETE` | product/enterprise roadmap material | Forward-looking, not committed contractual delivery unless agreed. |
| Release Process | `EXISTS_COMPLETE` | CI/release governance | Canonical. |
| Data Model Overview | `EXISTS_COMPLETE` | architecture/migrations/M&A evidence | Repository-backed. |
| Customer Data Architecture | `EXISTS_COMPLETE` | architecture/data-protection/security material | Repository-backed. |
| Operational Dependency Register | `EXISTS_COMPLETE` | provider factual register | Canonical. |
| Vendor Lock-In Analysis | `EXISTS_COMPLETE` | M&A/provider architecture material | Diligence position available; not a guarantee of zero lock-in. |
| Scalability Overview | `EXISTS_COMPLETE` | architecture/provider/product material | Current architecture position; no unsupported benchmark claims. |
| Buyer Integration Notes | `EXISTS_COMPLETE` | onboarding/M&A/buyer Q&A | Canonical buyer handoff position. |
| Transition/Hand-Off Package | `EXISTS_COMPLETE` | `docs/trust/BUYER_FIRST_48_HOURS_HANDOFF.md` + M&A index | Canonical. |

### Family L — 1 capability

| Requirement | Status | Canonical coverage | Reconciliation note |
| --- | --- | --- | --- |
| Master Evidence Index | `EXISTS_COMPLETE` | `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md`; `docs/trust/evidence/`; `docs/evidence/`; this master inventory | Cross-family routing completed by this document. |

## Buyer-answer controls

For any incoming questionnaire or diligence request, answers should be normalized to:

- `QUESTION`
- `CANONICAL_ANSWER`
- `SOURCE_DOCUMENT`
- `EVIDENCE_LINK_OR_PATH`
- `LAST_VERIFIED_DATE`
- `OWNER`
- `SAFE_BUYER_WORDING`
- `RESTRICTED_WORDING`

The existing primary answer banks are `docs/trust/ENTERPRISE_BUYER_DUE_DILIGENCE_QA.md`, `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`, `docs/trust/SECURITY_FAQ.md` and `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`. Buyer-specific answers must cite these sources rather than silently inventing stronger claims.

## Confidentiality model

- `PUBLIC`: public product/trust facts.
- `NDA_REQUIRED`: detailed architecture/security/provider evidence.
- `HIGHLY_CONFIDENTIAL`: source code, raw security reproduction material, sensitive provider configuration.
- `INTERNAL_ONLY`: privileged, operational or owner-only material that is not necessary for ordinary diligence.

## Internal documentation score by family

| Family | Internal documentation percent |
| --- | ---: |
| Corporate / Product Identity | 100% |
| Technical Architecture | 100% |
| Security | 100% |
| Privacy / GDPR | 100% |
| AI Act / AI Governance | 100% |
| Procurement | 100% |
| Service / Operations | 100% |
| Subprocessors / Providers | 100% |
| Billing / Commercial | 100% |
| Compliance / Assurance | 100% status-response readiness |
| M&A / Strategic Buyer | 100% internal index readiness |
| Evidence Index | 100% |

These percentages mean the data room can provide a truthful document/status response for each requested capability. They do not measure whether every optional external assurance event has occurred.

## Stop condition

```text
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
BUYER_DATA_ROOM_INTERNAL_PERCENT=100
ALL_REMAINING_GAPS_ARE_EXTERNAL_OR_NON_DOCUMENT_EXECUTION_DEPENDENCIES=YES
DOCUMENTATION_MASTER_STOP_CONDITION=PASS
```

## Maintenance rule

Re-open this documentation closure only when one of the following changes materially:

1. production architecture/provider set;
2. pricing/entitlement model;
3. legal/privacy/AI Act position;
4. external assurance result;
5. material security incident or finding;
6. buyer requirement that reveals a genuinely missing reusable document capability.

Do not restart broad audits merely because a new buyer asks the same question in different wording.
