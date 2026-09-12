# RISCK COMPLY — Owner Legal Decisions V1

Date: 2026-09-12
Authority: owner-approved commercial/legal risk positions for drafting and counsel review
Owner approval phrase: `APROVO O PACOTE LEGAL V1`

## Status and boundary

This document records attributable owner decisions for RISCK COMPLY contract drafting and legal-review preparation. It closes the corresponding **owner-decision** gates only.

It does **not**:

- constitute qualified legal advice or a signed legal opinion;
- make any draft Terms, Privacy Policy or DPA legally effective by itself;
- establish authoritative registered office, NIF/NIPC, VAT regime/registrations or signatory authority;
- modify the owner-deferred SaaS CAE/activity association;
- replace mandatory law, regulator requirements, customer-specific negotiated terms or qualified review where required;
- authorise Production deployment while the active Beagle assessment remains bound to the current Production release.

## 1. Renewal and material price changes

**Owner decision:** supported recurring subscriptions are intended to renew automatically for the same billing period until cancelled, subject to the applicable order/checkout and mandatory law.

Material price changes intended to affect a future renewal should be notified at least **30 days before the affected renewal**, unless a signed Enterprise order or mandatory law requires a different rule.

```text
RENEWAL_OWNER_POSITION=AUTO_RENEW_UNTIL_CANCELLED
MATERIAL_PRICE_CHANGE_NOTICE_TARGET=30_DAYS_BEFORE_AFFECTED_RENEWAL
RENEWAL_COUNSEL_REVIEW=PENDING
```

## 2. Payment failure, suspension and restoration

**Owner decision:** ordinary failed/unpaid billing should receive a **7-day cure opportunity after notice** before ordinary non-payment suspension.

Immediate or faster suspension may be used where reasonably necessary for fraud, credential/security abuse, unlawful activity, material threat to service/tenant security, or where law or a provider constraint requires it.

Access should be restored after the relevant cure or risk condition is resolved, subject to operational validation and any lawful continuing restriction.

```text
PAYMENT_FAILURE_CURE_TARGET=7_DAYS_AFTER_NOTICE
SECURITY_OR_ILLEGAL_USE_EMERGENCY_SUSPENSION=ALLOWED_IF_REASONABLY_NECESSARY
RESTORATION_AFTER_CURE=OWNER_SELECTED_SUBJECT_TO_OPERATIONAL_AND_LEGAL_BOUNDARIES
SUSPENSION_COUNSEL_REVIEW=PENDING
```

## 3. Material breach cure and immediate termination grounds

**Owner decision:** a material contractual breach should normally receive a **30-day cure period after notice** where the breach is capable of cure.

Immediate termination may be reserved for severe security abuse, unlawful activity, fraud, deliberate cross-tenant compromise, material misuse that cannot reasonably be cured, or where continued service would violate law or binding provider/regulatory requirements.

```text
MATERIAL_BREACH_CURE_TARGET=30_DAYS_IF_CURABLE
IMMEDIATE_TERMINATION_FOR_SEVERE_SECURITY_ILLEGALITY_OR_NONCURABLE_MISUSE=OWNER_SELECTED
TERMINATION_COUNSEL_REVIEW=PENDING
```

## 4. Service warranties and SLA

**Owner decision:** there is **no default uptime SLA** and no blanket service-credit commitment in standard self-service Terms unless expressly contracted.

The standard contract may commit only to providing the service materially in accordance with the applicable documentation and mandatory legal obligations, without guaranteeing uninterrupted/error-free operation or customer-specific compliance outcomes.

Additional uptime, support, remedy or service-credit commitments may be agreed in an Enterprise Order Form/SLA where technically supportable and expressly accepted.

```text
DEFAULT_UPTIME_SLA=NONE
DEFAULT_SERVICE_CREDITS=NONE
STANDARD_COMPLIANCE_GUARANTEE=NONE
ENTERPRISE_SLA=ORDER_FORM_SPECIFIC_AND_EVIDENCE_BOUND
WARRANTY_COUNSEL_REVIEW=PENDING
```

## 5. Indemnities

**Owner decision:** no broad, open-ended indemnity is intended for standard self-service Terms.

Customers remain responsible for unlawful use, unlawful customer content/instructions and violations caused by their use of the service. Provider IP or other indemnity commitments, defence-control mechanics and remedies may be negotiated for Enterprise agreements and require qualified review before becoming binding.

