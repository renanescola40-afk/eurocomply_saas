# Data Processing Addendum — Review Draft

**Status:** `REVIEW_DRAFT` · `FOUNDER_FACT_REQUIRED` · `OWNER_DPA_POSITIONS_SELECTED` · `COUNSEL_DECISION_REQUIRED`

This DPA is prepared for GDPR Article 28 review. It is not an executed agreement and does not become binding until authoritative registered details for the owner-designated contracting party, provider/account facts, the processing annexes, qualified legal review where required, and incorporation into a binding customer agreement are completed.

The owner-approved drafting positions in `docs/legal-assurance/OWNER_LEGAL_DECISIONS_V1_2026-09-12.md` are incorporated below as owner-selected contract inputs. They close the owner-policy decisions for subprocessor mechanics, audit mechanics and breach-notification target without creating qualified legal acceptance.

## 1. Parties and scope

The owner has explicitly designated **SAMUEL CERQUEIRA, UNIPESSOAL LDA** as the RISCK COMPLY operator and customer contracting entity. For review preparation, that same entity is therefore the intended RISCK COMPLY processor-side contractual party where the DPA applies. This owner designation does **not** by itself establish authoritative registered office, registered identifiers, VAT facts, signatory authority or qualified Article 28 acceptance, so final processor-party publication/signature remains blocked on those separate gates.

For customer personal data processed through the contracted service on documented customer instructions, the customer may act as controller or processor depending on its own processing role, and RISCK COMPLY is intended to act as processor or subprocessor for that instructed processing. Provider-controlled website, account, commercial, billing, support, security and similar processing is assessed separately under the Privacy notice and role matrix.

## 2. Definitions and precedence

GDPR terms have their statutory meaning. For personal-data processing covered by this DPA, the proposed contractual model is that this DPA prevails over inconsistent general terms, while an order form may specify customer-specific processing details without weakening mandatory data-protection protections.

The proposed standard liability position is recorded in the owner Legal Package V1, but mandatory-law carve-outs and final allocation between controller and processor remain subject to qualified drafting and the final agreement.

## 3. Processing instructions

The proposed processor obligation is to process customer personal data only on documented instructions from the customer, including in relation to transfers, unless Union or Member-State law requires otherwise. Where legally permitted, the processor will inform the customer of that legal requirement before processing.

If an instruction appears to infringe applicable Union or Member-State data-protection law, the processor-side process must allow that concern to be raised promptly. Product output is not treated as an automatic customer-specific legal determination.

Customer Content must not be used to train third-party or provider AI/ML models without a separate specific lawful basis/authorisation and an implemented, disclosed processing arrangement.

## 4. Confidentiality

Persons authorised to process customer personal data must be subject to confidentiality obligations and access limited to their duties. Operational evidence for access control, role scoping and security controls must remain consistent with the current Production environment.

## 5. Security

The proposed DPA requires appropriate technical and organisational measures proportionate to the service and documented risks. Current implementation-grounded measures include, where configured and evidenced:

- Supabase Auth and server-side user validation;
- organisation/workspace membership, RBAC and tenant-scoped records;
- Supabase RLS posture and server-side tenant authorization;
- step-up controls for sensitive privacy operations;
- no-store privacy responses and protected export behavior;
- audit events and logging-minimisation controls;
- managed-provider transport/storage protections to the extent supported by provider/account evidence;
- protected release, secret, dependency, static-analysis and security gates.

The contract-grade TOM schedule must remain evidence-bound to the deployed environment. No certification, independent pentest result, fixed RPO/RTO or precise encryption specification is incorporated unless current evidence and the signed agreement support it.

## 6. Subprocessors

The DPA requires prior written authorisation for subprocessors, an up-to-date provider register, applicable data-protection obligations to flow down to subprocessors, and processor responsibility as required by law.

