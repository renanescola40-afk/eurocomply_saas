# Data Processing Addendum — Review Draft

**Status:** `REVIEW_DRAFT` · `FOUNDER_FACT_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

This DPA is prepared for GDPR Article 28 review. It is not an executed agreement and does not become binding until the final contracting parties are identified, the processing annexes are completed, qualified legal review is accepted where required, and the DPA is incorporated into a binding customer agreement.

## 1. Parties and scope

The final RISCK COMPLY contracting/operator legal entity and its registered identifiers remain pending authoritative founder/entity confirmation. This review draft therefore does not represent a final processor-party identification.

For customer personal data processed through the contracted service on documented customer instructions, the customer may act as controller or processor depending on its own processing role, and RISCK COMPLY is intended to act as processor or subprocessor for that instructed processing. Provider-controlled website, account, commercial, billing, support, security and similar processing is assessed separately under the Privacy notice and role matrix.

## 2. Definitions and precedence

GDPR terms have their statutory meaning. For personal-data processing covered by this DPA, the proposed contractual model is that this DPA prevails over inconsistent general terms, while an order form may specify customer-specific processing details without weakening mandatory data-protection protections.

Liability caps, mandatory-law carve-outs and allocation between controller and processor remain subject to final contractual and qualified legal review.

## 3. Processing instructions

The proposed processor obligation is to process customer personal data only on documented instructions from the customer, including in relation to transfers, unless Union or Member-State law requires otherwise. Where legally permitted, the processor will inform the customer of that legal requirement before processing.

If an instruction appears to infringe applicable Union or Member-State data-protection law, the processor-side process must allow that concern to be raised promptly. Product output is not treated as an automatic customer-specific legal determination.

## 4. Confidentiality

Persons authorised to process customer personal data must be subject to confidentiality obligations and access limited to their duties. Operational evidence for access control, role scoping and security controls must remain consistent with the current production environment.

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

The final choice between general and specific authorisation, advance-notice period, objection mechanics and customer remedies remains a contractual/legal decision. Appearance of a provider in source code, the Trust Center or a draft register is not by itself contractual approval.

## 7. International transfers

The current Production Supabase project is configured in `eu-west-1` (Ireland). Other configured providers may process data in additional countries or through global infrastructure, and the complete location/mechanism set remains provider- and account-specific.

Where Chapter V requires a transfer mechanism, the final agreement must identify the applicable adequacy decision, transfer SCCs or other lawful mechanism and any required supplementary measures or transfer assessment. Commission controller-processor clauses under Decision (EU) 2021/915 address Article 28 contracting and do not by themselves satisfy Chapter V transfer requirements.

## 8. Data-subject requests

Taking into account the nature of processing, the proposed processor obligation is to assist the customer through appropriate technical and organisational measures where possible.

RISCK COMPLY now has a canonical tenant-scoped rights-request lifecycle covering request type, received/due dates, verification state, controller/processor routing, extensions, attributable decisions, completion and evidence references. Protected exact-SHA runtime evidence has validated the technical register/deadline workflow.

That technical workflow does not decide whether a restriction, objection, erasure exception or other legal limitation applies. Customer-controller routing and case-specific legal judgment remain attributable decisions.

## 9. Security, DPIAs and prior consultation

Taking account of the nature of processing and information available to the processor, the proposed DPA requires reasonably available assistance with GDPR Articles 32–36. This includes security evidence, incident information and information reasonably needed for a customer DPIA or prior-consultation process.

Customer-specific legal conclusions, regulator engagement and any EU AI Act FRIA conclusion remain the customer's responsibility unless separately agreed.

## 10. Personal-data breaches

The proposed DPA requires notification to the customer without undue delay after the processor becomes aware of a personal-data breach affecting customer personal data, together with reasonably available information needed for the customer's response.

Any stricter contractual target, communication channel or update cadence must match demonstrated operational capability before it becomes binding.

## 11. Deletion and return

At the end of services or on a valid customer instruction, the proposed DPA requires customer personal data to be returned or deleted as applicable, subject to documented legal-retention requirements and verified provider backup/lifecycle constraints.

The product uses a category-specific retention model rather than one universal retention period. The canonical technical retention-policy schema has exact-SHA runtime evidence, but the final legally appropriate period for every category and complete downstream provider deletion remain separate factual/legal gates. Any retained record must remain purpose-limited, access-restricted and deleted when the applicable basis expires.

## 12. Audit and information rights

The proposed DPA makes information reasonably necessary to demonstrate compliance available through attributable evidence packs, security materials, questionnaires and related records and preserves audit/inspection rights required by applicable law.

Practical rules for audit frequency, advance notice, confidentiality, cost, on-site access and protection of other customers, security-sensitive material or privileged information remain subject to the final agreement and qualified review. Contractual limits must not eliminate mandatory Article 28 rights.

## 13. Annex 1 — Processing details

- **Subject matter:** operation, security, support and maintenance of the contracted RISCK COMPLY compliance service.
- **Duration:** subscription plus the applicable return/deletion lifecycle. The final post-termination export/deletion window remains subject to the signed agreement and verified provider capabilities.
- **Nature:** collection, storage, organisation, retrieval, use, authorised disclosure to service providers, export and deletion-support operations required to deliver the service.
- **Purposes:** provide, secure, support and maintain customer compliance workflows and customer-requested service functionality.
- **Baseline data subjects:** authorised users; customer employees and contractors; vendor or business contacts; and other individuals represented in customer-provided records. Customer instructions or an order form may narrow or extend these categories within the permitted service scope.
- **Baseline personal-data categories:** account/workspace identifiers; organisation and membership records; customer-entered AI-system, vendor, risk, document, task, assessment and evidence records where they contain personal data; support material; and operational metadata required for customer-directed service delivery.
- **Special-category/criminal-offence data:** not accepted as an ordinary default use case; intentional processing requires an expressly approved scope, lawful basis/condition as applicable and additional safeguards.
- **Customer instructions:** binding agreement, order form, authorised product configuration and authorised support requests.

## 14. Annex 2 — TOMs

The contract-grade TOM annex must map each contractual security commitment to attributable evidence, environment and validation date. `docs/legal-assurance/TOMS_MATRIX.md`, `docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md` and current runtime artifacts are evidence sources; they are not automatically contractual promises merely by existing in the repository.

## 15. Annex 3 — Subprocessors

The final annex must identify the active production subprocessors applicable to the covered processing, including legal entity, service/purpose, relevant data, processing locations, applicable transfer position and the agreed authorisation/notice state.

## Review conditions

Before this DPA can be treated as final/signable, the following remain genuine acceptance gates:

1. final contracting/processor-party identity and registered details;
2. qualified review of the concrete controller/processor role allocation where material;
3. final subprocessor authorisation, notice, objection and remedy model;
4. account-specific provider and international-transfer evidence;
5. contract-grade TOM annex reconciled to current Production evidence;
6. final deletion/return window and remaining retention/provider lifecycle facts;
7. final audit mechanics, breach-notification commitments and liability allocation;
8. incorporation into a binding customer agreement.

Internal implementation, CI, documentation and exact-SHA evidence may close technical/factual gates but do not substitute for qualified external legal acceptance where the decision requires it.