```text
STANDARD_SELF_SERVICE_BROAD_INDEMNITY=NO
CUSTOMER_RESPONSIBILITY_FOR_UNLAWFUL_USE_AND_CONTENT=YES
ENTERPRISE_INDEMNITY=NEGOTIABLE_ORDER_FORM_COUNSEL_REVIEW
INDEMNITY_COUNSEL_REVIEW=PENDING
```

## 6. Liability allocation

**Owner decision:** proposed standard aggregate liability cap is the **fees paid or payable for the affected service during the 12 months preceding the event giving rise to liability**, subject to mandatory law and final qualified drafting.

Indirect/consequential loss, lost profits, lost revenue and similar remote loss categories should be excluded to the extent lawfully permitted.

Fraud, wilful misconduct and liability that applicable law does not permit the parties to limit or exclude are outside any contractual limitation. Treatment of confidentiality, data protection and intellectual-property claims remains subject to qualified review and negotiated Enterprise terms.

```text
PROPOSED_STANDARD_LIABILITY_CAP=12_MONTH_FEES_FOR_AFFECTED_SERVICE
INDIRECT_CONSEQUENTIAL_LOSS_EXCLUSION=OWNER_SELECTED_TO_MAXIMUM_LAWFUL_EXTENT
FRAUD_WILFUL_MISCONDUCT_AND_NONLIMITABLE_LIABILITY=OUTSIDE_LIMITATION
DATA_PROTECTION_CONFIDENTIALITY_IP_CARVEOUT_TREATMENT=PENDING_COUNSEL
LIABILITY_COUNSEL_REVIEW=PENDING
```

## 7. Governing law and forum

**Owner decision:** proposed governing law is **Portuguese law** and the proposed standard forum is the **courts of Lisbon, Portugal**, without default arbitration.

This remains subject to mandatory jurisdiction rules, enforceability review and customer-specific negotiated Enterprise terms.

```text
GOVERNING_LAW_OWNER_POSITION=PORTUGAL
STANDARD_FORUM_OWNER_POSITION=LISBON_PORTUGAL_COURTS
DEFAULT_ARBITRATION=NO
FORUM_COUNSEL_REVIEW=PENDING
```

## 8. Contractual notices

**Owner decision:** `comercial@risckcomply.com` is the intended electronic contractual notice intake channel where electronic notice is legally/contractually sufficient.

Any notice requiring additional formal proof, registered delivery or physical service should also use the authoritative registered office once that fact is verified. Deemed-receipt mechanics remain subject to final qualified drafting.

```text
CONTRACTUAL_EMAIL_NOTICE_CHANNEL=comercial@risckcomply.com
FORMAL_POSTAL_NOTICE_ADDRESS=BLOCKED_AUTHORITATIVE_REGISTERED_OFFICE
DEEMED_RECEIPT_RULES=PENDING_COUNSEL
```

## 9. Intellectual property, customer content, outputs and feedback

**Owner decision:** customers retain ownership/control of their Customer Content and may use customer-facing documents/outputs generated for their business, subject to third-party rights, applicable law and the final agreement.

RISCK COMPLY retains rights in the service, source/software, platform architecture, product design, reusable templates/frameworks, brand and know-how.

Non-confidential feedback may be used to improve the product. **Customer Content must not be used to train third-party or provider AI/ML models without a separate specific lawful basis/authorisation and an implemented, disclosed processing arrangement.**

```text
CUSTOMER_CONTENT_OWNERSHIP=CUSTOMER
CUSTOMER_USE_OF_GENERATED_BUSINESS_OUTPUTS=ALLOWED_SUBJECT_TO_FINAL_TERMS_AND_THIRD_PARTY_RIGHTS
RISCK_COMPLY_PLATFORM_SOFTWARE_TEMPLATE_BRAND_KNOWHOW=PROVIDER_RESERVED
NONCONFIDENTIAL_FEEDBACK_USE=ALLOWED_FOR_PRODUCT_IMPROVEMENT
CUSTOMER_CONTENT_MODEL_TRAINING_WITHOUT_SPECIFIC_AUTHORITY=NO
IP_COUNSEL_REVIEW=PENDING
```

## 10. Subprocessor authorisation, notice and objection

**Owner decision:** proposed DPA model uses **general written authorisation** for subprocessors with **30 days' advance notice** for a new material subprocessor where practicable and contractually applicable.

A customer may object on reasonable data-protection grounds. RISCK COMPLY should attempt a commercially reasonable solution; if no reasonable solution is available, the customer may terminate the affected service/processing scope according to the final DPA/order mechanics.