**[OWNER POSITION SELECTED · COUNSEL/PROVIDER REVIEW PENDING]** The proposed model uses **general written authorisation** for subprocessors. RISCK COMPLY should provide **30 days' advance notice** of a new material subprocessor where practicable and contractually applicable. A customer may object on reasonable data-protection grounds. RISCK COMPLY should attempt a commercially reasonable solution; if no reasonable solution is available, the final DPA/order should permit termination of the affected service or processing scope according to its agreed mechanics.

Appearance of a provider in source code, the Trust Center or a draft register is not by itself contractual approval. Provider/account facts and the final legally effective authorisation wording remain separate gates.

## 7. International transfers

The current Production Supabase project is configured in `eu-west-1` (Ireland). Other configured providers may process data in additional countries or through global infrastructure, and the complete location/mechanism set remains provider- and account-specific.

Where Chapter V requires a transfer mechanism, the final agreement must identify the applicable adequacy decision, transfer SCCs or other lawful mechanism and any required supplementary measures or transfer assessment. Commission controller-processor clauses under Decision (EU) 2021/915 address Article 28 contracting and do not by themselves satisfy Chapter V transfer requirements.

The owner Legal Package V1 does not close account-specific international-transfer acceptance.

## 8. Data-subject requests

Taking into account the nature of processing, the proposed processor obligation is to assist the customer through appropriate technical and organisational measures where possible.

RISCK COMPLY has a canonical tenant-scoped rights-request lifecycle covering request type, received/due dates, verification state, controller/processor routing, extensions, attributable decisions, completion and evidence references. Protected exact-SHA runtime evidence has validated the technical register/deadline workflow.

That technical workflow does not decide whether a restriction, objection, erasure exception or other legal limitation applies. Customer-controller routing and case-specific legal judgment remain attributable decisions.

## 9. Security, DPIAs and prior consultation

Taking account of the nature of processing and information available to the processor, the proposed DPA requires reasonably available assistance with GDPR Articles 32–36. This includes security evidence, incident information and information reasonably needed for a customer DPIA or prior-consultation process.

Customer-specific legal conclusions, regulator engagement and any EU AI Act FRIA conclusion remain the customer's responsibility unless separately agreed.

## 10. Personal-data breaches

**[OWNER POSITION SELECTED · COUNSEL REVIEW PENDING]** The standard DPA commitment is notification to the customer **without undue delay** after the processor becomes aware of a personal-data breach affecting customer personal data, together with reasonably available information needed for the customer's response.

No default 24-hour or 48-hour contractual promise is selected until operational evidence supports a stricter commitment. Any stricter Enterprise target must be evidence-backed and expressly contracted.

## 11. Deletion and return

At the end of services or on a valid customer instruction, the proposed DPA requires customer personal data to be returned or deleted as applicable, subject to documented legal-retention requirements and verified provider backup/lifecycle constraints.

The owner-selected post-termination customer export-window position is **30 days**, but that position remains subject to actual product capability, provider lifecycle constraints, privacy/retention duties, legal holds and final qualified wording before it becomes binding.

The product uses a category-specific retention model rather than one universal retention period. The canonical technical retention-policy schema has exact-SHA runtime evidence, but the final legally appropriate period for every category and complete downstream provider deletion remain separate factual/legal gates. Any retained record must remain purpose-limited, access-restricted and deleted when the applicable basis expires.

## 12. Audit and information rights

The proposed DPA makes information reasonably necessary to demonstrate compliance available through attributable evidence packs, security materials, questionnaires and related records and preserves audit/inspection rights required by applicable law.

**[OWNER POSITION SELECTED · COUNSEL REVIEW PENDING]** Remote evidence, security materials and questionnaires should be the normal first-line audit mechanism. Routine customer audits should normally be limited to **once per 12 months**, with reasonable advance notice and confidentiality/security protections, unless a personal-data breach, regulator instruction, material control failure or other justified cause requires additional access.

Audit mechanics must protect other customers' data, security-sensitive information, trade secrets and privileged material while preserving mandatory GDPR Article 28 audit/information rights. Final cost, on-site access and procedural mechanics remain subject to the signed agreement and qualified review.

