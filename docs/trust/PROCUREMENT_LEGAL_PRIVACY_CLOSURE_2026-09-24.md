# RISCK COMPLY — Procurement + Legal + Privacy Terminal Closure

Date: 2026-09-24  
Scope: DPA, SCC/international transfers, subprocessors, Privacy Policy, Terms, retention/deletion, Security, incident process, data residency, AI Act/GDPR documentation and enterprise procurement package.  
Status: `INTERNAL_PROCUREMENT_READY / LEGAL_PRIVACY_FACTUAL_CLOSURE_PARTIAL / EXTERNAL_ACCEPTANCE_SEPARATE`

This is the canonical buyer-readiness reconciliation for this workstream. It does not convert drafts, provider framework documents, internal controls or owner decisions into executed contracts, legal opinions, certifications or buyer acceptance.

## Terminal decision matrix

| Area | Internal state | Buyer-safe current answer | External/factual remainder |
| --- | --- | --- | --- |
| DPA / GDPR Article 28 | `PASS_INTERNAL_STRUCTURE` | A versioned Article 28 review draft, control matrix, processing annex structure, TOM references, rights assistance, breach assistance, deletion/return and audit-right structure exist. | Final party identity, annex facts, binding incorporation/signature, final commercial wording and qualified review when actually required. |
| SCC / international transfers | `PASS_REGISTER_AND_BOUNDARY` | Transfers are tracked provider-by-provider. EU Commission Article 28 clauses are not misrepresented as Chapter V transfer SCCs. Provider SCC/DPF/adequacy frameworks are credited only where attributable. | Flow-level access/location facts and the final Chapter V mechanism/TIA conclusion where a transfer actually requires one. |
| Subprocessors | `PASS_ACTIVE_REGISTER_PARTIAL_FACTS` | The active provider register identifies use, data/purpose, known region/account facts, DPA framework and open gaps. | Some exact account/entity, retention, access and onward-transfer facts remain provider-specific. |
| Privacy Policy | `PASS_REVIEW_SURFACE_NOT_EFFECTIVE` | Public privacy content covers purposes, data categories, recipients, rights, transfers, retention criteria, complaint route and analytics/consent boundaries. | Final effective publication requires authoritative operator/entity facts and reconciliation of remaining provider/retention/legal-basis facts. |
| Terms | `PASS_REVIEW_SURFACE_NOT_EFFECTIVE` | B2B service scope, acceptable use, AI-output boundaries, customer content, billing/renewal positions, termination, post-termination export, liability proposal and Portuguese-law/Lisbon-forum proposal are documented. | Final enforceability, registry/tax facts and deliberate effective publication/incorporation. |
| Retention / deletion | `PASS_TECHNICAL_AND_PROCESS_STRUCTURE / FINAL_PERIODS_PARTIAL` | Category-specific retention logic, DSR export/delete workflows and post-termination deletion/return structure exist; no unsupported universal deletion promise is made. | Final legal/business duration by category plus downstream provider backup/log lifecycle facts. |
| Security page / TOMs | `PASS_PUBLIC_EVIDENCE_BOUND` | Public security content and trust documentation describe implemented controls with explicit non-claims for unheld certifications and unsupported guarantees. | Contract-specific TOM schedule may require current provider/account evidence and buyer negotiation. |
| Incident / breach process | `PASS_DOCUMENTED` | Intake, severity, triage, containment, evidence preservation, customer communication, recovery and post-incident review are documented. DPA structure uses “without undue delay” rather than an invented fixed processor-notice SLA. | Any tighter contractual notification target, 24/7 staffing or retained incident-response service requires real operational evidence/contract. |
| Data residency | `PASS_DISCLOSURE_BOUNDARY` | Supabase Production is currently evidenced in `eu-west-1` (Ireland). RISCK COMPLY does not claim that all processing remains exclusively in the EU because other active providers may use additional/global locations. | Account-specific provider access/storage/backup locations and transfer mechanisms must remain current. |
| AI Act documentation | `PASS_CURRENT_SCOPE_CLASSIFICATION_AND_DOCUMENTATION` | Current evidence classifies the customer-facing product as deterministic governance/compliance software with no attributable direct model invocation in the SaaS runtime; AI Act applicability is change-trigger controlled. | Reopen on model invocation, synthetic-content generation, high-risk use, biometrics, employment/credit/essential-service decisioning or other scope change. |
| GDPR documentation | `PASS_INTERNAL_FRAMEWORK / FINAL_PUBLICATION_PARTIAL` | ROPA, Art. 13/14 matrix, Article 28 matrix, DSR controls, DPO/DPIA screening, transfer register, provider register and TOM/control evidence exist. | Final controller/processor allocation, effective notices/contracts and remaining provider/retention facts. |
| Procurement package | `PASS_INTERNAL_BUYER_DILIGENCE` | Public procurement API, security questionnaire, Trust Center, evidence-bound provider catalog and controlled data-room index exist. | Actual buyer acceptance, buyer-specific questionnaire, negotiated schedules and any requested external assurance are external events. |