```text
SUBPROCESSOR_AUTHORISATION_MODEL=GENERAL_WRITTEN_AUTHORISATION
NEW_MATERIAL_SUBPROCESSOR_NOTICE_TARGET=30_DAYS
SUBPROCESSOR_OBJECTION=REASONABLE_DATA_PROTECTION_GROUNDS
UNRESOLVED_VALID_OBJECTION=TERMINATION_OF_AFFECTED_SCOPE_OPTION
SUBPROCESSOR_DPA_COUNSEL_REVIEW=PENDING
```

## 11. DPA audit mechanics

**Owner decision:** remote evidence, security materials and questionnaires should be the normal first-line audit mechanism.

Routine customer audits should normally be limited to **once per 12 months**, with reasonable advance notice and confidentiality/security protections, unless a personal-data breach, regulator instruction, material control failure or other justified cause requires additional access.

Audit mechanics must protect other customers' data, security-sensitive information, trade secrets and privileged material while preserving mandatory GDPR Article 28 audit/information rights.

```text
DPA_AUDIT_FIRST_LINE=REMOTE_EVIDENCE_AND_QUESTIONNAIRE
ROUTINE_AUDIT_FREQUENCY_TARGET=ONCE_PER_12_MONTHS
EXTRA_AUDIT_FOR_BREACH_REGULATOR_OR_JUSTIFIED_CAUSE=ALLOWED
MANDATORY_ARTICLE_28_RIGHTS=PRESERVED
AUDIT_COUNSEL_REVIEW=PENDING
```

## 12. Personal-data breach notification commitment

**Owner decision:** the standard DPA commitment remains GDPR-aligned **"without undue delay" after becoming aware of a personal-data breach affecting customer personal data**.

No 24-hour/48-hour contractual promise is selected for the standard package until operational evidence supports such a stricter commitment. Any stricter Enterprise target must be evidence-backed and expressly contracted.

```text
STANDARD_CUSTOMER_BREACH_NOTICE=WITHOUT_UNDUE_DELAY
DEFAULT_24H_OR_48H_PROMISE=NO
STRICTER_ENTERPRISE_BREACH_TARGET=ORDER_FORM_SPECIFIC_AND_EVIDENCE_BOUND
BREACH_NOTICE_COUNSEL_REVIEW=PENDING
```

## Existing owner positions preserved

The following previously attributable owner positions remain unchanged:

```text
RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_CONTRACTING_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_SELLER_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
DEFAULT_GENERAL_REFUND=NO_SUBJECT_TO_MANDATORY_LAW_AND_EXPRESS_EXCEPTIONS
SELF_SERVICE_CANCELLATION=END_OF_ALREADY_PAID_PERIOD
POST_TERMINATION_EXPORT_WINDOW_OWNER_POSITION=30_DAYS
DEFAULT_UPTIME_SLA=NONE_UNLESS_EXPRESSLY_CONTRACTED
SOFTWARE_SAAS_CAE_ACTION=DEFERRED_BY_OWNER_UNTIL_FINAL_ADMINISTRATIVE_PHASE
```

## Remaining gates after owner approval

Owner approval closes the previously open owner-policy selections for renewal, payment-failure cure, breach cure/termination, warranties, indemnity posture, liability cap proposal, forum, notices, IP/feedback, subprocessor mechanics, DPA audit mechanics and breach-notification commitment.

The following remain separate and must not be silently promoted to PASS:

- authoritative commercial-registry facts: registered office, registered identifiers and signatory authority;
- authoritative VAT regime/registrations and Stripe/invoice reconciliation;
- provider/account-specific international-transfer evidence and any required Chapter V assessment;
- provider-backed deletion/backup lifecycle evidence and validation of the 30-day export position;
- exact Production/runtime evidence where a legal statement depends on runtime configuration;
- qualified legal review where required for enforceability, mandatory-law carve-outs or final publication;
- final deliberate publication/incorporation of effective Terms/Privacy/DPA;
- owner-deferred SaaS CAE/activity administrative reconciliation.

```text
OWNER_LEGAL_PACKAGE_V1=APPROVED
OWNER_LEGAL_DECISIONS_12_OF_12=CLOSED_OWNER_ATTRIBUTABLE
OWNER_DECISION_GAPS_FOR_TERMS_DPA=0
QUALIFIED_LEGAL_OPINION=NOT_CREATED
FINAL_LEGAL_PUBLICATION=BLOCKED
AUTHORITATIVE_REGISTRY_EVIDENCE=OPEN
VAT_REGIME=OPEN
VAT_REGISTRATIONS=OPEN
INTERNATIONAL_TRANSFER_FINAL_ACCEPTANCE=OPEN
CAE_CHANGE_AUTHORIZED_NOW=false
```