## 13. Annex 1 — Processing details

- **Subject matter:** operation, security, support and maintenance of the contracted RISCK COMPLY compliance service.
- **Duration:** subscription plus the applicable return/deletion lifecycle. The owner-selected 30-day post-termination export position remains subject to the signed agreement and verified provider capabilities.
- **Nature:** collection, storage, organisation, retrieval, use, authorised disclosure to service providers, export and deletion-support operations required to deliver the service.
- **Purposes:** provide, secure, support and maintain customer compliance workflows and customer-requested service functionality.
- **Baseline data subjects:** authorised users; customer employees and contractors; vendor or business contacts; and other individuals represented in customer-provided records. Customer instructions or an order form may narrow or extend these categories within the permitted service scope.
- **Baseline personal-data categories:** account/workspace identifiers; organisation and membership records; customer-entered AI-system, vendor, risk, document, task, assessment and evidence records where they contain personal data; support material; and operational metadata required for customer-directed service delivery.
- **Special-category/criminal-offence data:** not accepted as an ordinary default use case; intentional processing requires an expressly approved scope, lawful basis/condition as applicable and additional safeguards.
- **Customer instructions:** binding agreement, order form, authorised product configuration and authorised support requests.

## 14. Annex 2 — TOMs

The contract-grade TOM annex must map each contractual security commitment to attributable evidence, environment and validation date. `docs/legal-assurance/TOMS_MATRIX.md`, `docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md` and current runtime artifacts are evidence sources; they are not automatically contractual promises merely by existing in the repository.

## 15. Annex 3 — Subprocessors

The final annex must identify the active Production subprocessors applicable to the covered processing, including legal entity, service/purpose, relevant data, processing locations, applicable transfer position and the agreed authorisation/notice state.

The drafting position for the authorisation model and 30-day material-subprocessor notice target is owner-selected; the provider-specific list and contract facts remain evidence gates.

## Review conditions

Before this DPA can be treated as final/signable, the following remain genuine acceptance gates:

1. authoritative registered details, tax/identity facts where relevant and signatory authority for the owner-designated RISCK COMPLY contracting/processor-side entity, **SAMUEL CERQUEIRA, UNIPESSOAL LDA**;
2. qualified review of the concrete controller/processor role allocation where material;
3. qualified review and final contractual drafting of the owner-selected general-authorisation, 30-day notice, objection/remedy and audit mechanics;
4. account-specific provider and international-transfer evidence;
5. contract-grade TOM annex reconciled to current Production evidence;
6. provider-backed deletion/backup lifecycle facts and validation of the selected 30-day export position;
7. final liability allocation and any stricter Enterprise breach-notification commitments;
8. incorporation into a binding customer agreement.

Internal implementation, CI, documentation and exact-SHA evidence may close technical/factual gates but do not substitute for qualified external legal acceptance where the decision requires it.

```text
DPA_STATUS=REVIEW_DRAFT
DPA_EFFECTIVE=NO
OWNER_LEGAL_PACKAGE_V1=APPROVED
DPA_OWNER_POLICY_DECISIONS=SELECTED
SUBPROCESSOR_AUTHORISATION_MODEL=GENERAL_WRITTEN_AUTHORISATION
NEW_MATERIAL_SUBPROCESSOR_NOTICE_TARGET=30_DAYS
DPA_AUDIT_FIRST_LINE=REMOTE_EVIDENCE_AND_QUESTIONNAIRE
ROUTINE_AUDIT_FREQUENCY_TARGET=ONCE_PER_12_MONTHS
STANDARD_CUSTOMER_BREACH_NOTICE=WITHOUT_UNDUE_DELAY
DEFAULT_24H_OR_48H_PROMISE=NO
AUTHORITATIVE_REGISTRY_EVIDENCE=OPEN
INTERNATIONAL_TRANSFER_FINAL_ACCEPTANCE=OPEN
FINAL_LEGAL_PUBLICATION=BLOCKED
```