## Canonical procurement bundle

### Public buyer surfaces

- `/[locale]/trust`
- `/[locale]/security`
- `/[locale]/privacy`
- `/[locale]/terms`
- `/[locale]/dpa`
- `/[locale]/subprocessors`
- `/[locale]/transfers`
- `/[locale]/cookie-policy`
- `/[locale]/acceptable-use`
- `/[locale]/compliance`
- `/[locale]/sla`
- `/[locale]/status`
- `/[locale]/trust/procurement-pack`
- `/[locale]/trust/security-questionnaire`

### Controlled internal/customer-review artifacts

- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/PROCUREMENT_CHECKLIST.md`
- `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-12.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/legal-assurance/ROPA.md`
- `docs/legal-assurance/PRIVACY_ART13_14_MATRIX.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md`
- `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/PRIVACY_POLICY_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/TERMS_OF_SERVICE_REVIEW_DRAFT.md`
- `docs/legal-review-preparation/legal-pack/SERVICE_SUPPORT_INCIDENT_SCHEDULE_REVIEW_DRAFT.md`

## DPA / SCC rule

The Article 28 DPA and GDPR Chapter V transfer mechanism are separate controls.

- Commission Implementing Decision (EU) 2021/915 controller-processor clauses support Article 28 contracting.
- Chapter V requires a transfer-specific lawful mechanism when personal data is transferred to a third country without an applicable adequacy basis.
- Provider SCC/DPF/adequacy framework evidence must not be promoted to a RISCK COMPLY flow-level conclusion until the actual provider, account, data flow and access/storage facts are attributable.

## Retention / deletion rule

RISCK COMPLY uses category-specific criteria rather than one universal retention promise. Customer-facing commitments must remain consistent with:

1. active-service operational need;
2. customer instructions and valid DSRs;
3. accounting/tax/legal-hold requirements;
4. security/audit evidence needs;
5. provider backup/log lifecycle constraints; and
6. the applicable signed DPA/order/Terms.

A product delete action is not by itself proof that all downstream provider copies disappeared instantly.

## Incident / breach rule

Security incidents and personal-data breaches are related but not identical.

- Operational security workflow: intake → triage → containment → preservation → remediation → communication → post-incident review.
- GDPR processor assistance: notify the customer/controller without undue delay after awareness where Article 33(2) applies and provide reasonably available information.
- Controller regulatory deadlines, data-subject notice duties and contractual deadlines depend on role, facts and applicable law/agreement.

## Data residency statement

Buyer-safe statement:

> The primary Production Supabase project is currently evidenced in `eu-west-1` (Ireland). RISCK COMPLY also uses other infrastructure and operational providers that may process or access data from additional locations. We therefore do not make a blanket “EU-only processing” claim. Current provider, region and international-transfer information is maintained in the subprocessor and transfer registers.

## External security assessment statement

Buyer-safe statement:

> A third-party black-box web application assessment was completed on 12 September 2026 and an attributable confidential report was received. The two original High findings concerned TLS 1.0/1.1 acceptance; subsequent configuration and external validation evidence support technical remediation. A clean independent retest/terminal assurance report remains open, and the assessment is not represented as a blanket authenticated tenant-isolation or certification result.

## What is actually closed by this workstream

```text
PROCUREMENT_INTERNAL_READY=PASS
PUBLIC_SECURITY_AND_TRUST_SURFACES=PASS_PRESENT
DPA_ARTICLE_28_INTERNAL_STRUCTURE=PASS
SUBPROCESSOR_REGISTER=PASS_PRESENT_FACTS_PARTIAL
TRANSFER_REGISTER=PASS_PRESENT_FLOW_CONCLUSIONS_PARTIAL
PRIVACY_REVIEW_SURFACE=PASS_NOT_EFFECTIVE
TERMS_REVIEW_SURFACE=PASS_NOT_EFFECTIVE
RETENTION_DELETION_INTERNAL_PROCESS=PASS_FINAL_PERIODS_PARTIAL
INCIDENT_PROCESS=PASS_DOCUMENTED
DATA_RESIDENCY_DISCLOSURE=PASS_NO_EU_ONLY_OVERCLAIM
AI_ACT_CURRENT_SCOPE_DOCUMENTATION=PASS_CHANGE_TRIGGER_CONTROLLED
GDPR_INTERNAL_DOCUMENTATION=PASS_FRAMEWORK_FINAL_PUBLICATION_PARTIAL
BUYER_ACCEPTANCE=EXTERNAL
FINAL_EFFECTIVE_LEGAL_CONTRACT_SET=BLOCKED_ON_FACTS_AND_WHERE_REQUIRED_QUALIFIED_REVIEW
```

No internal documentation task may convert the two external lines above into PASS without attributable evidence.
