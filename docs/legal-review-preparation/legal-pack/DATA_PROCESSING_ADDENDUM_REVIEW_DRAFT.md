# Data Processing Addendum — Review Draft

**Status:** `REVIEW_DRAFT` · `FOUNDER_FACT_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

This DPA is prepared for Article 28 GDPR review. It does not apply until incorporated into a signed agreement by the completed legal entities.

## 1. Parties and scope

Customer is controller or processor, as applicable, for customer personal data. **[FOUNDER FACT REQUIRED: provider legal entity]** acts as processor or subprocessor when processing customer personal data to provide the service.

This DPA applies only to customer personal data processed on documented instructions through the contracted service.

## 2. Definitions and precedence

GDPR terms have their statutory meaning. In a conflict concerning personal data, this DPA prevails over the general terms, while an approved order form may specify customer details without weakening mandatory protections.

## 3. Processing instructions

The processor will process customer personal data only on documented instructions, including transfers, unless required by law. It will notify the customer where an instruction appears to infringe applicable data-protection law, without providing customer-specific legal advice.

## 4. Confidentiality

Persons authorised to process customer personal data must be bound by confidentiality and receive access limited to their duties.

## 5. Security

The processor will maintain appropriate technical and organisational measures proportionate to the service and documented risks. Current implementation-grounded measures include, where configured:

- Supabase Auth and server-side user validation;
- organisation membership, RBAC and tenant-scoped records;
- Supabase RLS posture and server-side tenant checks;
- step-up controls for sensitive privacy operations;
- no-store privacy responses and protected exports;
- audit events, sanitised logs and incident runbooks;
- managed provider encryption and infrastructure controls;
- release, secret, dependency and security scanning gates.

The final TOM schedule must state actual production configuration, regions, backup/restore posture, retention, encryption details and evidence date. No certification or audit is incorporated unless listed.

## 6. Subprocessors

The customer grants **[COUNSEL DECISION REQUIRED: general or specific]** authorisation for subprocessors listed in the current register. The processor will impose materially equivalent data-protection obligations and remain responsible as required by law.

Notice period, objection process and customer remedies are **[FOUNDER FACT AND COUNSEL DECISION REQUIRED]**.

## 7. International transfers

Transfer locations and mechanisms are **[FOUNDER FACT REQUIRED]**. Where required, the parties will use the applicable standard contractual clauses, UK addendum or other lawful mechanism, with supplementary measures and transfer assessments as appropriate.

## 8. Data-subject requests

Taking into account the nature of processing, the processor will assist the customer with appropriate technical and organisational measures. The product includes controlled export and deletion-request intake, subject to authentication, organisation scope, permissions, step-up and retention review.

The processor will not respond substantively to a request relating to customer-controlled data except on customer instruction or where legally required.

## 9. DPIAs and prior consultation

The processor will provide reasonably available information to support DPIAs and prior consultation, considering the nature of processing. Customer-specific legal conclusions, FRIA conclusions and regulator engagement remain the customer’s responsibility unless separately agreed.

## 10. Personal-data breaches

The processor will notify the customer without undue delay after becoming aware of a personal-data breach affecting customer personal data and provide available information on nature, likely consequences and measures. Contractual targets, channels and update frequency are **[FOUNDER FACT AND COUNSEL DECISION REQUIRED]** and must reflect operational capability.

## 11. Deletion and return

At termination or customer instruction, the processor will return or delete customer personal data, subject to documented export windows, legal retention, billing/tax records, legal holds, provider backup cycles and audit-chain integrity. Preserved records must be minimised, restricted and deleted when the basis expires.

## 12. Audit and information rights

The processor will make information reasonably necessary to demonstrate compliance available through the Trust Center, security pack, questionnaires and evidence artifacts. On-site audits, frequency, confidentiality, cost and use of independent reports require counsel-approved limits. Audit rights must not compromise other customers, security or privileged information.

## 13. Liability

Liability under this DPA follows **[COUNSEL DECISION REQUIRED: agreement cap, mandatory-law carve-outs and allocation between controller and processor]**.

## Annex 1 — Processing details

- Subject matter: operation of the contracted Risck Comply service.
- Duration: subscription plus documented return/deletion period.
- Nature: collection, storage, organisation, retrieval, use, disclosure to authorised subprocessors, export and deletion support.
- Purposes: provide, secure, support and maintain customer compliance workflows.
- Data subjects: **[FOUNDER FACT/CUSTOMER SPECIFIC: users, employees, contractors, vendor contacts and other persons represented in customer content]**.
- Personal-data categories: **[FOUNDER FACT/CUSTOMER SPECIFIC]**.
- Special-category/criminal data: prohibited unless expressly approved with additional safeguards.
- Customer instructions: agreement, order form, product configuration and authorised support requests.

## Annex 2 — TOMs

The final TOM annex must map each commitment to evidence, owner, environment, last validation date and limitation. `docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md` and current runtime artifacts are evidence sources, not contractual promises by themselves.

## Annex 3 — Subprocessors

Incorporate the completed production subprocessor register, including legal entity, service, purpose, data, region, transfer mechanism and notice status.

## Review conditions

Counsel must approve role allocation, authorisation model, transfers, assistance, breach notification, deletion, audits, liability and SCC/UK terms. Founder facts and active provider contracts must be completed before signature.
